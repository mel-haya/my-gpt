"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "react-toastify";
import {
  createSystemPromptAction,
  updateSystemPromptAction,
} from "@/app/actions/systemPrompts";
import type { SelectSystemPrompt } from "@/lib/db-schema";

interface SystemPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  systemPrompt?: SelectSystemPrompt | null;
  onSuccess: () => void;
}

export default function SystemPromptDialog({
  open,
  onOpenChange,
  systemPrompt,
  onSuccess,
}: SystemPromptDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState(systemPrompt?.name || "");
  const [prompt, setPrompt] = useState(systemPrompt?.prompt || "");

  const isEdit = !!systemPrompt;

  // Update form fields when systemPrompt changes or dialog opens
  useEffect(() => {
    if (open) {
      if (systemPrompt) {
        setName(systemPrompt.name);
        setPrompt(systemPrompt.prompt);
      } else {
        resetForm();
      }
    }
  }, [systemPrompt, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !prompt.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsLoading(true);

    try {
      let result;

      if (isEdit) {
        result = await updateSystemPromptAction(systemPrompt.id, {
          name: name.trim(),
          prompt: prompt.trim(),
        });
      } else {
        result = await createSystemPromptAction({
          name: name.trim(),
          prompt: prompt.trim(),
        });
      }

      if (result.success) {
        toast.success(
          isEdit
            ? "System prompt updated successfully"
            : "System prompt created successfully"
        );

        onSuccess();
        onOpenChange(false);
        resetForm();
      } else {
        throw new Error(result.error || "Failed to save system prompt");
      }
    } catch (error) {
      console.error("Error saving system prompt:", error);
      if (error instanceof Error) {
        toast.error(error.message || "Failed to save system prompt");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setPrompt("");
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Dialog is closing
      if (!isLoading) {
        resetForm();
      }
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit System Prompt" : "Create New System Prompt"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the system prompt details below."
              : "Create a new system prompt for chatbot testing."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter a descriptive name for this prompt"
              disabled={isLoading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prompt">System Prompt *</Label>
            <Textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter the system prompt text..."
              className="min-h-[200px] font-mono"
              disabled={isLoading}
              required
            />
            <p className="text-xs text-muted-foreground">
              This prompt will be used as the system message when testing the
              chatbot.
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading
                ? isEdit
                  ? "Updating..."
                  : "Creating..."
                : isEdit
                ? "Update"
                : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
