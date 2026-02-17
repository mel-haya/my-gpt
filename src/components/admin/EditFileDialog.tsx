"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateFileAction } from "@/app/actions/files";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useRouter } from "next/navigation";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";

interface EditFileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  fileId: number;
  initialFileName: string;
  initialHotelId: number | null;
  initialActive: boolean;
  hotels: { id: number; name: string }[];
  onUpdate: () => void;
  canChangeHotel?: boolean;
}

export default function EditFileDialog({
  isOpen,
  onClose,
  fileId,
  initialFileName,
  initialHotelId,
  initialActive,
  hotels,
  onUpdate,
  canChangeHotel = true,
}: EditFileDialogProps) {
  const [fileName, setFileName] = useState(initialFileName);
  const [hotelId, setHotelId] = useState<string>(
    initialHotelId ? initialHotelId.toString() : "none",
  );
  const [active, setActive] = useState(initialActive);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSave = () => {
    startTransition(async () => {
      try {
        await updateFileAction(fileId, {
          fileName,
          hotelId: canChangeHotel
            ? hotelId === "none"
              ? null
              : parseInt(hotelId)
            : initialHotelId, // Keep existing hotel if cannot change
          active,
        });
        onUpdate();
        onClose();
        router.refresh();
      } catch (error) {
        console.error("Error updating file:", error);
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>Edit File</DialogTitle>
          <DialogDescription>
            Make changes to the file details here. Click save when you&apos;re
            done.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="col-span-3"
            />
          </div>
          {canChangeHotel && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="hotel" className="text-right">
                Hotel
              </Label>
              <Select value={hotelId} onValueChange={setHotelId}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a hotel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {hotels.map((hotel) => (
                    <SelectItem key={hotel.id} value={hotel.id.toString()}>
                      {hotel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-4 items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="active" className="text-left">
                Active
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="w-60">
                      If disabled, this file will not be included in the
                      knowledge base for AI responses.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Switch
              id="active"
              checked={active}
              onCheckedChange={setActive}
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? "Saving..." : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
