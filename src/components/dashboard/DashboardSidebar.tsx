"use client";

import { UserAvatar, useUser } from "@clerk/nextjs";
import {
  LayoutDashboard,
  FilesIcon,
  MessageSquare,
  ClipboardList,
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
};

export default function DashboardSidebar({ userRole }: DashboardSidebarProps) {
  const { user } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const fetchCount = () => {
      getPendingRequestsCountAction().then(setPendingCount);
    };

    fetchCount();

    window.addEventListener("staffRequestsUpdated", fetchCount);
    return () => {
      window.removeEventListener("staffRequestsUpdated", fetchCount);
    };
  }, [pathname]);

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
    </div>
  );
}
