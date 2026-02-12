"use server";

import {
  getStaffRequests,
  createStaffRequest,
  completeStaffRequest,
  deleteStaffRequest,
  getStaffRequestStats,
  getPendingRequestsCount,
  PaginatedStaffRequests,
  StaffRequestStats,
} from "@/services/staffRequestsService";
import { InsertStaffRequest, SelectStaffRequest } from "@/lib/db-schema";
import { revalidatePath } from "next/cache";
import { endOfDay, startOfDay } from "date-fns";

export async function getStaffRequestsAction(
  searchQuery?: string,
  category?: string,
  status?: string,
  limit: number = 10,
  page: number = 1,
  hotelId?: number,
  startDate?: string,
  endDate?: string,
): Promise<PaginatedStaffRequests> {
  const parsedStartDate = startDate ? new Date(startDate) : undefined;
  const parsedEndDate = endDate ? new Date(endDate) : undefined;
  const normalizedStartDate =
    parsedStartDate && !Number.isNaN(parsedStartDate.getTime())
      ? startOfDay(parsedStartDate)
      : undefined;
  const normalizedEndDate =
    parsedEndDate && !Number.isNaN(parsedEndDate.getTime())
      ? endOfDay(parsedEndDate)
      : undefined;

  return await getStaffRequests(
    searchQuery,
    category,
    status,
    limit,
    page,
    hotelId,
    normalizedStartDate,
    normalizedEndDate,
  );
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

export async function getStaffRequestStatsAction(
  hotelId?: number,
): Promise<StaffRequestStats> {
  return await getStaffRequestStats(hotelId);
}

export async function deleteStaffRequestAction(id: number): Promise<void> {
  await deleteStaffRequest(id);
  revalidatePath("/admin/requests");
}

export async function getPendingRequestsCountAction(
  hotelId?: number,
): Promise<number> {
  return await getPendingRequestsCount(hotelId);
}
