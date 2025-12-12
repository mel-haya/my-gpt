import { CanvasFactory } from "pdf-parse/worker";
import { PDFParse } from "pdf-parse";
import { db } from "@/lib/db-config";
import { documents, uploadedFiles } from "@/lib/db-schema";
import { generateEmbeddings } from "@/lib/embedding";
import { chunkContent } from "@/lib/chunking";
import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { del } from "@vercel/blob";
import { eq } from "drizzle-orm";
import mammoth from "mammoth";

function extractOriginalFilename(pathname: string): string {
  // Use regex to match pattern: (filename)-(vercel-code).(extension)
  // and extract just (filename).(extension)
  const regex = /^(.+)-[a-zA-Z0-9]{30}(\.[^.]+)$/;
  const match = pathname.match(regex);
  
  if (match) {
    // Return filename + extension without the Vercel code
    return match[1] + match[2];
  }
  
  // Return original if pattern doesn't match
  return pathname;
}

async function embedAndSave(text: string, uploadedFileId: number) {
  const chunks = await chunkContent(text);
  const embeddings = await generateEmbeddings(chunks);

  const records = chunks.map((chunk, index) => ({
    content: chunk,
    embedding: embeddings[index],
    uploaded_file_id: uploadedFileId,
  }));
  await db.insert(documents).values(records);

  return {
    success: true,
    message: `Processed ${records.length} chunks.`,
  };
}

export async function parsePDF(url: string, uploadedFileId: number) {
  try {
    console.log("Fetching PDF from URL:", url);
    console.log("uploadedFileId:", uploadedFileId);
    const data = new PDFParse({ url, CanvasFactory });
    const text = (await data.getText()).text;
    if (text.trim().length === 0) {
      return {
        success: false,
        error: "No extractable text found in PDF",
      };
    }
    return await embedAndSave(text, uploadedFileId);
  } catch (error) {
    console.log("Error processing PDF:", error);
    return {
      success: false,
      error: "Failed to process PDF",
    };
  }
}

export async function parseDOCX(url: string, uploadedFileId: number) {
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

    if (text.trim().length === 0) {
      return {
        success: false,
        error: "No extractable text found in DOCX",
      };
    }
    return await embedAndSave(text, uploadedFileId);
    
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
          tokenPayload: clientPayload, // This should be the userId from frontend
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {


        if (!tokenPayload) {
          console.error(
            "No tokenPayload received on upload completion."
          );
          await del(blob.url); // Clean up the uploaded file.
          return;
        }

        // Parse tokenPayload to extract userId and fileHash
        const lastColonIndex = tokenPayload.lastIndexOf(':');
        if (lastColonIndex === -1) {
          console.error("Invalid tokenPayload format - expected 'userId:fileHash'");
          await del(blob.url);
          return;
        }
        
        const fileUserId = tokenPayload.substring(0, lastColonIndex);
        const fileHash = tokenPayload.substring(lastColonIndex + 1);

        try {
          const originalFileName = extractOriginalFilename(blob.pathname);
          
          const [insertedFile] = await db.insert(uploadedFiles).values({
            fileName: originalFileName,
            fileHash: fileHash,
            user_id: fileUserId,
            status: "processing",
          }).returning();
          
          // Determine file type based on file extension
          const fileExtension = blob.pathname.toLowerCase().split('.').pop();
          let result;

          switch (fileExtension) {
            case 'pdf':
              result = await parsePDF(blob.downloadUrl, insertedFile.id);
              console.log("PDF processing result:", result);
              break;
            case 'docx':
              result = await parseDOCX(blob.downloadUrl, insertedFile.id);
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

          if (result.success) {
            await db.update(uploadedFiles)
              .set({ status: "completed" })
              .where(eq(uploadedFiles.id, insertedFile.id));
          } else {
            await db.update(uploadedFiles)
              .set({ status: "failed" })
              .where(eq(uploadedFiles.id, insertedFile.id));
          }
        } catch (error) {

          console.log(
            "File hash already exists or another error occurred, skipping processing:",
            (error as Error)
          );
        } finally {

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
