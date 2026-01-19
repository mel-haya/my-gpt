"use client";

import { useState } from "react";
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
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Sparkles,
  MapPin,
  Tag,
  DollarSign,
  Compass,
} from "lucide-react";
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

interface ActivitiesPageClientProps {
  initialActivities: SelectActivity[];
  totalCount: number;
  initialPage: number;
  totalPages: number;
}

const CATEGORIES = [
  { id: "all", label: "All Experiences" },
  { id: "restaurants", label: "Restaurants & Dining" },
  { id: "tours", label: "Tours & Excursions" },
  { id: "wellness", label: "Spa & Wellness" },
  { id: "sports", label: "Sports & Outdoor" },
  { id: "entertainment", label: "Entertainment" },
  { id: "shopping", label: "Shopping" },
  { id: "culture", label: "Museums & Culture" },
  { id: "nature", label: "Parks & Nature" },
];

export function ActivitiesPageClient({
  initialActivities,
  totalCount,
  initialPage,
  totalPages,
}: ActivitiesPageClientProps) {
  const [activities, setActivities] =
    useState<SelectActivity[]>(initialActivities);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [isPending, startTransition] = useTransition();

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] =
    useState<SelectActivity | null>(null);
  const [activityToDelete, setActivityToDelete] =
    useState<SelectActivity | null>(null);

  const fetchActivities = async (page: number, s: string, c: string) => {
    startTransition(async () => {
      const result = await getActivitiesAction({
        page,
        search: s,
        category: c,
      });
      if (result.success && result.data) {
        setActivities(result.data.activities);
      }
    });
  };

  const handleSearch = () => {
    fetchActivities(1, search, category);
    setCurrentPage(1);
  };

  const handleCategoryChange = (val: string) => {
    setCategory(val);
    fetchActivities(1, search, val);
    setCurrentPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    fetchActivities(newPage, search, category);
  };

  const handleCreate = () => {
    setIsCreateDialogOpen(true);
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
    if (selectedActivity) {
      const res = await updateActivityAction(selectedActivity.id, data);
      if (res.success) {
        toast.success("Experience refined", { theme: "dark" });
        fetchActivities(currentPage, search, category);
      }
    } else {
      const res = await createActivityAction(data as InsertActivity);
      if (res.success) {
        toast.success("New experience curated", { theme: "dark" });
        fetchActivities(1, search, category);
        setCurrentPage(1);
      }
    }
  };

  const handleConfirmDelete = async () => {
    if (activityToDelete) {
      const res = await deleteActivityAction(activityToDelete.id);
      if (res.success) {
        toast.success("Experience removed", { theme: "dark" });
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
            Activities</h1>
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
              {/* Category Filter */}
              <Select
                value={category}
                onValueChange={(val) => handleCategoryChange(val)}
              >
                <SelectTrigger className="w-[180px]">
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
