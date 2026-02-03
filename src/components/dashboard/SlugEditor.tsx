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
      <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 shadow-sm mb-6">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
          Hotel URL Slug
        </h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-900 dark:text-white">
            <code className="bg-gray-100 dark:bg-neutral-700 px-2 py-1 rounded">
              {slug || "No slug set"}
            </code>
            <a
              href={`/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-600 text-sm"
            >
              (Open Page)
            </a>
          </div>
          <button
            onClick={() => setIsEditing(true)}
            className="text-sm text-blue-500 hover:text-blue-600 font-medium"
          >
            Edit
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 shadow-sm mb-6">
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
        Edit Hotel URL Slug
      </h3>
      <div className="flex flex-col gap-4">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">New Slug</label>
          <input
            type="text"
            value={slug}
            onChange={(e) =>
              setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="e.g. my-hotel-name"
          />
          <p className="text-xs text-gray-500 mt-1">
            Lowercase letters, numbers, and hyphens only. Must be unique.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleUpdate}
            disabled={isLoading || !slug}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            {isLoading ? "Saving..." : "Save Changes"}
          </button>
          <button
            onClick={() => {
              setIsEditing(false);
              setSlug(initialSlug || "");
            }}
            disabled={isLoading}
            className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700 rounded-md transition-colors text-sm font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
