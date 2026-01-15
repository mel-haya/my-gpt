import {
  SelectUploadedFile,
  uploadedFiles,
  users,
  documents,
} from "@/lib/db-schema";
import { db } from "@/lib/db-config";
import { eq, and, desc, ilike, or, count } from "drizzle-orm";

export type UploadedFileWithUser = SelectUploadedFile & {
  username: string | null;
  documentCount: number;
};

export type PaginatedUploadedFiles = {
  files: UploadedFileWithUser[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  statistics: {
    activeFilesCount: number;
    totalDocumentsCount: number;
  };
};

export async function getUploadedFiles(
  searchQuery?: string,
  limit: number = 10,
  page: number = 1
): Promise<PaginatedUploadedFiles> {
  if (searchQuery) {
    // Get total count for search results
    // const [totalCountResult] = await db
    //   .select({ count: uploadedFiles.id })
    //   .from(uploadedFiles)
    //   .leftJoin(users, eq(uploadedFiles.user_id, users.id))
    //   .where(and(or(ilike(uploadedFiles.fileName, `%${searchQuery}%`))));

    const totalCount = await db
      .select()
      .from(uploadedFiles)
      .leftJoin(users, eq(uploadedFiles.user_id, users.id))
      .where(and(or(ilike(uploadedFiles.fileName, `%${searchQuery}%`))));

    // Search in both conversation titles and message content
    const uploadedFilesWithMessages = await db
      .select({
        id: uploadedFiles.id,
        fileName: uploadedFiles.fileName,
        fileHash: uploadedFiles.fileHash,
        status: uploadedFiles.status,
        user_id: uploadedFiles.user_id,
        active: uploadedFiles.active,
        downloadUrl: uploadedFiles.downloadUrl,
        username: users.username,
        documentCount: db.$count(
          documents,
          eq(documents.uploaded_file_id, uploadedFiles.id)
        ),
      })
      .from(uploadedFiles)
      .leftJoin(users, eq(uploadedFiles.user_id, users.id))
      .where(and(or(ilike(uploadedFiles.fileName, `%${searchQuery}%`))))
      .limit(limit)
      .offset(limit * (page - 1))
      .orderBy(desc(uploadedFiles.id));

    const totalPages = Math.ceil(totalCount.length / limit);

    // Get global statistics
    const activeFilesResult = await db
      .select({ count: count() })
      .from(uploadedFiles)
      .where(eq(uploadedFiles.active, true));

    const totalDocumentsResult = await db
      .select({ count: count() })
      .from(documents);

    return {
      files: uploadedFilesWithMessages,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount: totalCount.length,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      statistics: {
        activeFilesCount: activeFilesResult[0]?.count || 0,
        totalDocumentsCount: totalDocumentsResult[0]?.count || 0,
      },
    };
  }

  // If no search query, return all conversations for the user
  // Get total count for all files
  const totalCountResult = await db
    .select()
    .from(uploadedFiles)
    .leftJoin(users, eq(uploadedFiles.user_id, users.id));

  const result = await db
    .select({
      id: uploadedFiles.id,
      fileName: uploadedFiles.fileName,
      fileHash: uploadedFiles.fileHash,
      status: uploadedFiles.status,
      user_id: uploadedFiles.user_id,
      active: uploadedFiles.active,
      downloadUrl: uploadedFiles.downloadUrl,
      username: users.username,
      documentCount: db.$count(
        documents,
        eq(documents.uploaded_file_id, uploadedFiles.id)
      ),
    })
    .from(uploadedFiles)
    .leftJoin(users, eq(uploadedFiles.user_id, users.id))
    .orderBy(desc(uploadedFiles.id))
    .limit(limit)
    .offset(limit * (page - 1));

  const totalCount = totalCountResult.length;
  const totalPages = Math.ceil(totalCount / limit);

  // Get global statistics
  const activeFilesResult = await db
    .select({ count: count() })
    .from(uploadedFiles)
    .where(eq(uploadedFiles.active, true));

  const totalDocumentsResult = await db
    .select({ count: count() })
    .from(documents);

  return {
    files: result,
    pagination: {
      currentPage: page,
      totalPages,
      totalCount,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
    statistics: {
      activeFilesCount: activeFilesResult[0]?.count || 0,
      totalDocumentsCount: totalDocumentsResult[0]?.count || 0,
    },
  };
}

export async function deleteFile(fileId: number): Promise<void> {
  // First delete all documents associated with this file
  await db.delete(documents).where(eq(documents.uploaded_file_id, fileId));
  // Then delete the file itself
  await db.delete(uploadedFiles).where(eq(uploadedFiles.id, fileId));
}

export async function toggleFileActive(
  fileId: number,
  active: boolean
): Promise<void> {
  await db
    .update(uploadedFiles)
    .set({ active })
    .where(eq(uploadedFiles.id, fileId));
}
