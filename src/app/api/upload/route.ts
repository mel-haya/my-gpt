import { PDFParse } from "pdf-parse";
import { db } from "@/lib/db-config";
import { documents } from "@/lib/db-schema";
import { generateEmbeddings } from "@/lib/embedding";
import { chunkContent } from "@/lib/chunking";
import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { del } from '@vercel/blob';

// export async function POST(req: NextRequest) {
//   try {
//     // const file = formData.get("file") as File;
//     const formData = await req.formData();
//     const file = formData.get("file") as File;
//     const bytes = await file.arrayBuffer();
//     const buffer = Buffer.from(bytes);

//     const data = new PDFParse({ data: buffer });
//     const text = (await data.getText()).text;
//     console.log("Extracted text length:", text.length);
//     if (text.trim().length === 0) {
//       return new Response(
//         JSON.stringify({
//           success: false,
//           error: "No extractable text found in PDF",
//         }),
//         {
//           status: 200,
//           headers: { "Content-Type": "application/json" },
//         }
//       );
//     }
//     const chunks = await chunkContent(text);
//     const embeddings = await generateEmbeddings(chunks);

//     const records = chunks.map((chunk, index) => ({
//       content: chunk,
//       embedding: embeddings[index],
//     }));
//     await db.insert(documents).values(records);

//     return new Response(
//       JSON.stringify({
//         success: true,
//         message: `Processed ${records.length} chunks from PDF.`,
//       }),
//       {
//         status: 200,
//         headers: { "Content-Type": "application/json" },
//       }
//     );
//   } catch (error) {
//     console.log("Error processing PDF:", error);
//     return new Response(
//       JSON.stringify({ success: false, error: "Failed to process PDF" }),
//       {
//         status: 500,
//         headers: { "Content-Type": "application/json" },
//       }
//     );
//   }
// }

export async function parsePDF(url: string) {
  try {
    const data = new PDFParse({ url });
    const text = (await data.getText()).text;
    console.log("Extracted text length:", text.length);
    if (text.trim().length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No extractable text found in PDF",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    const chunks = await chunkContent(text);
    const embeddings = await generateEmbeddings(chunks);

    const records = chunks.map((chunk, index) => ({
      content: chunk,
      embedding: embeddings[index],
    }));
    await db.insert(documents).values(records);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${records.length} chunks from PDF.`,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.log("Error processing PDF:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Failed to process PDF" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;
 
  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (
        pathname,
        /* clientPayload */
      ) => {
        // Generate a client token for the browser to upload the file
        // Make sure to authenticate and authorize users before generating the token.
        // Otherwise, you're allowing anonymous uploads.
 
        return {
          allowedContentTypes: ["application/pdf"],
          addRandomSuffix: true,
          // callbackUrl: 'https://example.com/api/avatar/upload',
          // optional, `callbackUrl` is automatically computed when hosted on Vercel
          tokenPayload: JSON.stringify({
            // optional, sent to your server on upload completion
            // you could pass a user id from auth, or a value from clientPayload
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // Called by Vercel API on client upload completion
        // Use tools like ngrok if you want this to work locally
 
        console.log('blob upload completed', blob, tokenPayload);
 
        try {
          // Run any logic after the file upload completed
              await parsePDF(blob.downloadUrl);
              await del(blob.url); // delete the blob after processing
        } catch (error) {
          throw new Error('Could not update user');
        }
      },
    });
 
    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }, // The webhook will retry 5 times waiting for a 200
    );
  }
}

