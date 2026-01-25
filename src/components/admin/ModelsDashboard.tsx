"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "react-toastify";
import { updateModelAction } from "@/app/actions/modelsAdmin";
import ModelDialog from "./ModelDialog";
import DeleteModelDialog from "./DeleteModelDialog";
import ModelsList from "./ModelsList";
import type { SelectModelWithStats } from "@/services/modelsService";

interface ModelsDashboardProps {
  initialData: {
    models: SelectModelWithStats[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalCount: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  };
  searchQuery: string;
}

export default function ModelsDashboard({
  initialData,
  searchQuery,
}: ModelsDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
  const [sortBy, setSortBy] = useState<
    "name" | "created_at" | "score" | "cost" | "tokens"
  >("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    modelId: number;
    modelName: string;
  }>({
    isOpen: false,
    modelId: 0,
    modelName: "",
  });

  const [setDefaultDialog, setSetDefaultDialog] = useState<{
    isOpen: boolean;
    modelId: number;
    modelName: string;
  }>({
    isOpen: false,
    modelId: 0,
    modelName: "",
  });

  const [editModel, setEditModel] = useState<SelectModelWithStats | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState<{
    isOpen: boolean;
    modelIds: number[];
  }>({ isOpen: false, modelIds: [] });

  // Keep local search query in sync with prop
  useEffect(() => {
    setLocalSearchQuery(searchQuery);
  }, [searchQuery]);

  const handleSearch = () => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      if (localSearchQuery.trim()) {
        params.set("search", localSearchQuery);
      } else {
        params.delete("search");
      }
      params.delete("page"); // Reset to first page
      // Reset sort on search
      router.push(
        `/admin/models?${params.toString()}&sortBy=${sortBy}&sortOrder=${sortOrder}`,
      );
    });
  };

  const handleSort = (
    column: "name" | "created_at" | "score" | "cost" | "tokens",
  ) => {
    const newOrder = sortBy === column && sortOrder === "desc" ? "asc" : "desc";
    setSortBy(column);
    setSortOrder(newOrder);

    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      params.set("sortBy", column);
      params.set("sortOrder", newOrder);
      router.push(`/admin/models?${params.toString()}`);
    });
  };

  const handlePageChange = (page: number) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      params.set("page", page.toString());
      if (sortBy) params.set("sortBy", sortBy);
      if (sortOrder) params.set("sortOrder", sortOrder);
      router.push(`/admin/models?${params.toString()}`);
    });
  };

  const handleDeleteModel = (modelId: number, modelName: string) => {
    setDeleteDialog({
      isOpen: true,
      modelId,
      modelName,
    });
  };

  const handleSetDefault = (modelId: number, modelName: string) => {
    setSetDefaultDialog({
      isOpen: true,
      modelId,
      modelName,
    });
  };

  const confirmSetDefault = async () => {
    try {
      const result = await updateModelAction(setDefaultDialog.modelId, {
        default: true,
      });

      if (result.success) {
        toast.success(`"${setDefaultDialog.modelName}" set as default model`);
        handleDataRefresh();
      } else {
        toast.error(result.error || "Failed to set default model");
      }
    } catch (error) {
      console.error("Error setting default model:", error);
      toast.error("Failed to set default model");
    } finally {
      setSetDefaultDialog({ isOpen: false, modelId: 0, modelName: "" });
    }
  };

  const handleEditModel = (model: SelectModelWithStats) => {
    setEditModel(model);
    setEditDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialog({
      isOpen: false,
      modelId: 0,
      modelName: "",
    });
  };

  const handleDataRefresh = () => {
    router.refresh();
    setSelectedRows(new Set());
  };

  const handleSelectRow = (modelId: number, checked: boolean) => {
    const newSelected = new Set(selectedRows);
    if (checked) {
      newSelected.add(modelId);
    } else {
      newSelected.delete(modelId);
    }
    setSelectedRows(newSelected);
  };

  const handleBulkDelete = () => {
    setBulkDeleteDialog({
      isOpen: true,
      modelIds: Array.from(selectedRows),
    });
  };

  const handleBulkDeleteSuccess = () => {
    setSelectedRows(new Set());
    handleDataRefresh();
  };

  const handleCloseBulkDeleteDialog = () => {
    setBulkDeleteDialog({ isOpen: false, modelIds: [] });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(new Set(initialData.models.map((m) => m.id)));
    } else {
      setSelectedRows(new Set());
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Models</h1>
          <p className="text-muted-foreground">
            Manage available AI models, set defaults, and view usage stats
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Model
          </Button>
        </div>
      </div>

      {/* Table */}
      <ModelsList
        models={initialData.models}
        onEdit={handleEditModel}
        onDelete={handleDeleteModel}
        onSetDefault={handleSetDefault}
        selectedRows={selectedRows}
        onSelectRow={handleSelectRow}
        searchQuery={localSearchQuery}
        onSearchChange={setLocalSearchQuery}
        onSearch={handleSearch}
        onBulkDelete={handleBulkDelete}
        isPending={isPending}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
        selectAll={
          initialData.models.length > 0 &&
          selectedRows.size === initialData.models.length
        }
        onSelectAll={handleSelectAll}
      />

      {/* Pagination */}
      {initialData.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(initialData.pagination.currentPage - 1) * 10 + 1} to{" "}
            {Math.min(
              initialData.pagination.currentPage * 10,
              initialData.pagination.totalCount,
            )}{" "}
            of {initialData.pagination.totalCount} results
          </p>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                handlePageChange(initialData.pagination.currentPage - 1)
              }
              disabled={!initialData.pagination.hasPreviousPage || isPending}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm">
              Page {initialData.pagination.currentPage} of{" "}
              {initialData.pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                handlePageChange(initialData.pagination.currentPage + 1)
              }
              disabled={!initialData.pagination.hasNextPage || isPending}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <ModelDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleDataRefresh}
      />

      <ModelDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        model={editModel}
        onSuccess={handleDataRefresh}
      />

      <DeleteModelDialog
        open={deleteDialog.isOpen}
        onOpenChange={handleCloseDeleteDialog}
        modelId={deleteDialog.modelId}
        modelName={deleteDialog.modelName}
        onSuccess={handleDataRefresh}
      />

      <DeleteModelDialog
        open={bulkDeleteDialog.isOpen}
        onOpenChange={handleCloseBulkDeleteDialog}
        modelId={bulkDeleteDialog.modelIds[0] || 0}
        modelIds={bulkDeleteDialog.modelIds}
        modelName={`${bulkDeleteDialog.modelIds.length} models`}
        onSuccess={handleBulkDeleteSuccess}
        isBulkDelete
      />

      {/* Set Default Confirmation Dialog */}
      <Dialog
        open={setDefaultDialog.isOpen}
        onOpenChange={(open) =>
          !open &&
          setSetDefaultDialog({ isOpen: false, modelId: 0, modelName: "" })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Set Default Model
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to set{" "}
              <strong>&quot;{setDefaultDialog.modelName}&quot;</strong> as the
              default model? This will be used for all new chat sessions where
              no specific model is requested.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setSetDefaultDialog({
                  isOpen: false,
                  modelId: 0,
                  modelName: "",
                })
              }
            >
              Cancel
            </Button>
            <Button
              onClick={confirmSetDefault}
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              <Star className="h-4 w-4 mr-2 fill-current" />
              Set as Default
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
