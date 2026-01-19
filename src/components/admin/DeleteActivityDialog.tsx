"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle } from "lucide-react";
import React from "react";

interface DeleteActivityDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  activityName: string;
}

export function DeleteActivityDialog({
  isOpen,
  onClose,
  onConfirm,
  activityName,
}: DeleteActivityDialogProps) {
  const [loading, setLoading] = React.useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error("Delete failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader className="mb-4">
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Supprimer l&apos;activité
          </DialogTitle>
          <div className="mt-2">
            <p className="text-muted-foreground text-sm">
              Êtes-vous sûr de vouloir supprimer &quot;{activityName}&quot; du
              registre de l&apos;hôtel ?
            </p>
            <p className="text-xs text-destructive/70 mt-4 leading-relaxed font-medium">
              Cette action est irréversible et supprimera toutes les données
              associées.
            </p>
          </div>
        </DialogHeader>

        <DialogFooter className="mt-6 gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="animate-spin h-4 w-4 mr-2" />
            ) : (
              "Supprimer définitivement"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
