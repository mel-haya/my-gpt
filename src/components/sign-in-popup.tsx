"use client";

import { Button } from "@/components/ui/button";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { X } from "lucide-react";

interface SignInPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SignInPopup({ isOpen, onClose }: SignInPopupProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 max-w-md w-full mx-4 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <X size={20} />
        </button>
        
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
            Sign In Required
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Please sign in to your account to start using My GPT. You&apos;ll be able to chat with AI, generate images, and access your conversation history.
          </p>
          
          <div className="flex flex-col gap-3">
            <SignInButton mode="modal">
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                Sign In
              </Button>
            </SignInButton>
            
            <SignUpButton mode="modal">
              <Button variant="outline" className="w-full">
                Create Account
              </Button>
            </SignUpButton>
          </div>
          
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
            It&apos;s free to get started!
          </p>
        </div>
      </div>
    </div>
  );
}