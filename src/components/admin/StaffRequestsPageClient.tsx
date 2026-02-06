"use client";

import { useState } from "react";
import { SelectStaffRequest, InsertStaffRequest } from "@/lib/db-schema";
import { StaffRequestsList } from "./StaffRequestsList";
import { CompleteRequestDialog } from "./CompleteRequestDialog";
import { DeleteRequestDialog } from "./DeleteRequestDialog";
import { StaffSettingsDialog } from "./StaffSettingsDialog";
import { StaffRequestDialog } from "./StaffRequestDialog";
import { StaffRequestsStats } from "./StaffRequestsStats";
import {
  completeStaffRequestAction,
  createStaffRequestAction,
  getStaffRequestsAction,
  deleteStaffRequestAction,
} from "@/app/actions/staff-requests";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Settings,
} from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { toast } from "react-toastify";
import {
  StaffRequestWithHotel,
  StaffRequestStats,
} from "@/services/staffRequestsService";

interface StaffRequestsPageClientProps {
  initialRequests: StaffRequestWithHotel[];
  totalCount: number;
  initialPage: number;
  totalPages: number;
  stats: StaffRequestStats;
  showHotelColumn?: boolean;
  hotelId?: number;
  userRole?: string;
}

export function StaffRequestsPageClient({
  initialRequests,
  totalCount,
  initialPage,
  totalPages,
  stats,
  showHotelColumn = false,
  hotelId,
  userRole,
}: StaffRequestsPageClientProps) {
  const { userId } = useAuth();
  const [requests, setRequests] =
    useState<StaffRequestWithHotel[]>(initialRequests);
  const [page, setPage] = useState(initialPage);
  const [pages, setPages] = useState(totalPages);
  const [count, setCount] = useState(totalCount);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] =
    useState<SelectStaffRequest | null>(null);

  const fetchRequests = async (
    p: number = 1,
    s: string = searchQuery,
    c: string = categoryFilter,
    st: string = statusFilter,
  ) => {
    try {
      const result = await getStaffRequestsAction(
        s || undefined,
        c === "all" ? undefined : c,
        st === "all" ? undefined : st,
        10,
        p,
        hotelId,
      );
      setRequests(result.requests);
      setPage(p);
      setPages(result.pagination.totalPages);
      setCount(result.pagination.totalCount);
    } catch (error) {
      console.error("Failed to fetch requests", error);
      toast.error("Failed to fetch requests");
    }
  };

  const handleSearch = () => {
    fetchRequests(1, searchQuery, categoryFilter, statusFilter);
  };

  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value);
    fetchRequests(1, searchQuery, value, statusFilter);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    fetchRequests(1, searchQuery, categoryFilter, value);
  };

  const handleCompleteClick = (request: SelectStaffRequest) => {
    setSelectedRequest(request);
    setIsCompleteDialogOpen(true);
  };

  const handleConfirmComplete = async (id: number, note: string) => {
    if (!userId) {
      toast.error("You must be logged in to complete requests");
      return;
    }
    try {
      await completeStaffRequestAction(id, userId, note);
      toast.success("Request completed successfully");
      window.dispatchEvent(new Event("staffRequestsUpdated"));
      fetchRequests(page);
    } catch (error) {
      console.error("Failed to complete request", error);
      toast.error("Failed to complete request");
    }
  };

  const handleConfirmCreate = async (data: InsertStaffRequest) => {
    try {
      await createStaffRequestAction(data);
      toast.success("Request created successfully");
      window.dispatchEvent(new Event("staffRequestsUpdated"));
      fetchRequests(1); // Go back to first page to see new request
    } catch (error) {
      console.error("Failed to create request", error);
      toast.error("Failed to create request");
    }
  };

  const handleDeleteClick = (request: SelectStaffRequest) => {
    setSelectedRequest(request);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async (id: number) => {
    try {
      await deleteStaffRequestAction(id);
      toast.success("Request deleted successfully");
      window.dispatchEvent(new Event("staffRequestsUpdated"));
      fetchRequests(page);
    } catch (error) {
      console.error("Failed to delete request", error);
      toast.error("Failed to delete request");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Staff Requests</h1>
          <p className="text-muted-foreground mt-1">
            Manage guest requests and hotel operations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {userRole === "admin" && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsSettingsDialogOpen(true)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          )}
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New Request
          </Button>
        </div>
      </div>

      <StaffRequestsStats stats={stats} />

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search requests..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
        <Select value={statusFilter} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-45">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <SelectValue placeholder="Status" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="done">Done</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={handleCategoryChange}>
          <SelectTrigger className="w-50">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="reservation">Reservation</SelectItem>
            <SelectItem value="room_issue">Room Issue</SelectItem>
            <SelectItem value="room_service">Room Service</SelectItem>
            <SelectItem value="housekeeping">Housekeeping</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
            <SelectItem value="concierge">Concierge</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <StaffRequestsList
        requests={requests}
        onComplete={handleCompleteClick}
        onDelete={handleDeleteClick}
        showHotelColumn={showHotelColumn}
      />

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between border-t pt-4">
          <p className="text-sm text-muted-foreground">
            Showing {requests.length} of {count} requests
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchRequests(page - 1)}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm font-medium px-2">
              Page {page} of {pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchRequests(page + 1)}
              disabled={page >= pages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <CompleteRequestDialog
        isOpen={isCompleteDialogOpen}
        onClose={() => setIsCompleteDialogOpen(false)}
        onConfirm={handleConfirmComplete}
        request={selectedRequest}
      />

      <StaffRequestDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onConfirm={handleConfirmCreate}
      />

      <DeleteRequestDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        request={selectedRequest}
      />

      <StaffSettingsDialog
        isOpen={isSettingsDialogOpen}
        onClose={() => setIsSettingsDialogOpen(false)}
      />
    </div>
  );
}
