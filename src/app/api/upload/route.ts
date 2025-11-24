import { CanvasFactory } from 'pdf-parse/worker';
import { PDFParse } from "pdf-parse";
import { db } from "@/lib/db-config";
import { documents } from "@/lib/db-schema";
import { generateEmbeddings } from "@/lib/embedding";
import { chunkContent } from "@/lib/chunking";
import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { del } from '@vercel/blob';

export async function parsePDF(url: string) {
  try {
    const data = new PDFParse({ url, CanvasFactory});
    const text = (await data.getText()).text;
    console.log("Extracted text length:", text.length);
    if (text.trim().length === 0) {
      return {
        success: false,
        error: "No extractable text found in PDF",
      };
    }
    const chunks = await chunkContent(text);
    const embeddings = await generateEmbeddings(chunks);

    const records = chunks.map((chunk, index) => ({
      content: chunk,
      embedding: embeddings[index],
    }));
    await db.insert(documents).values(records);

    return {
      success: true,
      message: `Processed ${records.length} chunks from PDF.`,
    };
  } catch (error) {
    console.log("Error processing PDF:", error);
    return {
      success: false,
      error: "Failed to process PDF"
    };
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: 'Missing BLOB_READ_WRITE_TOKEN environment variable.' },
      { status: 500 },
    );
  }
  const body = (await request.json()) as HandleUploadBody;
 
  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (
        /* pathname, clientPayload */
      ) => {
        return {
          allowedContentTypes: ["application/pdf"],
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({}),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log('blob upload completed', blob, tokenPayload);
 
        try {
          const result = await parsePDF(blob.downloadUrl);
          console.log('PDF processing result:', result);
          await del(blob.url);
        } catch (error) {
          console.error('Could not process PDF:', error);
        }
      },
    });
 
    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }
}

