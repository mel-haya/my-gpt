"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Pencil, Save, X } from "lucide-react";
import {
  updateSystemPromptAction,
  createSystemPromptAction,
} from "@/app/actions/systemPrompts";
import { updateTestProfileSystemPromptAction } from "@/app/actions/testProfiles";
import { toast } from "react-toastify";

interface ViewSystemPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  systemPromptId?: number | null;
  name?: string | null;
  prompt?: string | null;
  onPromptUpdated?: () => void;
  isDefault?: boolean;
  testProfileId?: number;
}

export default function ViewSystemPromptDialog({
  open,
  onOpenChange,
  systemPromptId,
  name,
  prompt,
  onPromptUpdated,
  isDefault,
  testProfileId,
}: ViewSystemPromptDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  useEffect(() => {
    if (open) {
      setCurrentPrompt(prompt || "");
      setIsEditing(false);
    }
  }, [open, prompt]);

  const handleSave = async () => {
    if (!systemPromptId) return;

    setIsSaving(true);
    try {
      const result = await updateSystemPromptAction(systemPromptId, {
        prompt: currentPrompt,
      });

      if (result.success) {
        toast.success("System prompt updated successfully");
        setIsEditing(false);
        setShowConfirmDialog(false);
        if (onPromptUpdated) {
          onPromptUpdated();
        }
      } else {
        toast.error(result.error || "Failed to update system prompt");
      }
    } catch (error) {
      console.error("Error updating system prompt:", error);
      toast.error("An error occurred while updating");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateCopy = async () => {
    if (!testProfileId) {
      toast.error("Cannot create copy: Missing test profile ID");
      return;
    }

    setIsSaving(true);
    try {
      // Append a short random string to ensure uniqueness as requested
      const uniqueSuffix = Math.random().toString(36).substring(2, 8);
      const newName = `Copy of ${name || "System Prompt"} - ${uniqueSuffix}`;

      // 1. Create the new system prompt
      const createResult = await createSystemPromptAction({
        name: newName,
        prompt: currentPrompt,
      });

      if (!createResult.success || !createResult.data) {
        throw new Error(
          createResult.error || "Failed to create system prompt copy",
        );
      }

      const newPromptId = createResult.data.id;

      // 2. Update the test profile to use the new prompt
      const updateProfileResult = await updateTestProfileSystemPromptAction(
        testProfileId,
        newPromptId,
      );

      if (!updateProfileResult.success) {
        throw new Error(
          updateProfileResult.error ||
            "Failed to update test profile with new prompt",
        );
      }

      toast.success(`Created "${newName}" and updated test session`);
      setIsEditing(false);
      setShowConfirmDialog(false);
      if (onPromptUpdated) {
        onPromptUpdated();
      }
    } catch (error) {
      console.error("Error creating copy:", error);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("An error occurred while creating a copy");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const onSaveClicked = () => {
    if (isDefault) {
      setShowConfirmDialog(true);
    } else {
      handleSave();
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!isSaving) onOpenChange(val);
      }}
    >
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between mr-8">
            <div>
              <DialogTitle>{name || "System Prompt"}</DialogTitle>
              <DialogDescription>
                {isEditing
                  ? "Edit the system prompt content."
                  : "Full content of the assigned system prompt."}
              </DialogDescription>
            </div>
            {!isEditing && systemPromptId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2"
              >
                <Pencil className="w-3 h-3" />
                Edit
              </Button>
            )}
          </div>
        </DialogHeader>
        <div className="mt-4 flex-1 min-h-0 flex flex-col gap-2">
          <Textarea
            value={currentPrompt}
            onChange={(e) => setCurrentPrompt(e.target.value)}
            readOnly={!isEditing}
            className={`h-full font-mono text-sm bg-neutral-900 border-neutral-700 text-neutral-100 resize-none ${isEditing ? "ring-2 ring-blue-500/20" : ""}`}
          />
        </div>
        {isEditing && (
          <DialogFooter className="mt-4">
            <Button
              variant="ghost"
              onClick={() => {
                setIsEditing(false);
                setCurrentPrompt(prompt || "");
              }}
              disabled={isSaving}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={onSaveClicked} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>

      {/* Confirmation Dialog for Default Prompts */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Default System Prompt?</DialogTitle>
            <DialogDescription>
              This is the default prompt used by the main chatbot to generate
              responses. Are you sure you want to edit it?
            </DialogDescription>
          </DialogHeader>
          <div className="bg-yellow-500/10 border border-yellow-500/50 p-4 rounded-md text-yellow-500 text-sm my-2">
            You can <strong>Edit Anyway</strong> to update the default prompt
            for everyone, or <strong>Create a Copy</strong> to save these
            changes as a new prompt.
          </div>
          <DialogFooter className="flex flex-col gap-2">
            <Button
              variant="secondary"
              onClick={handleCreateCopy}
              disabled={isSaving}
              className="w-full sm:w-auto"
            >
              Create a Copy
            </Button>
            <Button
              variant="destructive"
              onClick={handleSave}
              disabled={isSaving}
              className="w-full sm:w-auto"
            >
              Edit Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
