"use client";

import {
  SignedIn,
  SignedOut,
  SignInButton,
  useUser,
  SignOutButton,
  UserButton,
} from "@clerk/nextjs";

import { LogIn, LogOut, Gauge, LayoutDashboard } from "lucide-react";
import { useEffect, useState } from "react";
import { getCurrentUserRole } from "@/app/actions/users";
import { Roles } from "@/types/globals";

export default function UserComponent() {
  const { user, isLoaded } = useUser();
  const [role, setRole] = useState<Roles | null>(null);

  useEffect(() => {
    if (isLoaded && user) {
      getCurrentUserRole().then(setRole);
    }
  }, [isLoaded, user]);

  const isAdmin = role === "admin";
  const isHotelStaff = role === "hotel_owner" || role === "hotel_staff";

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
              <UserButton.MenuItems>
                {isAdmin && (
                  <UserButton.Link
                    label="Admin Panel"
                    labelIcon={<Gauge size={16} />}
                    href="/admin"
                  />
                )}
                {isHotelStaff && (
                  <UserButton.Link
                    label="Dashboard"
                    labelIcon={<LayoutDashboard size={16} />}
                    href="/dashboard"
                  />
                )}
              </UserButton.MenuItems>
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
        <SignInButton mode="modal">
          <div className="w-full cursor-pointer py-6 px-2 flex items-center hover:bg-gray-200 dark:hover:bg-neutral-800">
            <LogIn size={20} className="inline mr-2" /> Sign In
          </div>
        </SignInButton>
      </SignedOut>
    </header>
  );
}
