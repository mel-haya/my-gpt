"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";
import { SelectStaffRequest } from "@/lib/db-schema";
import { AlertTriangle } from "lucide-react";

interface DeleteRequestDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (id: number) => Promise<void>;
  request: SelectStaffRequest | null;
}

export function DeleteRequestDialog({
  isOpen,
  onClose,
  onConfirm,
  request,
}: DeleteRequestDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    if (!request) return;

    try {
      setIsDeleting(true);
      await onConfirm(request.id);
      onClose();
    } catch (error) {
      console.error("Failed to delete request", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete Request
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete the
            request from the system.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="rounded-md border bg-muted/50 p-3 space-y-1">
            <h4 className="font-medium">{request?.title}</h4>
            <p className="text-sm text-muted-foreground">
              {request?.description}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
