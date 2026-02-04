"use server";

import {
  getHotels,
  getHotelById,
  createHotel,
  updateHotel,
  deleteHotel,
  getHotelStaff,
  assignStaffToHotel,
  removeStaffFromHotel,
  getAvailableStaffForHotel,
  PaginatedHotels,
} from "@/services/hotelService";
import { InsertHotel, SelectHotel, SelectUser } from "@/lib/db-schema";
import { revalidatePath } from "next/cache";
import { uploadImageToImageKit } from "@/app/api/chat/imageKit";

export async function uploadHotelImageAction(
  base64Image: string,
  fileName: string,
) {
  try {
    const imageUrl = await uploadImageToImageKit(base64Image, fileName);
    return { success: true, data: imageUrl };
  } catch (error) {
    console.error("Error uploading hotel image:", error);
    return {
      success: false,
      error: "Failed to upload image",
    };
  }
}

export async function getHotelsAction(
  searchQuery?: string,
  limit: number = 10,
  page: number = 1,
): Promise<PaginatedHotels> {
  return await getHotels(searchQuery, limit, page);
}

export async function getHotelByIdAction(
  id: number,
): Promise<SelectHotel | undefined> {
  return await getHotelById(id);
}

export async function createHotelAction(
  data: InsertHotel,
): Promise<SelectHotel> {
  const hotel = await createHotel(data);
  revalidatePath("/admin/hotels");
  return hotel;
}

export async function updateHotelAction(
  id: number,
  data: Partial<InsertHotel>,
): Promise<SelectHotel> {
  const hotel = await updateHotel(id, data);
  revalidatePath("/admin/hotels");
  return hotel;
}

export async function deleteHotelAction(id: number): Promise<void> {
  await deleteHotel(id);
  revalidatePath("/admin/hotels");
}

export async function getHotelStaffAction(
  hotelId: number,
): Promise<SelectUser[]> {
  return await getHotelStaff(hotelId);
}

export async function assignStaffToHotelAction(
  hotelId: number,
  userId: string,
): Promise<void> {
  await assignStaffToHotel(hotelId, userId);
  revalidatePath("/admin/hotels");
}

export async function removeStaffFromHotelAction(
  hotelId: number,
  targetUserId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const { getUserById } = await import("@/services/userService");
    const currentUser = await getUserById(userId);

    // Only hotel_owner or admin can remove staff
    if (
      !currentUser ||
      (currentUser.role !== "hotel_owner" && currentUser.role !== "admin")
    ) {
      return {
        success: false,
        error: "Unauthorized: Only owners or admins can remove staff.",
      };
    }

    // Optional: Prevent removing yourself?
    if (userId === targetUserId) {
      return { success: false, error: "You cannot remove yourself." };
    }

    await removeStaffFromHotel(hotelId, targetUserId);
    revalidatePath("/admin/hotels"); // Keep admin revalidation
    revalidatePath("/dashboard"); // Add dashboard revalidation
    return { success: true };
  } catch (error) {
    console.error("Error removing staff:", error);
    return { success: false, error: "Failed to remove staff" };
  }
}

export async function updateStaffRoleAction(
  hotelId: number,
  targetUserId: string,
  newRole: "hotel_owner" | "hotel_staff",
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const { getUserById, updateUserRole } =
      await import("@/services/userService");
    const currentUser = await getUserById(userId);

    // Only hotel_owner can change roles
    if (!currentUser || currentUser.role !== "hotel_owner") {
      return {
        success: false,
        error: "Unauthorized: Only owners can manage roles.",
      };
    }

    if (userId === targetUserId) {
      return { success: false, error: "You cannot change your own role here." };
    }

    await updateUserRole(targetUserId, newRole);
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Error updating staff role:", error);
    return { success: false, error: "Failed to update role" };
  }
}

export async function getAvailableStaffForHotelAction(
  hotelId: number,
): Promise<SelectUser[]> {
  return await getAvailableStaffForHotel(hotelId);
}

import { auth } from "@clerk/nextjs/server";

export async function updateHotelSlugAction(
  hotelId: number,
  newSlug: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const { getUserById } = await import("@/services/userService");
    const user = await getUserById(userId);
    if (!user || user.role !== "hotel_owner") {
      return { success: false, error: "Unauthorized" };
    }

    // Check availability
    const { getHotelBySlug } = await import("@/services/hotelService");
    const existing = await getHotelBySlug(newSlug);
    if (existing && existing.id !== hotelId) {
      return {
        success: false,
        error: "Slug is already taken by another hotel.",
      };
    }

    // Validate format
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slugRegex.test(newSlug)) {
      return {
        success: false,
        error:
          "Invalid slug format. Use lowercase letters, numbers, and hyphens.",
      };
    }

    const { updateHotel } = await import("@/services/hotelService");
    await updateHotel(hotelId, { slug: newSlug });

    revalidatePath("/dashboard");
    revalidatePath(`/`); // Revalidate root for routing updates if relevant
    return { success: true };
  } catch (error) {
    console.error("Error updating hotel slug:", error);
    return { success: false, error: "Failed to update slug" };
  }
}

export async function inviteStaffByEmailAction(
  hotelId: number,
  email: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const { getUserById } = await import("@/services/userService");
    const user = await getUserById(userId);
    if (!user || user.role !== "hotel_owner") {
      return { success: false, error: "Unauthorized" };
    }

    // 1. Find user by email
    const { db } = await import("@/lib/db-config");
    const { users } = await import("@/lib/db-schema");
    const { eq } = await import("drizzle-orm");

    const [targetUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));

    if (!targetUser) {
      return {
        success: false,
        error: "User not found. Please ask them to sign up first.",
      };
    }

    // 2. Assign to hotel
    const { assignStaffToHotel } = await import("@/services/hotelService");
    // Check if already assigned? assignStaffToHotel might throw if unique constraint violation.
    // Let's catch duplicate key error inside assignStaffToHotel or here.
    try {
      await assignStaffToHotel(hotelId, targetUser.id);
    } catch (e: unknown) {
      if (
        e instanceof Error &&
        "code" in e &&
        e.code === "23505"
      ) {
        // Unique violation
        return {
          success: false,
          error: "User is already staff for this hotel.",
        };
      }
      throw e;
    }

    // 3. Update their role to hotel_staff if they are 'user' (optional, but good for consistency)
    if (targetUser.role === "admin" || targetUser.role === "hotel_owner") {
      // Don't downgrade them
    } else {
      const { updateUserRole } = await import("@/services/userService");
      await updateUserRole(targetUser.id, "hotel_staff");
    }

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Error inviting staff:", error);
    return { success: false, error: "Failed to invite staff" };
  }
}
