"use client";

import { useState, useSyncExternalStore } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  inviteStaffByEmailAction,
  removeStaffFromHotelAction,
  updateStaffRoleAction,
} from "@/app/actions/hotels";
import { toast } from "react-toastify";
import type { SelectUser } from "@/lib/db-schema";
import DeleteDialog from "@/components/ui/DeleteDialog";

// useSyncExternalStore helpers for client-only rendering
const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

const roleLabels: Record<string, string> = {
  hotel_owner: "Owner",
  hotel_staff: "Staff",
};

// Client-only Select to avoid hydration mismatch with Radix UI
function RoleSelect({
  value,
  onValueChange,
}: {
  value: "hotel_owner" | "hotel_staff";
  onValueChange: (value: "hotel_owner" | "hotel_staff") => void;
}) {
  const isClient = useSyncExternalStore(
    emptySubscribe,
    getClientSnapshot,
    getServerSnapshot,
  );

  if (!isClient) {
    return (
      <div className="h-7 w-24 flex items-center px-2 text-xs border border-input rounded-md bg-transparent">
        {roleLabels[value]}
      </div>
    );
  }

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="h-7 w-24 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="hotel_staff">Staff</SelectItem>
        <SelectItem value="hotel_owner">Owner</SelectItem>
      </SelectContent>
    </Select>
  );
}

interface TeamManagementProps {
  hotelId: number;
  initialStaff: SelectUser[];
  currentUserId: string;
  currentUserRole?: string | null;
}

export default function TeamManagement({
  hotelId,
  initialStaff,
  currentUserId,
  currentUserRole,
}: TeamManagementProps) {
  const [staff, setStaff] = useState(initialStaff);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [staffToRemove, setStaffToRemove] = useState<SelectUser | null>(null);

  const isOwner = currentUserRole === "hotel_owner";

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    setIsLoading(true);
    try {
      const result = await inviteStaffByEmailAction(hotelId, inviteEmail);
      if (result.success) {
        toast.success("Staff member added successfully");
        setInviteEmail("");
        window.location.reload();
      } else {
        toast.error(result.error || "Failed to invite staff");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = (member: SelectUser) => {
    setStaffToRemove(member);
  };

  const confirmRemove = async () => {
    if (!staffToRemove) return;
    const result = await removeStaffFromHotelAction(hotelId, staffToRemove.id);
    if (result.success) {
      toast.success("Staff member removed");
      setStaff((prev) => prev.filter((u) => u.id !== staffToRemove.id));
      window.location.reload();
    } else {
      toast.error(result.error || "Failed to remove staff");
    }
  };

  const handleRoleChange = async (
    userId: string,
    newRole: "hotel_owner" | "hotel_staff",
  ) => {
    try {
      const result = await updateStaffRoleAction(hotelId, userId, newRole);
      if (result.success) {
        toast.success("Role updated");
        setStaff((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)),
        );
        window.location.reload();
      } else {
        toast.error(result.error || "Failed to update role");
      }
    } catch {
      toast.error("Error updating role");
    }
  };

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-neutral-700">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Team Members
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage your hotel staff
          </p>
        </div>
        <div className="text-xs font-medium px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full">
          {staff.length} Active
        </div>
      </div>

      <div className="space-y-4 mb-6">
        {staff.map((member) => (
          <div
            key={member.id}
            className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-700/50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-medium shadow-sm">
                {member.username.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {member.username}
                  {member.id === currentUserId && (
                    <span className="ml-2 text-[10px] uppercase tracking-wider text-gray-400 bg-gray-100 dark:bg-neutral-700 px-1.5 py-0.5 rounded">
                      You
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {member.email}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isOwner && member.id !== currentUserId ? (
                <>
                  <RoleSelect
                    value={
                      member.role === "hotel_owner"
                        ? "hotel_owner"
                        : "hotel_staff"
                    }
                    onValueChange={(value) =>
                      handleRoleChange(member.id, value)
                    }
                  />
                  <button
                    onClick={() => handleRemove(member)}
                    className="text-red-500 hover:text-red-600 p-1 opacity-100 transition-opacity"
                    title="Remove staff"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </>
              ) : (
                <div className="text-xs text-gray-400 dark:text-gray-500 capitalize">
                  {member.role === "hotel_owner" ? "Owner" : "Staff"}
                </div>
              )}
            </div>
          </div>
        ))}

        {staff.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-4 italic">
            No staff members yet.
          </p>
        )}
      </div>

      <form
        onSubmit={handleInvite}
        className="mt-4 pt-4 border-t border-gray-100 dark:border-neutral-700"
      >
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
          Invite New Member
        </label>
        <div className="flex gap-2">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="Enter email address..."
            className="flex-1 min-w-0 text-sm px-3 py-2 bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-gray-400"
            required
          />
          <button
            type="submit"
            disabled={isLoading || !inviteEmail}
            className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-black text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            {isLoading ? "Adding..." : "Invite"}
          </button>
        </div>
        <p className="mt-2 text-[10px] text-gray-400 dark:text-gray-500">
          * User must already be signed up to the platform.
        </p>
      </form>

      <DeleteDialog
        isOpen={!!staffToRemove}
        onClose={() => setStaffToRemove(null)}
        onConfirm={confirmRemove}
        title="Remove Staff Member"
        description={`Are you sure you want to remove ${staffToRemove?.username} from this hotel?`}
        confirmText="Remove"
      />
    </div>
  );
}
