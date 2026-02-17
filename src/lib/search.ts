import { cosineDistance, desc, gt, sql, eq, and } from "drizzle-orm";
import { db } from "./db-config";
import { documents, uploadedFiles, hotels } from "./db-schema";
import { generateEmbedding } from "./embedding";

export async function searchDocuments(
  query: string,
  limit: number = 5,
  threshold: number = 0.5,
  hotelName?: string,
) {
  const embedding = await generateEmbedding(query);

  const similarity = sql<number>`1 - (${cosineDistance(
    documents.embedding,
    embedding,
  )})`;

  const similarDocuments = await db
    .select({
      id: documents.id,
      content: documents.content,
      embedding: documents.embedding,
      similarity,
    })
    .from(documents)
    .innerJoin(uploadedFiles, eq(documents.uploaded_file_id, uploadedFiles.id))
    .leftJoin(hotels, eq(uploadedFiles.hotel_id, hotels.id))
    .where(
      and(
        gt(similarity, threshold),
        eq(uploadedFiles.active, true),
        hotelName ? eq(hotels.name, hotelName) : undefined,
      ),
    )
    .orderBy(desc(similarity))
    .limit(limit);
  return similarDocuments;
}
