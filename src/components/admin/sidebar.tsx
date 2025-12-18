import { UserAvatar, useUser } from "@clerk/nextjs";
import { UsersIcon, FilesIcon, SettingsIcon, HomeIcon } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SidebarAdmin({
  activePage,
  setActivePage,
}: {
  activePage?: string;
  setActivePage?: (page: string) => void;
}) {
  const { user } = useUser();
  const router = useRouter();

  return (
    <div className="flex flex-col gap-2 w-60 bg-gray-200 dark:bg-neutral-900  h-screen">
      <div className="flex flex-col gap-4 items-center mt-8">
        <UserAvatar
          appearance={{
            elements: {
              avatarBox: {
                width: "80px",
                height: "80px",
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
        {/* Home Button */}
        <button
          className="mt-2 flex items-center gap-2 px-4 py-2 bg-white dark:bg-neutral-800 rounded hover:bg-gray-300 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
          onClick={() => router.push("/")}
        >
          <HomeIcon size={20} />
          Home
        </button>
      </div>
      <ul className="flex flex-col mt-8">
        <li
          className={`w-full px-4 py-2 hover:bg-gray-300 dark:hover:bg-neutral-700 cursor-pointer flex gap-2 items-center ${
            activePage === "users" ? "bg-gray-300 dark:bg-neutral-700" : ""
          }`}
          onClick={() => setActivePage && setActivePage("users")}
        >
          <UsersIcon size={20}/>
          Users
        </li>
        <li
          className={`w-full px-4 py-2 hover:bg-gray-300 dark:hover:bg-neutral-700 cursor-pointer flex gap-2 items-center ${
            activePage === "files" ? "bg-gray-300 dark:bg-neutral-700" : ""
          }`}
          onClick={() => setActivePage && setActivePage("files")}
        >
          <FilesIcon size={20}/>
          Files
        </li>
        <li
          className={`w-full px-4 py-2 hover:bg-gray-300 dark:hover:bg-neutral-700 cursor-pointer flex gap-2 items-center ${
            activePage === "settings" ? "bg-gray-300 dark:bg-neutral-700" : ""
          }`}
          onClick={() => setActivePage && setActivePage("settings")}
        >
          <SettingsIcon size={20}/>
          Settings
        </li>
      </ul>
    </div>
  );
}
