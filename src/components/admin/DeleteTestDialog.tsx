"use client";

import { deleteTestAction, bulkDeleteTestsAction } from "@/app/actions/tests";
import { toast } from "react-toastify";
import DeleteDialog from "@/components/ui/DeleteDialog";

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
  const handleDelete = async () => {
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
      onSuccess?.();
    } else {
      toast.error(result.error || "Failed to delete test(s)");
      throw new Error(result.error || "Failed to delete test(s)");
    }
  };

  const title = isBulkDelete ? "Delete Tests" : "Delete Test";
  const description = isBulkDelete 
    ? `Are you sure you want to delete ${bulkTestIds.length} selected test(s)? This action cannot be undone.`
    : `Are you sure you want to delete the test "${testName}"? This action cannot be undone.`;
  const confirmText = isBulkDelete ? "Delete All" : "Delete";

  return (
    <DeleteDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleDelete}
      title={title}
      description={description}
      confirmText={confirmText}
    />
  );
}
