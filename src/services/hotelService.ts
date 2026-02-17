import { db } from "@/lib/db-config";
import {
  hotels,
  hotelStaff,
  users,
  type InsertHotel,
  type SelectHotel,
  type SelectUser,
} from "@/lib/db-schema";
import {
  eq,
  ilike,
  and,
  desc,
  count,
  notInArray,
  getTableColumns,
} from "drizzle-orm";

export type HotelWithStaffCount = SelectHotel & {
  staffCount: number;
};

export type PaginatedHotels = {
  hotels: HotelWithStaffCount[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};

export async function getHotels(
  searchQuery?: string,
  limit: number = 10,
  page: number = 1,
): Promise<PaginatedHotels> {
  const offset = (page - 1) * limit;
  let whereClause = undefined;

  if (searchQuery) {
    whereClause = ilike(hotels.name, `%${searchQuery}%`);
  }

  // Get total count
  const [totalCountResult] = await db
    .select({ count: count() })
    .from(hotels)
    .where(whereClause);

  const totalCount = Number(totalCountResult?.count || 0);

  // Get hotels with staff count
  const result = await db
    .select({
      ...getTableColumns(hotels),
      staffCount: count(hotelStaff.id),
    })
    .from(hotels)
    .leftJoin(hotelStaff, eq(hotels.id, hotelStaff.hotel_id))
    .where(whereClause)
    .groupBy(hotels.id)
    .orderBy(desc(hotels.created_at))
    .limit(limit)
    .offset(offset);

  const totalPages = Math.ceil(totalCount / limit);

  return {
    hotels: result.map((h) => ({
      ...h,
      staffCount: Number(h.staffCount),
    })),
    pagination: {
      currentPage: page,
      totalPages,
      totalCount,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}

export async function getHotelById(
  id: number,
): Promise<SelectHotel | undefined> {
  const [hotel] = await db.select().from(hotels).where(eq(hotels.id, id));
  return hotel;
}

export async function getHotelBySlug(
  slug: string,
): Promise<SelectHotel | undefined> {
  const [hotel] = await db.select().from(hotels).where(eq(hotels.slug, slug));
  return hotel;
}

export async function getHotelPreferredLanguage(
  hotelId: number,
): Promise<string | null> {
  const hotel = await getHotelById(hotelId);
  return hotel?.preferred_language ?? null;
}

export async function getHotelByUserId(
  userId: string,
): Promise<SelectHotel | undefined> {
  const [result] = await db
    .select({
      id: hotels.id,
      name: hotels.name,
      image: hotels.image,
      location: hotels.location,
      preferred_language: hotels.preferred_language,
      slug: hotels.slug,
      system_prompt_id: hotels.system_prompt_id,
      model_id: hotels.model_id,
      created_at: hotels.created_at,
      updated_at: hotels.updated_at,
    })
    .from(hotelStaff)
    .innerJoin(hotels, eq(hotelStaff.hotel_id, hotels.id))
    .where(eq(hotelStaff.user_id, userId))
    .limit(1);
  return result;
}

export async function createHotel(
  data: Omit<InsertHotel, "slug"> & { slug?: string | null },
): Promise<SelectHotel> {
  let slug = data.slug;
  if (!slug) {
    slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    // Ensure slug is unique by appending a random string if needed
    // Simple check: unlikely to collide in this context, but DB will enforce.
    // For now, simple slugification.
  }

  const [newHotel] = await db
    .insert(hotels)
    .values({ ...data, slug })
    .returning();
  return newHotel;
}

export async function updateHotel(
  id: number,
  data: Partial<InsertHotel>,
): Promise<SelectHotel> {
  const [updatedHotel] = await db
    .update(hotels)
    .set({ ...data, updated_at: new Date() })
    .where(eq(hotels.id, id))
    .returning();
  return updatedHotel;
}

export async function deleteHotel(id: number): Promise<void> {
  await db.delete(hotels).where(eq(hotels.id, id));
}

export async function updateHotelPreferences(
  hotelId: number,
  data: {
    systemPromptId: number | null;
    modelId: number | null;
    preferredLanguage?: string;
  },
): Promise<void> {
  await db
    .update(hotels)
    .set({
      system_prompt_id: data.systemPromptId,
      model_id: data.modelId,
      preferred_language: data.preferredLanguage,
      updated_at: new Date(),
    })
    .where(eq(hotels.id, hotelId));
}

// Get all hotels (for dropdown selects)
export async function getAllHotelsBasic(): Promise<
  { id: number; name: string }[]
> {
  const result = await db
    .select({
      id: hotels.id,
      name: hotels.name,
    })
    .from(hotels)
    .orderBy(hotels.name);
  return result;
}

// Get all hotels for the public landing page
export async function getAllHotelsForLanding(): Promise<
  {
    name: string;
    slug: string | null;
    location: string;
    image: string | null;
  }[]
> {
  const result = await db
    .select({
      name: hotels.name,
      slug: hotels.slug,
      location: hotels.location,
      image: hotels.image,
    })
    .from(hotels)
    .orderBy(hotels.name);
  return result;
}

// Staff Management

export async function getHotelStaff(hotelId: number): Promise<SelectUser[]> {
  const staff = await db
    .select({
      id: users.id,
      username: users.username,
      email: users.email,
      role: users.role,
      created_at: users.created_at,
      updated_at: users.updated_at,
    })
    .from(hotelStaff)
    .innerJoin(users, eq(hotelStaff.user_id, users.id))
    .where(eq(hotelStaff.hotel_id, hotelId));

  return staff;
}

export async function assignStaffToHotel(
  hotelId: number,
  userId: string,
): Promise<void> {
  await db.insert(hotelStaff).values({
    hotel_id: hotelId,
    user_id: userId,
  });
}

export async function removeStaffFromHotel(
  hotelId: number,
  userId: string,
): Promise<void> {
  await db
    .delete(hotelStaff)
    .where(
      and(eq(hotelStaff.hotel_id, hotelId), eq(hotelStaff.user_id, userId)),
    );
}

export async function updateUserHotel(
  userId: string,
  newHotelId: number | null,
): Promise<void> {
  // Remove user from all hotels first
  await db.delete(hotelStaff).where(eq(hotelStaff.user_id, userId));

  // Assign to new hotel if specified
  if (newHotelId !== null) {
    await db.insert(hotelStaff).values({
      hotel_id: newHotelId,
      user_id: userId,
    });
  }
}

export async function getAvailableStaffForHotel(
  hotelId: number,
): Promise<SelectUser[]> {
  // Get IDs of users already assigned to this hotel
  const assignedStaff = await db
    .select({ user_id: hotelStaff.user_id })
    .from(hotelStaff)
    .where(eq(hotelStaff.hotel_id, hotelId));

  const assignedUserIds = assignedStaff.map((s) => s.user_id);

  let whereClause = undefined;
  if (assignedUserIds.length > 0) {
    whereClause = notInArray(users.id, assignedUserIds);
  }

  const availableUsers = await db.select().from(users).where(whereClause);

  return availableUsers;
}
