"use client";

import { useState, useTransition, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UserWithTokenUsage } from "@/services/userService";
import {
  updateUserRoleAction,
  updateUserHotelAction,
} from "@/app/actions/users";

type HotelBasic = { id: number; name: string };

type UserWithHotel = UserWithTokenUsage & {
  hotelId: number | null;
  hotelName: string | null;
};

interface UsersTableProps {
  users: UserWithHotel[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  searchQuery: string;
  hotels: HotelBasic[];
}

const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
};

type RoleType = "admin" | "hotel_owner" | "hotel_staff" | null;

const roleLabels: Record<string, string> = {
  none: "No Role",
  admin: "Admin",
  hotel_owner: "Hotel Owner",
  hotel_staff: "Hotel Staff",
};

function RoleCell({
  userId,
  currentRole,
}: {
  userId: string;
  currentRole: RoleType;
}) {
  const [isPending, startTransition] = useTransition();
  const isClient = useSyncExternalStore(
    emptySubscribe,
    getClientSnapshot,
    getServerSnapshot,
  );

  const handleRoleChange = (newRole: string) => {
    const roleValue = newRole === "none" ? null : (newRole as RoleType);
    startTransition(async () => {
      try {
        await updateUserRoleAction(userId, roleValue);
      } catch (error) {
        console.error("Failed to update role:", error);
      }
    });
  };

  // Render a static placeholder during SSR to avoid hydration mismatch
  if (!isClient) {
    return (
      <div className="w-32 h-8 flex items-center px-3 text-sm border border-input rounded-md bg-transparent">
        {roleLabels[currentRole ?? "none"]}
      </div>
    );
  }

  return (
    <Select
      value={currentRole ?? "none"}
      onValueChange={handleRoleChange}
      disabled={isPending}
    >
      <SelectTrigger className="w-32 h-8">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">No Role</SelectItem>
        <SelectItem value="admin">Admin</SelectItem>
        <SelectItem value="hotel_owner">Hotel Owner</SelectItem>
        <SelectItem value="hotel_staff">Hotel Staff</SelectItem>
      </SelectContent>
    </Select>
  );
}

function HotelCell({
  userId,
  currentHotelId,
  currentHotelName,
  hotels,
}: {
  userId: string;
  currentHotelId: number | null;
  currentHotelName: string | null;
  hotels: HotelBasic[];
}) {
  const [isPending, startTransition] = useTransition();
  const isClient = useSyncExternalStore(
    emptySubscribe,
    getClientSnapshot,
    getServerSnapshot,
  );

  const handleHotelChange = (newHotelId: string) => {
    const hotelIdValue =
      newHotelId === "none" ? null : parseInt(newHotelId, 10);
    startTransition(async () => {
      try {
        await updateUserHotelAction(userId, hotelIdValue);
      } catch (error) {
        console.error("Failed to update hotel:", error);
      }
    });
  };

  // Render a static placeholder during SSR to avoid hydration mismatch
  if (!isClient) {
    return (
      <div className="w-36 h-8 flex items-center px-3 text-sm border border-input rounded-md bg-transparent truncate">
        {currentHotelName ?? "No Hotel"}
      </div>
    );
  }

  return (
    <Select
      value={currentHotelId?.toString() ?? "none"}
      onValueChange={handleHotelChange}
      disabled={isPending}
    >
      <SelectTrigger className="w-36 h-8">
        <SelectValue placeholder="Select hotel" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">No Hotel</SelectItem>
        {hotels.map((hotel) => (
          <SelectItem key={hotel.id} value={hotel.id.toString()}>
            {hotel.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const getColumns = (
  handleRefresh: () => void,
  hotels: HotelBasic[],
): ColumnDef<UserWithHotel>[] => [
  {
    accessorKey: "username",
    header: "Username",
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("username")}</div>
    ),
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => (
      <div className="text-neutral-600 dark:text-neutral-400">
        {row.getValue("email")}
      </div>
    ),
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => (
      <RoleCell
        userId={row.original.id}
        currentRole={row.getValue("role") as RoleType}
      />
    ),
  },
  {
    accessorKey: "hotelName",
    header: "Hotel",
    cell: ({ row }) => (
      <HotelCell
        userId={row.original.id}
        currentHotelId={row.original.hotelId}
        currentHotelName={row.original.hotelName}
        hotels={hotels}
      />
    ),
  },
  {
    accessorKey: "created_at",
    header: "Joined",
    cell: ({ row }) => {
      const date = row.getValue("created_at") as Date;
      return (
        <div className="text-sm text-neutral-600 dark:text-neutral-400">
          {formatDate(date)}
        </div>
      );
    },
  },
];

export default function UsersTable({
  users,
  pagination,
  searchQuery,
  hotels,
}: UsersTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [searchInput, setSearchInput] = useState(searchQuery || "");

  const handlePageChange = (page: number) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", page.toString());
      if (searchQuery) {
        params.set("search", searchQuery);
      } else {
        params.delete("search");
      }
      router.push(`?${params.toString()}`);
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(() => {
      const params = new URLSearchParams();
      params.set("page", "1");
      if (searchInput.trim()) {
        params.set("search", searchInput.trim());
      }
      router.push(`?${params.toString()}`);
    });
  };

  const handleRefresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <div className="p-4 bg-neutral-900 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Users</h3>
        <div className="flex gap-2 items-center">
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              type="text"
              placeholder="Search users..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-48"
            />
            <Button type="submit" variant="outline" size="sm">
              Search
            </Button>
            {searchInput && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 lg:px-3"
                onClick={() => {
                  setSearchInput("");
                  startTransition(() => {
                    const params = new URLSearchParams(searchParams.toString());
                    params.delete("search");
                    params.set("page", "1");
                    router.push(`?${params.toString()}`);
                  });
                }}
              >
                Clear
              </Button>
            )}
          </form>
          <Button
            onClick={handleRefresh}
            disabled={isPending}
            variant="outline"
            size="sm"
          >
            {isPending ? "Loading..." : "Refresh"}
          </Button>
        </div>
      </div>

      <DataTable
        columns={getColumns(handleRefresh, hotels)}
        data={users}
        emptyMessage="No users found."
      />

      {/* Pagination Controls */}
      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="flex-1 text-sm text-neutral-500 dark:text-neutral-400">
          Showing {users.length} of {pagination.totalCount} users
          {pagination.totalPages > 1 && (
            <span>
              {" "}
              (Page {pagination.currentPage} of {pagination.totalPages})
            </span>
          )}
        </div>

        {pagination.totalPages > 1 && (
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => handlePageChange(pagination.currentPage - 1)}
              disabled={!pagination.hasPreviousPage || isPending}
              variant="outline"
              size="sm"
            >
              Previous
            </Button>

            <div className="flex items-center space-x-1">
              {Array.from(
                { length: Math.min(pagination.totalPages, 5) },
                (_, i) => {
                  let pageNum;
                  if (pagination.totalPages <= 5) {
                    pageNum = i + 1;
                  } else {
                    const start = Math.max(1, pagination.currentPage - 2);
                    const end = Math.min(pagination.totalPages, start + 4);
                    const adjustedStart = Math.max(1, end - 4);
                    pageNum = adjustedStart + i;
                  }

                  return (
                    <Button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      disabled={isPending}
                      variant={
                        pagination.currentPage === pageNum
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      className="w-8 h-8 p-0"
                    >
                      {pageNum}
                    </Button>
                  );
                },
              )}
            </div>

            <Button
              onClick={() => handlePageChange(pagination.currentPage + 1)}
              disabled={!pagination.hasNextPage || isPending}
              variant="outline"
              size="sm"
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
