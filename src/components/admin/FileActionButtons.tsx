"use client";

import { useState, useTransition } from "react";
import { Trash2, Eye, EyeOff } from "lucide-react";
import { deleteFileAction, toggleFileActiveAction } from "@/app/actions/files";

interface FileActionButtonsProps {
  fileId: number;
  fileName: string;
  active: boolean;
  onUpdate: () => void;
}

export default function FileActionButtons({ 
  fileId, 
  fileName, 
  active, 
  onUpdate 
}: FileActionButtonsProps) {
  const [isPending, startTransition] = useTransition();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = () => {
    startTransition(async () => {
      try {
        await deleteFileAction(fileId);
        onUpdate();
        setShowDeleteConfirm(false);
      } catch (error) {
        console.error("Error deleting file:", error);
        // You might want to add toast notification here
      }
    });
  };

  const handleToggleActive = () => {
    startTransition(async () => {
      try {
        await toggleFileActiveAction(fileId, !active);
        onUpdate();
      } catch (error) {
        console.error("Error updating file status:", error);
        // You might want to add toast notification here
      }
    });
  };

  if (showDeleteConfirm) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-red-600 dark:text-red-400">
          Delete &ldquo;{fileName.substring(0, 20)}{fileName.length > 20 ? '...' : ''}&rdquo;?
        </span>
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="px-2 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded disabled:opacity-50"
        >
          {isPending ? 'Deleting...' : 'Yes'}
        </button>
        <button
          onClick={() => setShowDeleteConfirm(false)}
          disabled={isPending}
          className="px-2 py-1 text-xs bg-neutral-500 hover:bg-neutral-600 text-white rounded disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleToggleActive}
        disabled={isPending}
        className={`p-1 rounded-md transition-colors disabled:opacity-50 ${
          active 
            ? 'bg-green-100 hover:bg-green-200 text-green-700 dark:bg-green-900/20 dark:hover:bg-green-900/30 dark:text-green-400'
            : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-neutral-400'
        }`}
        title={active ? 'Disable file' : 'Enable file'}
      >
        {active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
      </button>
      
      <button
        onClick={() => setShowDeleteConfirm(true)}
        disabled={isPending}
        className="p-1 bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/20 dark:hover:bg-red-900/30 dark:text-red-400 rounded-md transition-colors disabled:opacity-50"
        title="Delete file"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}