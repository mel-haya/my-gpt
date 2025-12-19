"use server";

import { getUploadedFiles, deleteFile, toggleFileActive, PaginatedUploadedFiles } from "@/services/filesService";

export async function getFilesWithStatus(searchQuery?: string, limit: number = 10, page: number = 1): Promise<PaginatedUploadedFiles> {
  try {
    const result = await getUploadedFiles(searchQuery, limit, page);
    return result;
  } catch (error) {
    console.error("Error fetching files:", error);
    throw new Error("Failed to fetch files");
  }
}

export async function deleteFileAction(fileId: number): Promise<void> {
  try {
    await deleteFile(fileId);
  } catch (error) {
    console.error("Error deleting file:", error);
    throw new Error("Failed to delete file");
  }
}

export async function toggleFileActiveAction(fileId: number, active: boolean): Promise<void> {
  try {
    await toggleFileActive(fileId, active);
  } catch (error) {
    console.error("Error updating file status:", error);
    throw new Error("Failed to update file status");
  }
}