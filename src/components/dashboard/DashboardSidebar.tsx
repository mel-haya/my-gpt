"use client";

import { UserAvatar, useUser, SignOutButton } from "@clerk/nextjs";
import {
  LayoutDashboard,
  FilesIcon,
  MessageSquare,
  ClipboardList,
  Home,
  LogOut,
  ThumbsUp,
  Compass,
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getPendingRequestsCountAction } from "@/app/actions/staff-requests";

type NavItem = {
  label: string;
  path: string;
  icon: React.ComponentType<{ size?: number }>;
  ownerOnly?: boolean;
};

type DashboardSidebarProps = {
  userRole: "hotel_owner" | "hotel_staff";
  hotelId: number | null;
  hotelSlug: string | null;
};

export default function DashboardSidebar({
  userRole,
  hotelId,
  hotelSlug,
}: DashboardSidebarProps) {
  const { user } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const fetchCount = () => {
      if (hotelId) {
        getPendingRequestsCountAction(hotelId).then(setPendingCount);
      }
    };

    fetchCount();

    window.addEventListener("staffRequestsUpdated", fetchCount);
    return () => {
      window.removeEventListener("staffRequestsUpdated", fetchCount);
    };
  }, [pathname, hotelId]);

  const navItems: NavItem[] = [
    {
      label: "Overview",
      path: "/dashboard",
      icon: LayoutDashboard,
      ownerOnly: true,
    },
    {
      label: "Files",
      path: "/dashboard/files",
      icon: FilesIcon,
      ownerOnly: true,
    },
    {
      label: "Activities",
      path: "/dashboard/activities",
      icon: Compass,
      ownerOnly: true,
    },
    {
      label: "Message Logs",
      path: "/dashboard/messages",
      icon: MessageSquare,
      ownerOnly: true,
    },
    {
      label: "Requests",
      path: "/dashboard/requests",
      icon: ClipboardList,
    },
    {
      label: "Feedback",
      path: "/dashboard/feedback",
      icon: ThumbsUp,
      ownerOnly: true,
    },
  ];

  const filteredNavItems = navItems.filter(
    (item) => !item.ownerOnly || userRole === "hotel_owner",
  );

  return (
    <div className="flex flex-col gap-2 min-w-60 bg-gray-200 dark:bg-neutral-900 h-screen">
      <div className="flex flex-col gap-4 items-center mt-4">
        <div className="flex gap-2 items-center w-full px-4">
          <UserAvatar
            appearance={{
              elements: {
                avatarBox: {
                  width: "40px",
                  height: "40px",
                },
              },
            }}
          />
          {user && (
            <div className="text-md font-medium text-center">
              {user.firstName && user.lastName
                ? `${user.firstName} ${user.lastName}`
                : user.firstName ||
                  user.lastName ||
                  user.username ||
                  user.emailAddresses[0]?.emailAddress}
            </div>
          )}
        </div>
      </div>

      <nav className="flex flex-col mt-2 overflow-y-auto">
        {/* Home Link */}
        <div
          className="w-full px-4 py-2 hover:bg-gray-300 dark:hover:bg-neutral-700 cursor-pointer flex gap-2 items-center"
          onClick={() => router.push(`/${hotelSlug || ""}`)}
        >
          <Home size={20} />
          <span className="flex-1">Home</span>
        </div>

        <div className="px-4 pt-4 pb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-500">
            Dashboard
          </span>
        </div>
        <ul className="flex flex-col">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;
            const isRequests = item.path === "/dashboard/requests";
            return (
              <li
                key={item.path}
                className={`w-full px-4 py-2 hover:bg-gray-300 dark:hover:bg-neutral-700 cursor-pointer flex gap-2 items-center ${
                  isActive ? "bg-gray-300 dark:bg-neutral-700" : ""
                }`}
                onClick={() => router.push(item.path)}
              >
                <Icon size={20} />
                <span className="flex-1">{item.label}</span>
                {isRequests && pendingCount > 0 && (
                  <span className="bg-red-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full min-w-5 text-center">
                    {pendingCount}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="mt-auto border-t border-gray-300 px-4 py-4 dark:border-neutral-800">
        <SignOutButton>
          <div className="flex w-full cursor-pointer items-center gap-2 rounded px-4 py-2 text-sm transition-colors hover:bg-gray-300 dark:hover:bg-neutral-700">
            <LogOut size={20} />
            <span>Sign Out</span>
          </div>
        </SignOutButton>
      </div>
    </div>
  );
}
