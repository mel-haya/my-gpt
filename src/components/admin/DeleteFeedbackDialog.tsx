"use client";

import { deleteFeedbackAction } from "@/app/actions/feedback";
import { toast } from "react-toastify";
import DeleteDialog from "@/components/ui/DeleteDialog";

interface DeleteFeedbackDialogProps {
  feedbackId: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function DeleteFeedbackDialog({
  feedbackId,
  isOpen,
  onClose,
  onSuccess,
}: DeleteFeedbackDialogProps) {
  const handleDelete = async () => {
    const result = await deleteFeedbackAction(feedbackId);

    if (result.success) {
      toast.success("Feedback deleted successfully");
      onSuccess?.();
    } else {
      toast.error(result.error || "Failed to delete feedback");
      throw new Error(result.error || "Failed to delete feedback");
    }
  };

  return (
    <DeleteDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleDelete}
      title="Delete Feedback"
      description="Are you sure you want to delete this feedback entry? This action cannot be undone."
      confirmText="Delete"
    />
  );
}
