"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  deleteModelAction,
  bulkDeleteModelsAction,
} from "@/app/actions/modelsAdmin";
import { toast } from "react-toastify";
import { AlertTriangle } from "lucide-react";

interface DeleteModelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modelId: number;
  modelName: string;
  modelIds?: number[]; // For bulk delete
  isBulkDelete?: boolean;
  onSuccess: () => void;
}

export default function DeleteModelDialog({
  open,
  onOpenChange,
  modelId,
  modelName,
  modelIds = [],
  isBulkDelete = false,
  onSuccess,
}: DeleteModelDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      if (isBulkDelete) {
        const result = await bulkDeleteModelsAction(modelIds);
        if (result.success) {
          toast.success(`Successfully deleted ${result.data} models`);
          onSuccess();
          onOpenChange(false);
        } else {
          toast.error(result.error || "Failed to delete models");
        }
      } else {
        const result = await deleteModelAction(modelId);
        if (result.success) {
          toast.success(`"${modelName}" deleted successfully`);
          onSuccess();
          onOpenChange(false);
        } else {
          toast.error(result.error || "Failed to delete model");
        }
      }
    } catch (error) {
      console.error("Error deleting model:", error);
      toast.error("Failed to delete model");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {isBulkDelete ? "Delete Models" : "Delete Model"}
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete{" "}
            <strong>&quot;{modelName}&quot;</strong>? This action cannot be
            undone.
            <br />
            <br />
            Stats associated with this model (costs, scores) will remain in
            historical test results, but you won&apos;t be able to select this
            model anymore.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
