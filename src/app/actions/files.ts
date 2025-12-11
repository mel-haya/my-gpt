"use server";

import { getUploadedFiles } from "@/services/filesService";
import { SelectUploadedFile } from "@/lib/db-schema";

export async function getFilesWithStatus(): Promise<SelectUploadedFile[]> {
  try {
    const files = await getUploadedFiles("", 100, 1); // Get all files
    return files;
  } catch (error) {
    console.error("Error fetching files:", error);
    throw new Error("Failed to fetch files");
  }
}