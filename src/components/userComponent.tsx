import {
  SignedIn,
  SignedOut,
  SignInButton,
  useUser,
  SignOutButton,
  UserButton,
} from "@clerk/nextjs";

import { LogIn, LogOut, Gauge  } from "lucide-react";

export default function UserComponent() {
  const { user } = useUser();
  const isAdmin = user?.publicMetadata?.role === 'admin';
  
  return (
    <header>
      <SignedIn>
        <div className="flex justify-between  items-center py-4 px-2">
          <div className="flex items-center gap-3 cursor-pointer">
            <UserButton
              showName={true}
              appearance={{
                elements: {
                  userButtonOuterIdentifier: "order-2 pl-0",
                },
              }}
            >
              {isAdmin && (
                <UserButton.MenuItems>
                  <UserButton.Link
                    label="Admin Panel"
                    labelIcon={<Gauge size={16} />}
                    href="/admin"
                  />
                </UserButton.MenuItems>
              )}
            </UserButton>
          </div>
          <div className="cursor-pointer">
            <SignOutButton>
              <LogOut size={20} className="inline mr-2" />
            </SignOutButton>
          </div>
        </div>
      </SignedIn>
      <SignedOut>
        <SignInButton mode="modal" >
          <div className="w-full cursor-pointer py-6 px-2 flex items-center hover:bg-gray-200 dark:hover:bg-neutral-800">
            <LogIn size={20} className="inline mr-2" /> Sign In
          </div>
        </SignInButton>
      </SignedOut>
    </header>
  );
}
