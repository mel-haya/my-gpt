import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserAvatar,
  useUser,
  SignOutButton,
  UserProfile,
  UserButton,
} from "@clerk/nextjs";

import { useState } from "react";

import { DotIcon, LogIn, LogOut } from "lucide-react";

export default function UserComponent() {
  const { user } = useUser();
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
                }
              }}
            />

            {/* {user && (
              <div className="flex items-center justify-between w-full">
                <span className="text-sm font-medium">
                  {user.firstName && user.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : user.firstName ||
                      user.lastName ||
                      user.username ||
                      user.emailAddresses[0]?.emailAddress}
                </span>
              </div>
            )} */}
          </div>
          <div className="cursor-pointer">
            <SignOutButton>
              <LogOut size={20} className="inline mr-2" />
            </SignOutButton>
          </div>
        </div>
      </SignedIn>
      <SignedOut>
        <SignInButton mode="modal">
          <div className="w-full cursor-pointer py-6 px-2 flex items-center hover:bg-gray-200 dark:hover:bg-neutral-800">
            <LogIn size={20} className="inline mr-2" /> Sign In
          </div>
        </SignInButton>
      </SignedOut>
    </header>
  );
}
