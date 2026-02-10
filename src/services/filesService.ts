import {
  SelectUploadedFile,
  uploadedFiles,
  users,
  documents,
} from "@/lib/db-schema";
import { db } from "@/lib/db-config";
import { eq, and, desc, ilike, count } from "drizzle-orm";

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
  page: number = 1,
  hotelId?: number,
): Promise<PaginatedUploadedFiles> {
  // Build base where condition for hotel filtering
  const hotelCondition = hotelId
    ? eq(uploadedFiles.hotel_id, hotelId)
    : undefined;

  if (searchQuery) {
    // Get total count for search results
    // const [totalCountResult] = await db
    //   .select({ count: uploadedFiles.id })
    //   .from(uploadedFiles)
    //   .leftJoin(users, eq(uploadedFiles.user_id, users.id))
    //   .where(and(or(ilike(uploadedFiles.fileName, `%${searchQuery}%`))));

    const searchCondition = ilike(uploadedFiles.fileName, `%${searchQuery}%`);
    const whereCondition = hotelCondition
      ? and(searchCondition, hotelCondition)
      : searchCondition;

    const totalCount = await db
      .select()
      .from(uploadedFiles)
      .leftJoin(users, eq(uploadedFiles.user_id, users.id))
      .where(whereCondition);

    // Search in both conversation titles and message content
    const uploadedFilesWithMessages = await db
      .select({
        id: uploadedFiles.id,
        fileName: uploadedFiles.fileName,
        fileHash: uploadedFiles.fileHash,
        status: uploadedFiles.status,
        user_id: uploadedFiles.user_id,
        active: uploadedFiles.active,
        include_in_tests: uploadedFiles.include_in_tests,
        downloadUrl: uploadedFiles.downloadUrl,
        hotel_id: uploadedFiles.hotel_id,
        username: users.username,
        documentCount: db.$count(
          documents,
          eq(documents.uploaded_file_id, uploadedFiles.id),
        ),
      })
      .from(uploadedFiles)
      .leftJoin(users, eq(uploadedFiles.user_id, users.id))
      .where(whereCondition)
      .limit(limit)
      .offset(limit * (page - 1))
      .orderBy(desc(uploadedFiles.id));

    const totalPages = Math.ceil(totalCount.length / limit);

    // Get statistics (scoped to hotel if applicable)
    const statsCondition = hotelCondition
      ? and(eq(uploadedFiles.active, true), hotelCondition)
      : eq(uploadedFiles.active, true);
    const activeFilesResult = await db
      .select({ count: count() })
      .from(uploadedFiles)
      .where(statsCondition);

    const totalDocumentsResult = await db
      .select({ count: count() })
      .from(documents)
      .leftJoin(uploadedFiles, eq(documents.uploaded_file_id, uploadedFiles.id))
      .where(hotelCondition);

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

  // If no search query, return all files
  // Get total count for all files (scoped to hotel if applicable)
  const totalCountResult = await db
    .select()
    .from(uploadedFiles)
    .leftJoin(users, eq(uploadedFiles.user_id, users.id))
    .where(hotelCondition);

  const result = await db
    .select({
      id: uploadedFiles.id,
      fileName: uploadedFiles.fileName,
      fileHash: uploadedFiles.fileHash,
      status: uploadedFiles.status,
      user_id: uploadedFiles.user_id,
      active: uploadedFiles.active,
      include_in_tests: uploadedFiles.include_in_tests,
      downloadUrl: uploadedFiles.downloadUrl,
      hotel_id: uploadedFiles.hotel_id,
      username: users.username,
      documentCount: db.$count(
        documents,
        eq(documents.uploaded_file_id, uploadedFiles.id),
      ),
    })
    .from(uploadedFiles)
    .leftJoin(users, eq(uploadedFiles.user_id, users.id))
    .where(hotelCondition)
    .orderBy(desc(uploadedFiles.id))
    .limit(limit)
    .offset(limit * (page - 1));

  const totalCount = totalCountResult.length;
  const totalPages = Math.ceil(totalCount / limit);

  // Get statistics (scoped to hotel if applicable)
  const statsCondition = hotelCondition
    ? and(eq(uploadedFiles.active, true), hotelCondition)
    : eq(uploadedFiles.active, true);
  const activeFilesResult = await db
    .select({ count: count() })
    .from(uploadedFiles)
    .where(statsCondition);

  const totalDocumentsResult = await db
    .select({ count: count() })
    .from(documents)
    .leftJoin(uploadedFiles, eq(documents.uploaded_file_id, uploadedFiles.id))
    .where(hotelCondition);

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

export async function deleteFile(
  fileId: number,
  hotelId?: number,
): Promise<void> {
  const whereCondition = hotelId
    ? and(eq(uploadedFiles.id, fileId), eq(uploadedFiles.hotel_id, hotelId))
    : eq(uploadedFiles.id, fileId);

  // Verify file exists and belongs to hotel if hotelId provided
  const [file] = await db
    .select({ id: uploadedFiles.id })
    .from(uploadedFiles)
    .where(whereCondition);

  if (!file) {
    throw new Error("File not found or access denied");
  }

  // First delete all documents associated with this file
  await db.delete(documents).where(eq(documents.uploaded_file_id, fileId));
  // Then delete the file itself
  await db.delete(uploadedFiles).where(eq(uploadedFiles.id, fileId));
}

export async function toggleFileActive(
  fileId: number,
  active: boolean,
  hotelId?: number,
): Promise<void> {
  const whereCondition = hotelId
    ? and(eq(uploadedFiles.id, fileId), eq(uploadedFiles.hotel_id, hotelId))
    : eq(uploadedFiles.id, fileId);

  // Verify file exists and belongs to hotel if hotelId provided
  const [file] = await db
    .select({ id: uploadedFiles.id })
    .from(uploadedFiles)
    .where(whereCondition);

  if (!file) {
    throw new Error("File not found or access denied");
  }

  await db
    .update(uploadedFiles)
    .set({ active })
    .where(eq(uploadedFiles.id, fileId));
}

export async function toggleFileIncludeInTests(
  fileId: number,
  includeInTests: boolean,
  hotelId?: number,
): Promise<void> {
  const whereCondition = hotelId
    ? and(eq(uploadedFiles.id, fileId), eq(uploadedFiles.hotel_id, hotelId))
    : eq(uploadedFiles.id, fileId);

  const [file] = await db
    .select({ id: uploadedFiles.id })
    .from(uploadedFiles)
    .where(whereCondition);

  if (!file) {
    throw new Error("File not found or access denied");
  }

  await db
    .update(uploadedFiles)
    .set({ include_in_tests: includeInTests })
    .where(eq(uploadedFiles.id, fileId));
}
