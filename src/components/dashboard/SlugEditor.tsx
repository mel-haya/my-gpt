"use client";

import { useState } from "react";
import { updateHotelSlugAction } from "@/app/actions/hotels";
import { toast } from "react-toastify";

interface SlugEditorProps {
  hotelId: number;
  initialSlug: string | null;
}

export default function SlugEditor({ hotelId, initialSlug }: SlugEditorProps) {
  const [slug, setSlug] = useState(initialSlug || "");
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleUpdate = async () => {
    setIsLoading(true);
    try {
      const result = await updateHotelSlugAction(hotelId, slug);
      if (result.success) {
        toast.success("Hotel slug updated successfully");
        setIsEditing(false);
      } else {
        toast.error(result.error || "Failed to update slug");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isEditing) {
    return (
      <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-neutral-700 h-full">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              Hotel URL Slug
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Your public hotel page address
            </p>
          </div>
          <button
            onClick={() => setIsEditing(true)}
            className="text-xs font-medium px-3 py-1.5 bg-gray-100 dark:bg-neutral-700 hover:bg-gray-200 dark:hover:bg-neutral-600 rounded-lg transition-colors text-gray-900 dark:text-white"
          >
            Edit Slug
          </button>
        </div>

        <div className="p-3 bg-gray-50 dark:bg-neutral-900 rounded-lg border border-gray-100 dark:border-neutral-700 flex items-center justify-between group">
          <code className="text-sm font-mono text-blue-600 dark:text-blue-400 truncate max-w-[200px]">
            /{slug || "..."}
          </code>
          <a
            href={`/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-400 hover:text-blue-500 transition-colors flex items-center gap-1"
          >
            <span className="hidden group-hover:inline">Open</span>
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-neutral-700 h-full">
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
          Edit Hotel URL Slug
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Choose a unique identifier for your hotel.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
            New Slug
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
              /
            </span>
            <input
              type="text"
              value={slug}
              onChange={(e) =>
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
              }
              className="w-full pl-6 pr-3 py-2 text-sm border border-gray-200 dark:border-neutral-700 rounded-lg bg-gray-50 dark:bg-neutral-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
              placeholder="my-hotel-name"
            />
          </div>
          <p className="text-[10px] text-gray-400 mt-1.5">
            Lowercase letters, numbers, and hyphens only.
          </p>
        </div>
        <div className="flex items-center gap-2 pt-2">
          <button
            onClick={handleUpdate}
            disabled={isLoading || !slug}
            className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs font-medium shadow-sm"
          >
            {isLoading ? "Saving..." : "Save"}
          </button>
          <button
            onClick={() => {
              setIsEditing(false);
              setSlug(initialSlug || "");
            }}
            disabled={isLoading}
            className="px-3 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700 rounded-lg transition-colors text-xs font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
