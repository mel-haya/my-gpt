"use client";

import { useState, useTransition } from "react";
import { Trash2, Eye, EyeOff, MoreHorizontal, Download } from "lucide-react";
import { deleteFileAction, toggleFileActiveAction } from "@/app/actions/files";
import DeleteDialog from "@/components/ui/DeleteDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface FileActionButtonsProps {
  fileId: number;
  fileName: string;
  active: boolean;
  downloadUrl: string | null;
  onUpdate: () => void;
}

export default function FileActionButtons({
  fileId,
  fileName,
  active,
  downloadUrl,
  onUpdate,
}: FileActionButtonsProps) {
  const [isPending, startTransition] = useTransition();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDelete = async () => {
    await deleteFileAction(fileId);
    onUpdate();
  };

  const handleToggleActive = () => {
    startTransition(async () => {
      try {
        await toggleFileActiveAction(fileId, !active);
        onUpdate();
      } catch (error) {
        console.error("Error updating file status:", error);
      }
    });
  };

  const handleDownload = () => {
    if (downloadUrl) {
      window.open(downloadUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            disabled={isPending}
          >
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={handleToggleActive}>
            {active ? (
              <>
                <EyeOff className="mr-2 h-4 w-4" />
                <span>Disable</span>
              </>
            ) : (
              <>
                <Eye className="mr-2 h-4 w-4" />
                <span>Enable</span>
              </>
            )}
          </DropdownMenuItem>

          {downloadUrl && (
            <DropdownMenuItem onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              <span>Download</span>
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => setShowDeleteDialog(true)}
            className="text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Delete File"
        description={`Are you sure you want to delete "${fileName}"? This action cannot be undone.`}
        confirmText="Delete File"
      />
    </>
  );
}
