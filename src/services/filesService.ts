import { SelectUploadedFile, uploadedFiles } from "@/lib/db-schema";
import { db } from "@/lib/db-config";
import { eq, and, desc, ilike, or } from "drizzle-orm";

export async function getUploadedFiles(
  searchQuery?: string,
  limit: number = 10,
  page: number = 1
): Promise<SelectUploadedFile[]> {
  if (searchQuery) {
    // Search in both conversation titles and message content
    const uploadedFilesWithMessages = await db
      .select()
      .from(uploadedFiles)
      .where(and(or(ilike(uploadedFiles.fileName, `%${searchQuery}%`))))
      .limit(limit)
      .offset(limit * (page - 1))
      .orderBy(desc(uploadedFiles.id));

    return uploadedFilesWithMessages;
  }

  // If no search query, return all conversations for the user
  const result = await db
    .select()
    .from(uploadedFiles)
    .orderBy(desc(uploadedFiles.id))
    .limit(limit)
    .offset(limit * (page - 1));
  return result;
}
