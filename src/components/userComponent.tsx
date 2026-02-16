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

import { cn } from "@/lib/utils";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function isValidRole(role: unknown): role is Roles {
  return role === "admin" || role === "hotel_owner" || role === "hotel_staff";
}

interface UserComponentProps {
  showSignOut?: boolean;
  signInButton?: React.ReactNode;
  containerClassName?: string;
  className?: string; // wrapper class
  showName?: boolean;
}

export default function UserComponent({
  showSignOut = true,
  signInButton,
  containerClassName,
  className,
  showName = true,
}: UserComponentProps) {
  const { user, isLoaded } = useUser();
  const [role, setRole] = useState<Roles | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadRole = async () => {
      if (!isLoaded || !user) {
        setRole(null);
        return;
      }

      const maxAttempts = 4;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const currentRole = await getCurrentUserRole();
          if (!isMounted) return;

          if (isValidRole(currentRole)) {
            setRole(currentRole);
            return;
          }
        } catch {
          // Retry below.
        }

        if (attempt < maxAttempts) {
          await sleep(attempt * 120);
        }
      }

      if (isMounted) {
        setRole(null);
      }
    };

    loadRole();

    return () => {
      isMounted = false;
    };
  }, [isLoaded, user?.id]);

  const isAdmin = role === "admin";
  const isHotelStaff = role === "hotel_owner" || role === "hotel_staff";

  return (
    <div className={className}>
      <SignedIn>
        <div
          className={cn(
            "flex items-center",
            showSignOut ? "justify-between py-4 px-2" : "",
            containerClassName,
          )}
        >
          <div className="flex cursor-pointer items-center gap-3">
            <UserButton
              key={role ?? "loading"}
              showName={showName}
              appearance={{
                elements: {
                  userButtonOuterIdentifier: "order-2 pl-0",
                  avatarBox: "h-9 w-9",
                },
              }}
            >
              <UserButton.MenuItems>
                {isAdmin && (
                  <UserButton.Link
                    label="Admin Panel"
                    key={`admin-${role ?? "loading"}`}
                    labelIcon={<Gauge size={16} />}
                    href="/admin"
                  />
                )}
                {isHotelStaff && (
                  <UserButton.Link
                    label="Dashboard"
                    key={`dashboard-${role ?? "loading"}`}
                    labelIcon={<LayoutDashboard size={16} />}
                    href="/dashboard"
                  />
                )}
              </UserButton.MenuItems>
            </UserButton>
          </div>
          {showSignOut && (
            <div className="cursor-pointer">
              <SignOutButton>
                <LogOut size={20} className="inline mr-2" />
              </SignOutButton>
            </div>
          )}
        </div>
      </SignedIn>
      <SignedOut>
        <SignInButton mode="modal">
          {signInButton ? (
            signInButton
          ) : (
            <div className="flex w-full cursor-pointer items-center px-2 py-6 hover:bg-gray-200 dark:hover:bg-neutral-800">
              <LogIn size={20} className="inline mr-2" /> Sign In
            </div>
          )}
        </SignInButton>
      </SignedOut>
    </div>
  );
}
