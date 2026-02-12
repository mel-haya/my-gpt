"use server";

import {
  getUploadedFiles,
  deleteFile,
  getFileHotelId,
  toggleFileActive,
  toggleFileIncludeInTests,
  PaginatedUploadedFiles,
} from "@/services/filesService";
import { checkRole, checkRoles, getUserHotelId } from "@/lib/checkRole";

export async function getFilesWithStatus(
  searchQuery?: string,
  limit: number = 10,
  page: number = 1,
): Promise<PaginatedUploadedFiles> {
  try {
    // Check if user has admin role
    const isAdmin = await checkRole("admin");
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

// Hotel owner version - filters by hotel
export async function getHotelFilesWithStatus(
  searchQuery?: string,
  limit: number = 10,
  page: number = 1,
): Promise<PaginatedUploadedFiles> {
  try {
    const hasAccess = await checkRoles(["hotel_owner"]);
    if (!hasAccess) {
      throw new Error("Unauthorized: Hotel owner access required");
    }

    const hotelId = await getUserHotelId();
    if (!hotelId) {
      throw new Error("No hotel assigned");
    }

    const result = await getUploadedFiles(searchQuery, limit, page, hotelId);
    return result;
  } catch (error) {
    console.error("Error fetching hotel files:", error);
    throw new Error("Failed to fetch files");
  }
}

export async function deleteFileAction(fileId: number): Promise<void> {
  try {
    const isAdmin = await checkRole("admin");
    if (isAdmin) {
      await deleteFile(fileId);
      return;
    }

    // Check if hotel owner
    const isHotelOwner = await checkRole("hotel_owner");
    if (isHotelOwner) {
      const hotelId = await getUserHotelId();
      if (!hotelId) {
        throw new Error("No hotel assigned");
      }
      const fileHotelId = await getFileHotelId(fileId);
      if (fileHotelId !== hotelId) {
        throw new Error("Unauthorized: File does not belong to your hotel");
      }
      await deleteFile(fileId, hotelId);
      return;
    }

    throw new Error("Unauthorized: Admin or Hotel owner access required");
  } catch (error) {
    console.error("Error deleting file:", error);
    throw new Error("Failed to delete file");
  }
}

export async function toggleFileActiveAction(
  fileId: number,
  active: boolean,
): Promise<void> {
  try {
    const isAdmin = await checkRole("admin");
    if (isAdmin) {
      await toggleFileActive(fileId, active);
      return;
    }

    // Check if hotel owner
    const isHotelOwner = await checkRole("hotel_owner");
    if (isHotelOwner) {
      const hotelId = await getUserHotelId();
      if (!hotelId) {
        throw new Error("No hotel assigned");
      }
      await toggleFileActive(fileId, active, hotelId);
      return;
    }

    throw new Error("Unauthorized: Admin or Hotel owner access required");
  } catch (error) {
    console.error("Error updating file status:", error);
    throw new Error("Failed to update file status");
  }
}

export async function toggleFileIncludeInTestsAction(
  fileId: number,
  includeInTests: boolean,
): Promise<void> {
  try {
    const isAdmin = await checkRole("admin");
    if (!isAdmin) {
      throw new Error("Unauthorized: Admin access required");
    }

    await toggleFileIncludeInTests(fileId, includeInTests);
  } catch (error) {
    console.error("Error updating file test inclusion:", error);
    throw new Error("Failed to update file test inclusion");
  }
}
