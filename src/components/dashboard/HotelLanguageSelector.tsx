"use client";

import { useState } from "react";
import { updateHotelLanguageAction } from "@/app/actions/hotels";
import { toast } from "react-toastify";

interface HotelLanguageSelectorProps {
  hotelId: number;
  initialLanguage: string;
}

const LANGUAGES = [
  { value: "english", label: "English" },
  { value: "french", label: "French" },
  { value: "spanish", label: "Spanish" },
  { value: "german", label: "German" },
  { value: "italian", label: "Italian" },
  { value: "portuguese", label: "Portuguese" },
  { value: "arabic", label: "Arabic" },
  { value: "chinese", label: "Chinese" },
  { value: "japanese", label: "Japanese" },
];

export default function HotelLanguageSelector({
  hotelId,
  initialLanguage,
}: HotelLanguageSelectorProps) {
  const [language, setLanguage] = useState(initialLanguage);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const currentLabel =
    LANGUAGES.find((l) => l.value === language)?.label || language;

  const handleUpdate = async () => {
    setIsLoading(true);
    try {
      const result = await updateHotelLanguageAction(hotelId, language);
      if (result.success) {
        toast.success("Staff language updated successfully");
        setIsEditing(false);
      } else {
        toast.error(result.error || "Failed to update language");
      }
    } catch {
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
              Staff Language
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Language for staff request notifications
            </p>
          </div>
          <button
            onClick={() => setIsEditing(true)}
            className="text-xs font-medium px-3 py-1.5 bg-gray-100 dark:bg-neutral-700 hover:bg-gray-200 dark:hover:bg-neutral-600 rounded-lg transition-colors text-gray-900 dark:text-white"
          >
            Change
          </button>
        </div>

        <div className="p-3 bg-gray-50 dark:bg-neutral-900 rounded-lg border border-gray-100 dark:border-neutral-700 flex items-center">
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {currentLabel}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-neutral-700 h-full">
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
          Change Staff Language
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Staff requests will be written in this language.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
            Select Language
          </label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-neutral-700 rounded-lg bg-gray-50 dark:bg-neutral-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 pt-2">
          <button
            onClick={handleUpdate}
            disabled={isLoading}
            className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs font-medium shadow-sm"
          >
            {isLoading ? "Saving..." : "Save"}
          </button>
          <button
            onClick={() => {
              setIsEditing(false);
              setLanguage(initialLanguage);
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
