"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Star
} from "lucide-react";
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
import { updateSystemPromptAction } from "@/app/actions/systemPrompts";
import SystemPromptDialog from "./SystemPromptDialog";
import DeleteSystemPromptDialog from "./DeleteSystemPromptDialog";
import SystemPromptsList from "./SystemPromptsList";
import type { SelectSystemPromptWithUser } from "@/services/systemPromptsService";

interface SystemPromptsDashboardProps {
  initialData: {
    systemPrompts: SelectSystemPromptWithUser[];
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

export default function SystemPromptsDashboard({ initialData, searchQuery }: SystemPromptsDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);

  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    promptId: number;
    promptName: string;
  }>({
    isOpen: false,
    promptId: 0,
    promptName: "",
  });

  const [setDefaultDialog, setSetDefaultDialog] = useState<{
    isOpen: boolean;
    promptId: number;
    promptName: string;
  }>({
    isOpen: false,
    promptId: 0,
    promptName: "",
  });

  const [editPrompt, setEditPrompt] = useState<SelectSystemPromptWithUser | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState<{
    isOpen: boolean;
    promptIds: number[];
  }>({ isOpen: false, promptIds: [] });

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
      router.push(`/admin/system-prompts?${params.toString()}`);
    });
  };

  const handlePageChange = (page: number) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      params.set("page", page.toString());
      router.push(`/admin/system-prompts?${params.toString()}`);
    });
  };

  const handleDeletePrompt = (promptId: number, promptName: string) => {
    setDeleteDialog({
      isOpen: true,
      promptId,
      promptName,
    });
  };

  const handleSetDefault = (promptId: number, promptName: string) => {
    setSetDefaultDialog({
      isOpen: true,
      promptId,
      promptName,
    });
  };

  const confirmSetDefault = async () => {
    try {
      const result = await updateSystemPromptAction(setDefaultDialog.promptId, {
        default: true,
      });

      if (result.success) {
        toast.success(`"${setDefaultDialog.promptName}" set as default system prompt`);
        handleDataRefresh();
      } else {
        toast.error(result.error || "Failed to set default system prompt");
      }
    } catch (error) {
      console.error("Error setting default system prompt:", error);
      toast.error("Failed to set default system prompt");
    } finally {
      setSetDefaultDialog({ isOpen: false, promptId: 0, promptName: "" });
    }
  };

  const handleEditPrompt = (prompt: SelectSystemPromptWithUser) => {
    setEditPrompt(prompt);
    setEditDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialog({
      isOpen: false,
      promptId: 0,
      promptName: "",
    });
  };

  const handleDataRefresh = () => {
    router.refresh();
    setSelectedRows(new Set());
  };

  const handleSelectRow = (promptId: number, checked: boolean) => {
    const newSelected = new Set(selectedRows);
    if (checked) {
      newSelected.add(promptId);
    } else {
      newSelected.delete(promptId);
    }
    setSelectedRows(newSelected);
  };

  const handleBulkDelete = () => {
    setBulkDeleteDialog({
      isOpen: true,
      promptIds: Array.from(selectedRows)
    });
  };

  const handleBulkDeleteSuccess = () => {
    setSelectedRows(new Set());
    handleDataRefresh();
  };

  const handleCloseBulkDeleteDialog = () => {
    setBulkDeleteDialog({ isOpen: false, promptIds: [] });
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Prompts</h1>
          <p className="text-muted-foreground">
            Manage system prompts for chatbot testing
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add System Prompt
          </Button>
        </div>
      </div>

      {/* Table */}
      <SystemPromptsList
        systemPrompts={initialData.systemPrompts}
        onEdit={handleEditPrompt}
        onDelete={handleDeletePrompt}
        onSetDefault={handleSetDefault}
        selectedRows={selectedRows}
        onSelectRow={handleSelectRow}
        searchQuery={localSearchQuery}
        onSearchChange={setLocalSearchQuery}
        onSearch={handleSearch}
        onBulkDelete={handleBulkDelete}
        isPending={isPending}
      />

      {/* Pagination */}
      {initialData.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((initialData.pagination.currentPage - 1) * 10) + 1} to{" "}
            {Math.min(
              initialData.pagination.currentPage * 10,
              initialData.pagination.totalCount
            )}{" "}
            of {initialData.pagination.totalCount} results
          </p>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(initialData.pagination.currentPage - 1)}
              disabled={!initialData.pagination.hasPreviousPage || isPending}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm">
              Page {initialData.pagination.currentPage} of {initialData.pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(initialData.pagination.currentPage + 1)}
              disabled={!initialData.pagination.hasNextPage || isPending}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <SystemPromptDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleDataRefresh}
      />

      <SystemPromptDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        systemPrompt={editPrompt}
        onSuccess={handleDataRefresh}
      />

      <DeleteSystemPromptDialog
        open={deleteDialog.isOpen}
        onOpenChange={handleCloseDeleteDialog}
        promptId={deleteDialog.promptId}
        promptName={deleteDialog.promptName}
        onSuccess={handleDataRefresh}
      />

      <DeleteSystemPromptDialog
        open={bulkDeleteDialog.isOpen}
        onOpenChange={handleCloseBulkDeleteDialog}
        promptId={bulkDeleteDialog.promptIds[0] || 0}
        promptIds={bulkDeleteDialog.promptIds}
        promptName={`${bulkDeleteDialog.promptIds.length} system prompts`}
        onSuccess={handleBulkDeleteSuccess}
        isBulkDelete
      />

      {/* Set Default Confirmation Dialog */}
      <Dialog
        open={setDefaultDialog.isOpen}
        onOpenChange={(open) => !open && setSetDefaultDialog({ isOpen: false, promptId: 0, promptName: "" })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Set Default System Prompt
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to set <strong>&quot;{setDefaultDialog.promptName}&quot;</strong> as the default system prompt for testing? This will replace the current default prompt.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSetDefaultDialog({ isOpen: false, promptId: 0, promptName: "" })}
            >
              Cancel
            </Button>
            <Button onClick={confirmSetDefault}>
              <Star className="h-4 w-4 mr-2" />
              Set as Default
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}