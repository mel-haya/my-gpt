"use server";

import {
  getStaffRequests,
  createStaffRequest,
  completeStaffRequest,
  deleteStaffRequest,
  getStaffRequestStats,
  PaginatedStaffRequests,
  StaffRequestStats,
} from "@/services/staffRequestsService";
import { InsertStaffRequest, SelectStaffRequest } from "@/lib/db-schema";
import { revalidatePath } from "next/cache";

export async function getStaffRequestsAction(
  searchQuery?: string,
  category?: string,
  status?: string,
  limit: number = 10,
  page: number = 1,
): Promise<PaginatedStaffRequests> {
  return await getStaffRequests(searchQuery, category, status, limit, page);
}

export async function createStaffRequestAction(
  data: InsertStaffRequest,
): Promise<SelectStaffRequest> {
  const request = await createStaffRequest(data);
  revalidatePath("/admin/requests");
  return request;
}

export async function completeStaffRequestAction(
  id: number,
  userId: string,
  note?: string,
): Promise<SelectStaffRequest> {
  const request = await completeStaffRequest(id, userId, note);
  revalidatePath("/admin/requests");
  return request;
}

export async function getStaffRequestStatsAction(): Promise<StaffRequestStats> {
  return await getStaffRequestStats();
}

export async function deleteStaffRequestAction(id: number): Promise<void> {
  await deleteStaffRequest(id);
  revalidatePath("/admin/requests");
}
