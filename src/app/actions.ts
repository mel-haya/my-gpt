"use server";

import { PDFParse } from "pdf-parse";
import { db } from "@/lib/db-config";
import { documents } from "@/lib/db-schema";
import { generateEmbeddings } from "@/lib/embedding";
import { chunkContent } from "@/lib/chunking";

export async function processPDF(formData: FormData) {
  try {
    const file = formData.get("file") as File;
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const data = new PDFParse({ data: buffer });
    const text = (await data.getText()).text;
    console.log("Extracted text length:", text.length);
    if (text.trim().length === 0) {
      return { success: false, error: "No extractable text found in PDF" };
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
      message : `Processed ${records.length} chunks from PDF.`
    };
  } catch (error) {
    console.log("Error processing PDF:", error);
    return { success: false, error: "Failed to process PDF" };
  }
}
