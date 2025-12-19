"use server";

import { getUploadedFiles, deleteFile, toggleFileActive, PaginatedUploadedFiles } from "@/services/filesService";
import { checkRole } from "@/lib/checkRole";

export async function getFilesWithStatus(searchQuery?: string, limit: number = 10, page: number = 1): Promise<PaginatedUploadedFiles> {
  try {
    // Check if user has admin role
    const isAdmin = await checkRole('admin');
    if (!isAdmin) {
      throw new Error("Unauthorized: Admin access required");
    }

    const result = await getUploadedFiles(searchQuery, limit, page);
    return result;
  } catch (error) {
    console.error("Error fetching files:", error);
    throw new Error("Failed to fetch files");
  }
}

export async function deleteFileAction(fileId: number): Promise<void> {
  try {
    // Check if user has admin role
    const isAdmin = await checkRole('admin');
    if (!isAdmin) {
      throw new Error("Unauthorized: Admin access required");
    }

    await deleteFile(fileId);
  } catch (error) {
    console.error("Error deleting file:", error);
    throw new Error("Failed to delete file");
  }
}

export async function toggleFileActiveAction(fileId: number, active: boolean): Promise<void> {
  try {
    // Check if user has admin role
    const isAdmin = await checkRole('admin');
    if (!isAdmin) {
      throw new Error("Unauthorized: Admin access required");
    }

    await toggleFileActive(fileId, active);
  } catch (error) {
    console.error("Error updating file status:", error);
    throw new Error("Failed to update file status");
  }
}