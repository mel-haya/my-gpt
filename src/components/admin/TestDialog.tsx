"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createTestAction, updateTestAction } from "@/app/actions/tests";
import { Plus, Loader2, Edit } from "lucide-react";
import type { TestWithUser } from "@/services/testsService";

interface TestDialogProps {
  mode: "add" | "edit";
  test?: TestWithUser;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function TestDialog({ mode, test, onSuccess, trigger, isOpen, onOpenChange }: TestDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    prompt: "",
    expected_result: "",
  });
  const [error, setError] = useState("");

  const isEditMode = mode === "edit";
  const open = isOpen !== undefined ? isOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  // Initialize form data when test prop changes or dialog opens
  useEffect(() => {
    if (isEditMode && test && open) {
      setFormData({
        name: test.name,
        prompt: test.prompt,
        expected_result: test.expected_result,
      });
    } else if (!isEditMode) {
      setFormData({
        name: "",
        prompt: "",
        expected_result: "",
      });
    }
  }, [isEditMode, test, open]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      // Validate form data
      if (!formData.name.trim()) {
        throw new Error("Test name is required");
      }
      if (!formData.prompt.trim()) {
        throw new Error("Prompt is required");
      }
      if (!formData.expected_result.trim()) {
        throw new Error("Expected result is required");
      }

      const testData = {
        name: formData.name.trim(),
        prompt: formData.prompt.trim(),
        expected_result: formData.expected_result.trim(),
      };

      let result;
      if (isEditMode && test) {
        result = await updateTestAction(test.id, testData);
      } else {
        result = await createTestAction(testData);
      }

      if (result.success) {
        // Reset form
        setFormData({
          name: "",
          prompt: "",
          expected_result: "",
        });
        setOpen(false);
        onSuccess?.();
      } else {
        setError(result.error || `Failed to ${isEditMode ? 'update' : 'create'} test`);
      }
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} test:`, error);
      setError(error instanceof Error ? error.message : `Failed to ${isEditMode ? 'update' : 'create'} test`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: "",
      prompt: "",
      expected_result: "",
    });
    setError("");
    setOpen(false);
  };

  const defaultTrigger = (
    <Button size="sm" className={isEditMode ? "h-8 w-8 p-0" : "h-8"} variant={isEditMode ? "ghost" : "default"}>
      {isEditMode ? <Edit className="size-4" /> : <><Plus className="size-4" />Add Test</>}
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* Only render trigger if not in controlled mode and trigger is needed */}
      {isOpen === undefined && (
        <DialogTrigger asChild>
          {trigger || defaultTrigger}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-150">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Edit Test" : "Add New Test"}</DialogTitle>
            <DialogDescription>
              {isEditMode 
                ? "Update the test information below."
                : "Create a new test with a name, prompt, and expected result."
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {error && (
              <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 p-3 rounded-md">
                {error}
              </div>
            )}
            
            <div className="grid gap-2">
              <Label htmlFor="test-name">Test Name</Label>
              <Input
                id="test-name"
                placeholder="Enter test name..."
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="test-prompt">Prompt</Label>
              <Textarea
                id="test-prompt"
                placeholder="Enter the test prompt..."
                value={formData.prompt}
                onChange={(e) => handleInputChange("prompt", e.target.value)}
                disabled={isSubmitting}
                rows={4}
                className="resize-none"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="test-expected-result">Expected Result</Label>
              <Textarea
                id="test-expected-result"
                placeholder="Enter the expected result..."
                value={formData.expected_result}
                onChange={(e) => handleInputChange("expected_result", e.target.value)}
                disabled={isSubmitting}
                rows={4}
                className="resize-none"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              {isSubmitting 
                ? `${isEditMode ? 'Updating' : 'Creating'}...` 
                : `${isEditMode ? 'Update' : 'Create'} Test`
              }
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}