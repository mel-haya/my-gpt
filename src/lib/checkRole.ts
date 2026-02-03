import { Roles } from "@/types/globals";
import { auth } from "@clerk/nextjs/server";
import { getUserById } from "@/services/userService";
import { getHotelByUserId } from "@/services/hotelService";

export const checkRole = async (role: Roles): Promise<boolean> => {
  const { userId } = await auth();
  if (!userId) return false;

  const user = await getUserById(userId);
  return user?.role === role;
};

export const checkRoles = async (roles: Roles[]): Promise<boolean> => {
  const { userId } = await auth();
  if (!userId) return false;

  const user = await getUserById(userId);
  return user?.role !== null && roles.includes(user.role as Roles);
};

export const getUserHotelId = async (): Promise<number | null> => {
  const { userId } = await auth();
  if (!userId) return null;

  const hotel = await getHotelByUserId(userId);
  return hotel?.id ?? null;
};
