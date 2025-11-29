import { CanvasFactory } from "pdf-parse/worker";
import { PDFParse } from "pdf-parse";
import { db } from "@/lib/db-config";
import { documents, uploadedFiles } from "@/lib/db-schema";
import { generateEmbeddings } from "@/lib/embedding";
import { chunkContent } from "@/lib/chunking";
import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { del } from "@vercel/blob";
import mammoth from "mammoth";

async function embedAndSave(text: string) {
  const chunks = await chunkContent(text);
  const embeddings = await generateEmbeddings(chunks);

  const records = chunks.map((chunk, index) => ({
    content: chunk,
    embedding: embeddings[index],
  }));
  await db.insert(documents).values(records);

  return {
    success: true,
    message: `Processed ${records.length} chunks.`,
  };
}

export async function parsePDF(url: string) {
  try {
    const data = new PDFParse({ url, CanvasFactory });
    const text = (await data.getText()).text;
    console.log("Extracted text length:", text.length);
    if (text.trim().length === 0) {
      return {
        success: false,
        error: "No extractable text found in PDF",
      };
    }
    return await embedAndSave(text);
  } catch (error) {
    console.log("Error processing PDF:", error);
    return {
      success: false,
      error: "Failed to process PDF",
    };
  }
}

export async function parseDOCX(url: string) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return {
        success: false,
        error: `Failed to fetch DOCX file: ${response.statusText}`,
      };
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);  
    const text = (await mammoth.extractRawText({ buffer: buffer })).value;
    console.log("Extracted text length:", text.length);
    if (text.trim().length === 0) {
      return {
        success: false,
        error: "No extractable text found in DOCX",
      };
    }
    return await embedAndSave(text);
    
  } catch (error) {
    console.log("Error processing DOCX:", error);
    return {
      success: false,
      error: "Failed to process DOCX",
    };
  }
}


export async function POST(request: Request): Promise<NextResponse> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "Missing BLOB_READ_WRITE_TOKEN environment variable." },
      { status: 500 }
    );
  }
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        return {
          allowedContentTypes: ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
          addRandomSuffix: true,
          tokenPayload: clientPayload,
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log("blob upload completed", blob, tokenPayload);

        if (!tokenPayload) {
          console.error(
            "No tokenPayload (hash) received on upload completion."
          );
          await del(blob.url); // Clean up the uploaded file.
          return;
        }

        try {
          // Attempt to insert the file hash immediately to "lock" it.
          await db.insert(uploadedFiles).values({
            fileName: blob.pathname,
            fileHash: tokenPayload,
          });

          // Determine file type based on file extension
          const fileExtension = blob.pathname.toLowerCase().split('.').pop();
          let result;
          console.log("Processing file with extension:", fileExtension);
          switch (fileExtension) {
            case 'pdf':
              result = await parsePDF(blob.downloadUrl);
              console.log("PDF processing result:", result);
              break;
            case 'docx':
              result = await parseDOCX(blob.downloadUrl);
              console.log("DOCX processing result:", result);
              break;
            default:
              console.error("Unsupported file type:", fileExtension);
              result = {
                success: false,
                error: `Unsupported file type: ${fileExtension}`,
              };
              break;
          }
        } catch (error) {
          // If the insert fails, it's likely due to the unique constraint,
          // meaning the file is already being processed or has been processed.
          console.log(
            "File hash already exists or another error occurred, skipping processing:",
            (error as Error).message
          );
        } finally {
          // Always delete the temporary blob file.
          await del(blob.url);
        }
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
