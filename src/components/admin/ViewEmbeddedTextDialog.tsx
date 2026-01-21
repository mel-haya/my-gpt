"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface ViewEmbeddedTextDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  text: string | null;
  activityName: string;
}

export default function ViewEmbeddedTextDialog({
  open,
  onOpenChange,
  text,
  activityName,
}: ViewEmbeddedTextDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Embedded Text</DialogTitle>
          <DialogDescription>
            Embedded text content for &quot;{activityName}&quot; which is valid
            for context search.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 flex-1 min-h-0">
          <Textarea
            value={text || "No embedded text available."}
            readOnly
            className="h-[400px] font-mono text-sm bg-neutral-900 border-neutral-700 text-neutral-100 resize-none"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
