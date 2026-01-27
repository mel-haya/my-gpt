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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { InsertStaffRequest } from "@/lib/db-schema";

interface StaffRequestDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: InsertStaffRequest) => Promise<void>;
}

export function StaffRequestDialog({
  isOpen,
  onClose,
  onConfirm,
}: StaffRequestDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] =
    useState<InsertStaffRequest["category"]>("other");
  const [urgency, setUrgency] =
    useState<InsertStaffRequest["urgency"]>("medium");
  const [roomNumber, setRoomNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await onConfirm({
        title,
        description,
        category,
        urgency,
        room_number: roomNumber ? parseInt(roomNumber) : null,
        status: "pending",
      });
      onClose();
      // Reset form
      setTitle("");
      setDescription("");
      setCategory("other");
      setUrgency("medium");
      setRoomNumber("");
    } catch (error) {
      console.error("Failed to create request", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Staff Request</DialogTitle>
          <DialogDescription>
            Manually create a new request for the staff.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Leaky faucet in 304"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={category}
              onValueChange={(val) =>
                setCategory(val as InsertStaffRequest["category"])
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reservation">Reservation</SelectItem>
                <SelectItem value="room_issue">Room Issue</SelectItem>
                <SelectItem value="room_service">Room Service</SelectItem>
                <SelectItem value="housekeeping">Housekeeping</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="concierge">Concierge</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="urgency">Urgency</Label>
            <Select
              value={urgency}
              onValueChange={(val) =>
                setUrgency(val as InsertStaffRequest["urgency"])
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select urgency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="roomNumber">Room Number (Optional)</Label>
            <Input
              id="roomNumber"
              type="number"
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              placeholder="e.g., 304"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description of the request..."
              required
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
