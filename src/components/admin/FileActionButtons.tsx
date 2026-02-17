"use client";

import { useState, useTransition } from "react";
import { Trash2, MoreHorizontal, Download, Edit } from "lucide-react";
import { deleteFileAction } from "@/app/actions/files";
import DeleteDialog from "@/components/ui/DeleteDialog";
import EditFileDialog from "./EditFileDialog";
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
  hotels: { id: number; name: string }[];
  hotelId: number | null;
  onUpdate: () => void;
  canChangeHotel?: boolean;
}

export default function FileActionButtons({
  fileId,
  fileName,
  active,
  downloadUrl,
  hotels,
  hotelId,
  onUpdate,
  canChangeHotel = true,
}: FileActionButtonsProps) {
  const [isPending] = useTransition();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const handleDelete = async () => {
    await deleteFileAction(fileId);
    onUpdate();
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
          <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
            <Edit className="mr-2 h-4 w-4" />
            <span>Edit</span>
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

      <EditFileDialog
        isOpen={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        fileId={fileId}
        initialFileName={fileName}
        initialHotelId={hotelId}
        initialActive={active}
        hotels={hotels}
        onUpdate={onUpdate}
        canChangeHotel={canChangeHotel}
      />

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
