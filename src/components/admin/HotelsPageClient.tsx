"use client";

import { HotelWithStaffCount } from "@/services/hotelService";
import HotelsList from "./HotelsList";

interface HotelsPageClientProps {
  hotels: HotelWithStaffCount[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  searchQuery: string;
}

export default function HotelsPageClient({
  hotels,
  pagination,
  searchQuery,
}: HotelsPageClientProps) {
  return (
    <div className="container mx-auto py-6 px-6 3xl:px-0 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Hotels</h2>
          <p className="text-muted-foreground">
            Manage hotels and staff assignments.
          </p>
        </div>
      </div>

      <HotelsList
        hotels={hotels}
        pagination={pagination}
        searchQuery={searchQuery}
      />
    </div>
  );
}
