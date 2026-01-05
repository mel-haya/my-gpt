"use client";

import { useTransition } from "react";
import { deleteTestAction, bulkDeleteTestsAction } from "@/app/actions/tests";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import { Loader2 } from "lucide-react";

interface DeleteTestDialogProps {
  testId: number;
  testName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  isBulkDelete?: boolean;
  bulkTestIds?: number[];
}

export default function DeleteTestDialog({
  testId,
  testName,
  isOpen,
  onClose,
  onSuccess,
  isBulkDelete = false,
  bulkTestIds = [],
}: DeleteTestDialogProps) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      try {
        let result;
        
        if (isBulkDelete && bulkTestIds.length > 0) {
          result = await bulkDeleteTestsAction(bulkTestIds);
        } else {
          result = await deleteTestAction(testId);
        }
        
        if (result.success) {
          if (isBulkDelete) {
            toast.success((result as { success: boolean; message?: string }).message || "Tests deleted successfully");
          } else {
            toast.success("Test deleted successfully");
          }
          onClose();
          onSuccess?.();
        } else {
          toast.error(result.error || "Failed to delete test(s)");
        }
      } catch (error) {
        console.error("Error deleting test(s):", error);
        toast.error("An unexpected error occurred");
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isBulkDelete ? "Delete Tests" : "Delete Test"}
          </DialogTitle>
          <DialogDescription>
            {isBulkDelete 
              ? `Are you sure you want to delete ${bulkTestIds.length} selected test(s)? This action cannot be undone.`
              : `Are you sure you want to delete the test "${testName}"? This action cannot be undone.`
            }
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            disabled={isPending}
            variant="destructive"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isBulkDelete ? "Deleting..." : "Deleting..."}
              </>
            ) : (
              isBulkDelete ? "Delete All" : "Delete"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}