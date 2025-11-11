"use client";

import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  SignOutButton,
} from "@clerk/nextjs";

import { Button } from "@/components/ui/button";

export default function Header() {
  return (
    <div className="flex w-full items-center justify-between bg-neutral-900 px-4 py-6 text-white fixed top-0 left-0 right-0 shadow-md z-10 border-b border-neutral-800">
      <h1 className="text-2xl font-bold font-goldman">My GPT</h1>
      <SignedIn>
        <SignOutButton>
          <Button variant="outline">Sign Out</Button>
        </SignOutButton>
      </SignedIn>
      <SignedOut>
        <div className="flex gap-2">
          <SignInButton mode="modal">
            <Button variant="outline" className="text-lg cursor-pointer">Sign In</Button>
          </SignInButton>
          <SignUpButton mode="modal">
            <Button variant="outline" className="text-lg cursor-pointer">Sign Up</Button>
          </SignUpButton>
        </div>
      </SignedOut>
    </div>
  );
}
