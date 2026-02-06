"use server";

import { auth } from "@clerk/nextjs/server";
import { getUserById } from "@/services/userService";

export async function getUserRoleAction(): Promise<string | null> {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  const user = await getUserById(userId);
  return user?.role ?? null;
}
