"use client";

import {
  SignedOut,
  SignInButton,
  SignUpButton,
} from "@clerk/nextjs";

import { Button } from "@/components/ui/button";

export default function Header() {
  return (
    <div className="flex w-full items-center px-4 py-6 text-white  shadow-md z-10">

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
