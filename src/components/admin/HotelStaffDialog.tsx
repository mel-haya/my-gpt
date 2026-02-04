"use client";

import { useState, useEffect, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getHotelStaffAction,
  getAvailableStaffForHotelAction,
  assignStaffToHotelAction,
  removeStaffFromHotelAction,
} from "@/app/actions/hotels";
import { SelectUser } from "@/lib/db-schema";
import { SelectHotel } from "@/lib/db-schema";
import { Loader2, Plus, Trash2, Users } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface HotelStaffDialogProps {
  hotel: SelectHotel;
}

export default function HotelStaffDialog({ hotel }: HotelStaffDialogProps) {
  const [open, setOpen] = useState(false);
  const [staff, setStaff] = useState<SelectUser[]>([]);
  const [availableStaff, setAvailableStaff] = useState<SelectUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [currentStaff, available] = await Promise.all([
        getHotelStaffAction(hotel.id),
        getAvailableStaffForHotelAction(hotel.id),
      ]);
      setStaff(currentStaff);
      setAvailableStaff(available);
    } catch (error) {
      console.error("Failed to fetch staff data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, hotel.id]);

  const handleAddStaff = () => {
    if (!selectedUserId) return;

    startTransition(async () => {
      try {
        await assignStaffToHotelAction(hotel.id, selectedUserId);
        setSelectedUserId("");
        await fetchData();
      } catch (error) {
        console.error("Failed to assign staff:", error);
      }
    });
  };

  const handleRemoveStaff = (userId: string) => {
    startTransition(async () => {
      try {
        await removeStaffFromHotelAction(hotel.id, userId);
        await fetchData();
      } catch (error) {
        console.error("Failed to remove staff:", error);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Users className="w-4 h-4 mr-2" />
          Manage Staff
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-125">
        <DialogHeader>
          <DialogTitle>Manage Staff - {hotel.name}</DialogTitle>
          <DialogDescription>
            Assign staff members to this hotel.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Add Staff Section */}
          <div className="flex gap-2 items-end">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Add Staff Member
              </label>
              <Select
                value={selectedUserId}
                onValueChange={setSelectedUserId}
                disabled={isPending || isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a user..." />
                </SelectTrigger>
                <SelectContent>
                  {availableStaff.length === 0 ? (
                    <div className="p-2 text-sm text-neutral-500 text-center">
                      No available users found
                    </div>
                  ) : (
                    availableStaff.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.username} ({user.email})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleAddStaff}
              disabled={!selectedUserId || isPending || isLoading}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <div className="border-t pt-4">
            <h4 className="mb-4 text-sm font-medium leading-none">
              Current Staff
            </h4>
            {isLoading ? (
              <div className="flex justify-center p-4">
                <Loader2 className="w-6 h-6 animate-spin text-neutral-500" />
              </div>
            ) : staff.length === 0 ? (
              <p className="text-sm text-neutral-500 text-center py-4">
                No staff assigned to this hotel.
              </p>
            ) : (
              <ScrollArea className="h-50 rounded-md border p-2">
                <div className="space-y-2">
                  {staff.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800"
                    >
                      <div>
                        <p className="text-sm font-medium">{user.username}</p>
                        <p className="text-xs text-neutral-500">{user.email}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveStaff(user.id)}
                        disabled={isPending}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
