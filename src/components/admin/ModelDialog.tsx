"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  createModelAction,
  updateModelAction,
} from "@/app/actions/modelsAdmin";
import { toast } from "react-toastify";
import type { SelectModel } from "@/lib/db-schema";

interface ModelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  model?: SelectModel | null;
  onSuccess: () => void;
}

export default function ModelDialog({
  open,
  onOpenChange,
  model,
  onSuccess,
}: ModelDialogProps) {
  const [isPending, setIsPending] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    model_id: "",
    enabled: true,
    default: false,
  });

  useEffect(() => {
    if (model) {
      setFormData({
        name: model.name,
        model_id: model.model_id,
        enabled: model.enabled,
        default: model.default,
      });
    } else {
      setFormData({
        name: "",
        model_id: "",
        enabled: true,
        default: false,
      });
    }
  }, [model, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);

    try {
      const result = model
        ? await updateModelAction(model.id, formData)
        : await createModelAction(formData);

      if (result.success) {
        toast.success(
          model ? "Model updated successfully" : "Model created successfully",
        );
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error(result.error || "Failed to save model");
      }
    } catch (error) {
      console.error("Error saving model:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{model ? "Edit Model" : "Add Model"}</DialogTitle>
          <DialogDescription>
            {model
              ? "Edit the details of the AI model."
              : "Add a new AI model to the system."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Display Name</Label>
            <Input
              id="name"
              placeholder="e.g. GPT-5 Nano"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="model_id">Model ID (Provider)</Label>
            <Input
              id="model_id"
              placeholder="e.g. openai/gpt-5-nano"
              value={formData.model_id}
              onChange={(e) =>
                setFormData({ ...formData, model_id: e.target.value })
              }
              required
              disabled={!!model} // Prevent changing ID for existing models to avoid breaking history
            />
            {model && (
              <p className="text-xs text-muted-foreground">
                Model ID cannot be changed once created.
              </p>
            )}
          </div>
          <div className="flex items-center justify-between space-x-2">
            <label htmlFor="enabled" className="flex flex-col space-y-1">
              <span>Enabled</span>
              <span className="font-normal text-xs text-muted-foreground">
                Available for use in chat
              </span>
            </label>
            <Checkbox
              id="enabled"
              checked={formData.enabled}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, enabled: checked as boolean })
              }
            />
          </div>
          <div className="flex items-center justify-between space-x-2">
            <label htmlFor="default" className="flex flex-col space-y-1">
              <span>Default Model</span>
              <span className="font-normal text-xs text-muted-foreground">
                Use this model by default for new chats
              </span>
            </label>
            <Checkbox
              id="default"
              checked={formData.default}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, default: checked as boolean })
              }
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? "Saving..."
                : model
                  ? "Save Changes"
                  : "Create Model"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
