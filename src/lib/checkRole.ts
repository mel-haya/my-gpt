import { Roles } from "@/types/globals";
import { auth } from "@clerk/nextjs/server";
import { getUserById } from "@/services/userService";

export const checkRole = async (role: Roles) => {
  const { userId } = await auth();
  if (!userId) return false;

  const user = await getUserById(userId);
  return user?.role === role;
};
