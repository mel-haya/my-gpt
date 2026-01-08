"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "react-toastify";
import { deleteSystemPromptAction, bulkDeleteSystemPromptsAction } from "@/app/actions/systemPrompts";

interface DeleteSystemPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  promptId: number;
  promptIds?: number[];
  promptName: string;
  onSuccess: () => void;
  isBulkDelete?: boolean;
}

export default function DeleteSystemPromptDialog({
  open,
  onOpenChange,
  promptId,
  promptIds = [],
  promptName,
  onSuccess,
  isBulkDelete = false,
}: DeleteSystemPromptDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    setIsLoading(true);

    try {
      let result;
      
      if (isBulkDelete) {
        // Bulk delete
        result = await bulkDeleteSystemPromptsAction(promptIds);
        
        if (result.success) {
          toast.success(`${promptIds.length} system prompts deleted successfully`);
        } else {
          throw new Error(result.error || "Failed to delete system prompts");
        }
      } else {
        // Single delete
        result = await deleteSystemPromptAction(promptId);
        
        if (result.success) {
          toast.success("System prompt deleted successfully");
        } else {
          throw new Error(result.error || "Failed to delete system prompt");
        }
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting system prompt:", error);
      if (error instanceof Error) {
        toast.error(error.message || "Failed to delete system prompt");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isBulkDelete ? "Delete System Prompts" : "Delete System Prompt"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isBulkDelete
              ? `Are you sure you want to delete ${promptIds.length} system prompts? This action cannot be undone.`
              : `Are you sure you want to delete "${promptName}"? This action cannot be undone.`
            }
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}