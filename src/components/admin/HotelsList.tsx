"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HotelWithStaffCount } from "@/services/hotelService";
import HotelDialog from "./HotelDialog";
import DeleteHotelDialog from "./DeleteHotelDialog";
import HotelStaffDialog from "./HotelStaffDialog";
import HotelPreferencesDialog from "./HotelPreferencesDialog";
import {
  Edit,
  MoreHorizontal,
  Trash2,
  Users,
  Settings,
  MessageCircle,
} from "lucide-react";
import { format } from "date-fns";

interface HotelsListProps {
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

const getColumns = (
  handleRefresh: () => void,
): ColumnDef<HotelWithStaffCount>[] => [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        {row.original.image ? (
          <img
            src={row.original.image}
            alt={row.original.name}
            className="w-8 h-8 rounded-full object-cover border"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-xs font-bold text-neutral-500">
            {row.original.name.substring(0, 2).toUpperCase()}
          </div>
        )}
        <span className="font-medium">{row.getValue("name")}</span>
      </div>
    ),
  },
  {
    accessorKey: "location",
    header: "Location",
  },
  {
    accessorKey: "staffCount",
    header: "Staff",
    cell: ({ row }) => (
      <div className="flex items-center gap-1 text-sm text-neutral-600 dark:text-neutral-400">
        <Users className="w-3 h-3" />
        {row.original.staffCount}
      </div>
    ),
  },
  {
    accessorKey: "created_at",
    header: "Created",
    cell: ({ row }) => (
      <span className="text-sm text-neutral-500">
        {format(new Date(row.original.created_at), "MMM d, yyyy")}
      </span>
    ),
  },
  {
    id: "actions",
    size: 48,
    cell: ({ row }) => <ActionsCell hotel={row.original} />,
  },
];

function ActionsCell({ hotel }: { hotel: HotelWithStaffCount }) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [staffOpen, setStaffOpen] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  return (
    <div className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Edit className="h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setStaffOpen(true)}>
            <Users className="h-4 w-4" />
            Manage Staff
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setPreferencesOpen(true)}>
            <Settings className="h-4 w-4" />
            Preferences
          </DropdownMenuItem>
          {hotel.slug ? (
            <DropdownMenuItem asChild>
              <Link href={`/${hotel.slug}`}>
                <MessageCircle className="h-4 w-4" />
                Open Chat
              </Link>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem disabled>Open Chat</DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <HotelDialog
        hotel={hotel}
        open={editOpen}
        onOpenChange={setEditOpen}
        trigger={null}
      />
      <HotelStaffDialog
        hotel={hotel}
        open={staffOpen}
        onOpenChange={setStaffOpen}
        trigger={null}
      />
      <DeleteHotelDialog
        hotelId={hotel.id}
        hotelName={hotel.name}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        trigger={null}
      />
      <HotelPreferencesDialog
        hotel={hotel}
        open={preferencesOpen}
        onOpenChange={setPreferencesOpen}
        trigger={null}
      />
    </div>
  );
}

export default function HotelsList({
  hotels,
  pagination,
  searchQuery,
}: HotelsListProps) {
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
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex gap-2 items-center w-full sm:w-auto">
          <form onSubmit={handleSearch} className="flex gap-2 w-full sm:w-auto">
            <Input
              type="text"
              placeholder="Search hotels..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full sm:w-[250px]"
            />
            <Button type="submit" variant="secondary" size="sm">
              Search
            </Button>
          </form>
          {searchInput && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchInput("");
                startTransition(() => {
                  router.push("?");
                });
              }}
            >
              Clear
            </Button>
          )}
        </div>
        <HotelDialog />
      </div>

      <div className="rounded-md border bg-neutral-950/50">
        <DataTable
          columns={getColumns(handleRefresh)}
          data={hotels}
          emptyMessage="No hotels found."
        />
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between py-4">
        <div className="text-sm text-muted-foreground">
          Showing {hotels.length} of {pagination.totalCount} hotels
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.currentPage - 1)}
            disabled={!pagination.hasPreviousPage || isPending}
          >
            Previous
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(
              (page) => (
                <Button
                  key={page}
                  variant={
                    pagination.currentPage === page ? "default" : "outline"
                  }
                  size="sm"
                  className="w-8 h-8 p-0"
                  onClick={() => handlePageChange(page)}
                  disabled={isPending}
                >
                  {page}
                </Button>
              ),
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.currentPage + 1)}
            disabled={!pagination.hasNextPage || isPending}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
