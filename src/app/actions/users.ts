"use server";

import {
  getUsersWithTokenUsage,
  updateUserRole,
  getUserById,
} from "@/services/userService";
import { getAllHotelsBasic, updateUserHotel } from "@/services/hotelService";
import { checkRole } from "@/lib/checkRole";
import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { Roles } from "@/types/globals";

function isValidRole(role: unknown): role is Roles {
  return role === "admin" || role === "hotel_owner" || role === "hotel_staff";
}

export async function getUsersWithStatus(
  searchQuery?: string,
  limit: number = 10,
  page: number = 1,
) {
  try {
    // Check if user has admin role
    const isAdmin = await checkRole("admin");
    if (!isAdmin) {
      throw new Error("Unauthorized: Admin access required");
    }

    const result = await getUsersWithTokenUsage(searchQuery, limit, page);
    return result;
  } catch (error) {
    console.error("Error in getUsersWithStatus action:", error);
    throw new Error("Failed to fetch users data");
  }
}

export async function updateUserRoleAction(
  userId: string,
  role: "admin" | "hotel_owner" | "hotel_staff" | null,
) {
  try {
    const isAdmin = await checkRole("admin");
    if (!isAdmin) {
      throw new Error("Unauthorized: Admin access required");
    }

    await updateUserRole(userId, role);
    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    console.error("Error in updateUserRoleAction:", error);
    throw new Error("Failed to update user role");
  }
}

export async function getCurrentUserRole(): Promise<Roles | null> {
  try {
    const { userId } = await auth();
    if (!userId) return null;

    // const claimRole = (sessionClaims as CustomJwtSessionClaims | undefined)
    //   ?.metadata?.role;
    // if (isValidRole(claimRole)) {
    //   return claimRole;
    // }

    const user = await getUserById(userId);
    const role = user?.role;
    return isValidRole(role) ? role : null;
  } catch (error) {
    console.error("Error in getCurrentUserRole action:", error);
    return null;
  }
}

export async function getAllHotelsForDropdown() {
  try {
    const isAdmin = await checkRole("admin");
    if (!isAdmin) {
      throw new Error("Unauthorized: Admin access required");
    }

    return await getAllHotelsBasic();
  } catch (error) {
    console.error("Error in getAllHotelsForDropdown action:", error);
    throw new Error("Failed to fetch hotels");
  }
}

export async function updateUserHotelAction(
  userId: string,
  hotelId: number | null,
) {
  try {
    const isAdmin = await checkRole("admin");
    if (!isAdmin) {
      throw new Error("Unauthorized: Admin access required");
    }

    await updateUserHotel(userId, hotelId);
    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    console.error("Error in updateUserHotelAction:", error);
    throw new Error("Failed to update user hotel");
  }
}
