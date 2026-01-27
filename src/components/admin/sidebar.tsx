import { UserAvatar, useUser } from "@clerk/nextjs";
import {
  UsersIcon,
  FilesIcon,
  SettingsIcon,
  HistoryIcon,
  HomeIcon,
  FlaskConicalIcon,
  AtomIcon,
  BookOpenText,
  MessageSquareCode,
  ThumbsUp,
  Compass,
  ClipboardList,
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

export default function SidebarAdmin() {
  const { user } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    { label: "Home", path: "/", icon: HomeIcon },
    { label: "Users", path: "/admin/users", icon: UsersIcon },
    { label: "Files", path: "/admin/files", icon: FilesIcon },
    // { label: "Tests", path: "/admin/tests", icon: FlaskConicalIcon },
    { label: "Test Sessions", path: "/admin/sessions", icon: FlaskConicalIcon },
    { label: "Questions", path: "/admin/questions", icon: BookOpenText },
    {
      label: "System Prompts",
      path: "/admin/system-prompts",
      icon: MessageSquareCode,
    },
    { label: "Models", path: "/admin/models", icon: AtomIcon },
    { label: "Feedback", path: "/admin/feedback", icon: ThumbsUp },
    { label: "Activities", path: "/admin/activities", icon: Compass },
    { label: "Requests", path: "/admin/requests", icon: ClipboardList },
    { label: "History", path: "/admin/history", icon: HistoryIcon },
    // { label: "Settings", path: "/admin/settings", icon: SettingsIcon },
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
      <ul className="flex flex-col mt-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path;
          return (
            <li
              key={item.path}
              className={`w-full px-4 py-2 hover:bg-gray-300 dark:hover:bg-neutral-700 cursor-pointer flex gap-2 items-center ${
                isActive ? "bg-gray-300 dark:bg-neutral-700" : ""
              }`}
              onClick={() => router.push(item.path)}
            >
              <Icon size={20} />
              {item.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
