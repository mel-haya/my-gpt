"use client";

import { UserAvatar, useUser, SignOutButton } from "@clerk/nextjs";
import {
  UsersIcon,
  FilesIcon,
  HistoryIcon,
  HomeIcon,
  FlaskConicalIcon,
  AtomIcon,
  BookOpenText,
  MessageSquareCode,
  ThumbsUp,
  Activity,
  ClipboardList,
  Building,
  LogOut,
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getPendingRequestsCountAction } from "@/app/actions/staff-requests";

export default function SidebarAdmin() {
  const { user } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const fetchCount = () => {
      getPendingRequestsCountAction().then(setPendingCount);
    };

    fetchCount();

    // Listen for custom event when requests are updated
    window.addEventListener("staffRequestsUpdated", fetchCount);
    return () => {
      window.removeEventListener("staffRequestsUpdated", fetchCount);
    };
  }, [pathname]);

  const navSections = [
    {
      items: [{ label: "Home", path: "/", icon: HomeIcon }],
    },
    {
      category: "Management",
      items: [
        { label: "Users", path: "/admin/users", icon: UsersIcon },
        { label: "Hotels", path: "/admin/hotels", icon: Building },
        { label: "Files", path: "/admin/files", icon: FilesIcon },
        { label: "Models", path: "/admin/models", icon: AtomIcon },
        {
          label: "System Prompts",
          path: "/admin/system-prompts",
          icon: MessageSquareCode,
        },
      ],
    },
    {
      category: "Testing",
      items: [
        {
          label: "Test Sessions",
          path: "/admin/sessions",
          icon: FlaskConicalIcon,
        },
        { label: "Questions", path: "/admin/questions", icon: BookOpenText },
      ],
    },
    {
      category: "Operations",
      items: [
        { label: "Requests", path: "/admin/requests", icon: ClipboardList },
        { label: "Feedback", path: "/admin/feedback", icon: ThumbsUp },
        { label: "History", path: "/admin/history", icon: HistoryIcon },
        { label: "Activities", path: "/admin/activities", icon: Activity },
      ],
    },
  ];

  return (
    <div className="flex flex-col gap-2 min-w-60 bg-gray-200 dark:bg-neutral-900  h-screen">
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
        {navSections.map((section, sectionIdx) => (
          <div key={section.category ?? sectionIdx}>
            {section.category && (
              <div className="px-4 pt-4 pb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-neutral-500">
                  {section.category}
                </span>
              </div>
            )}
            <ul className="flex flex-col">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.path;
                const isRequests = item.path === "/admin/requests";
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
                      <span className="bg-red-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                        {pendingCount}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="mt-auto px-4 py-4 border-t border-gray-300 dark:border-neutral-700">
        <SignOutButton>
          <button className="flex items-center gap-2 w-full px-4 py-2 hover:bg-gray-300 dark:hover:bg-neutral-700 rounded cursor-pointer text-sm">
            <LogOut size={18} />
            Sign Out
          </button>
        </SignOutButton>
      </div>
    </div>
  );
}
