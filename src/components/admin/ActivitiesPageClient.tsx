"use client";

import { useState, useEffect } from "react";
import { ActivitiesList } from "./ActivitiesList";
import { ActivityDialog } from "./ActivityDialog";
import { DeleteActivityDialog } from "./DeleteActivityDialog";
import { SelectActivity, InsertActivity } from "@/lib/db-schema";
import {
  getActivitiesAction,
  createActivityAction,
  updateActivityAction,
  deleteActivityAction,
} from "@/app/actions/activities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, Plus, Search, Compass } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTransition } from "react";
import { toast } from "react-toastify";
import { useRouter, useSearchParams } from "next/navigation";

interface ActivitiesPageClientProps {
  initialActivities: SelectActivity[];
  totalCount: number;
  initialPage: number;
  totalPages: number;
  hotels?: { id: number; name: string }[];
  hotelQuery?: string;
  /** When true, hides hotel filter/badge (dashboard context) */
  hideHotelControls?: boolean;
  /** Pre-set hotel ID for dashboard context */
  fixedHotelId?: number;
}

export function ActivitiesPageClient({
  initialActivities,
  totalCount,
  initialPage,
  totalPages,
  hotels = [],
  hotelQuery = "",
  hideHotelControls = false,
  fixedHotelId,
}: ActivitiesPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activities, setActivities] =
    useState<SelectActivity[]>(initialActivities);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [isPending, startTransition] = useTransition();

  // Sync with server-provided data when URL params change
  useEffect(() => {
    setActivities(initialActivities);
  }, [initialActivities]);

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] =
    useState<SelectActivity | null>(null);
  const [activityToDelete, setActivityToDelete] =
    useState<SelectActivity | null>(null);

  const activeHotelId =
    fixedHotelId || (hotelQuery ? Number(hotelQuery) : undefined);

  const fetchActivities = async (
    page: number,
    s: string,
    c: string,
    hId?: number,
  ) => {
    startTransition(async () => {
      const result = await getActivitiesAction({
        page,
        search: s,
        category: c,
        hotelId: hId ?? activeHotelId,
      });
      if (result.success && result.data) {
        setActivities(result.data.activities);
      }
    });
  };

  const handleSearch = () => {
    if (hideHotelControls) {
      // Dashboard mode: client-side fetch
      fetchActivities(1, search, category);
      setCurrentPage(1);
    } else {
      // Admin mode: URL-based navigation
      startTransition(() => {
        const params = new URLSearchParams(searchParams);
        if (search.trim()) {
          params.set("search", search);
        } else {
          params.delete("search");
        }
        params.delete("page");
        router.push(`/admin/activities?${params.toString()}`);
      });
    }
  };

  const handleCategoryChange = (val: string) => {
    setCategory(val);
    if (hideHotelControls) {
      fetchActivities(1, search, val);
      setCurrentPage(1);
    } else {
      startTransition(() => {
        const params = new URLSearchParams(searchParams);
        if (val && val !== "all") {
          params.set("category", val);
        } else {
          params.delete("category");
        }
        params.delete("page");
        router.push(`/admin/activities?${params.toString()}`);
      });
    }
  };

  const handleHotelChange = (hotel: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      if (hotel && hotel !== "all") {
        params.set("hotel", hotel);
      } else {
        params.delete("hotel");
      }
      params.delete("page");
      router.push(`/admin/activities?${params.toString()}`);
    });
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    if (hideHotelControls) {
      fetchActivities(newPage, search, category);
    } else {
      startTransition(() => {
        const params = new URLSearchParams(searchParams);
        params.set("page", newPage.toString());
        router.push(`/admin/activities?${params.toString()}`);
      });
    }
  };

  const handleEdit = (activity: SelectActivity) => {
    setSelectedActivity(activity);
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (activity: SelectActivity) => {
    setActivityToDelete(activity);
    setIsDeleteDialogOpen(true);
  };

  const handleSave = async (data: InsertActivity | Partial<InsertActivity>) => {
    // If in dashboard context, force the fixed hotel ID
    const saveData = fixedHotelId ? { ...data, hotel_id: fixedHotelId } : data;

    if (selectedActivity) {
      const res = await updateActivityAction(selectedActivity.id, saveData);
      if (res.success) {
        toast.success("Activity updated successfully", { theme: "dark" });
        fetchActivities(currentPage, search, category);
      }
    } else {
      const res = await createActivityAction(saveData as InsertActivity);
      if (res.success) {
        toast.success("Activity updated successfully", { theme: "dark" });
        fetchActivities(1, search, category);
        setCurrentPage(1);
      }
    }
  };

  const handleConfirmDelete = async () => {
    if (activityToDelete) {
      const res = await deleteActivityAction(activityToDelete.id);
      if (res.success) {
        toast.success("Activity removed successfully", { theme: "dark" });
        fetchActivities(currentPage, search, category);
      }
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto p-6 min-h-screen bg-transparent">
      {/* Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center">
            <Compass className="mr-2 h-6 w-6" />
            Activities
          </h1>
          <p className="text-muted-foreground">
            Manage hotel activities and curated experiences for your guests
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Activity
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
            <CardTitle>Activities registry ({totalCount})</CardTitle>

            <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-4 sm:items-center">
              {/* Hotel Filter (admin only) */}
              {!hideHotelControls && hotels.length > 0 && (
                <Select
                  value={hotelQuery || "all"}
                  onValueChange={handleHotelChange}
                  disabled={isPending}
                >
                  <SelectTrigger className="w-45">
                    <SelectValue placeholder="All Hotels" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0F0F0F] border-white/10 text-gray-200">
                    <SelectItem value="all">All Hotels</SelectItem>
                    {hotels.map((hotel) => (
                      <SelectItem key={hotel.id} value={String(hotel.id)}>
                        {hotel.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Category Filter */}
              <Select
                value={category}
                onValueChange={(val) => handleCategoryChange(val)}
              >
                <SelectTrigger className="w-45">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent className="bg-[#0F0F0F] border-white/10 text-gray-200">
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="restaurants">Restaurants</SelectItem>
                  <SelectItem value="tours">Tours</SelectItem>
                  <SelectItem value="wellness">Wellness</SelectItem>
                  <SelectItem value="sports">Sports</SelectItem>
                  <SelectItem value="entertainment">Entertainment</SelectItem>
                  <SelectItem value="shopping">Shopping</SelectItem>
                  <SelectItem value="culture">Culture</SelectItem>
                  <SelectItem value="nature">Nature</SelectItem>
                </SelectContent>
              </Select>

              {/* Search */}
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search activities..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="pl-8 w-48"
                  />
                </div>
                <Button onClick={handleSearch} disabled={isPending} size="sm">
                  Search
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className={isPending ? "opacity-50 transition-all" : ""}>
            <ActivitiesList
              activities={activities}
              onEdit={handleEdit}
              onDelete={handleDeleteClick}
              hotels={hideHotelControls ? undefined : hotels}
            />
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * 9 + 1} to{" "}
            {Math.min(currentPage * 9, totalCount)} of {totalCount} results
          </p>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1 || isPending}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages || isPending}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <ActivityDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSave={handleSave}
        hotels={hideHotelControls ? undefined : hotels}
      />

      {selectedActivity && (
        <ActivityDialog
          isOpen={isEditDialogOpen}
          onClose={() => {
            setIsEditDialogOpen(false);
            setSelectedActivity(null);
          }}
          onSave={handleSave}
          activity={selectedActivity}
          hotels={hideHotelControls ? undefined : hotels}
        />
      )}

      <DeleteActivityDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setActivityToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        activityName={activityToDelete?.name || ""}
      />
    </div>
  );
}
