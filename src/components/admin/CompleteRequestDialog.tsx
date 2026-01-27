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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { SelectStaffRequest } from "@/lib/db-schema";

interface CompleteRequestDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (id: number, note: string) => Promise<void>;
  request: SelectStaffRequest | null;
}

export function CompleteRequestDialog({
  isOpen,
  onClose,
  onConfirm,
  request,
}: CompleteRequestDialogProps) {
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!request) return;

    try {
      setIsSubmitting(true);
      await onConfirm(request.id, note);
      onClose();
      setNote("");
    } catch (error) {
      console.error("Failed to complete request", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Complete Request</DialogTitle>
          <DialogDescription>
            Mark this request as done. You can add an optional note for the
            record.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-1">
            <h4 className="font-medium">{request?.title}</h4>
            <p className="text-sm text-muted-foreground">
              {request?.description}
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="note">Completion Note (Optional)</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g., Room service delivered at 10:30 PM"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting ? "Completing..." : "Complete Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
