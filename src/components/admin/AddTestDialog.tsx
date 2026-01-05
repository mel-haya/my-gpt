"use client";

import { useState } from "react";
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
import { createTestAction } from "@/app/actions/tests";
import { Plus, Loader2 } from "lucide-react";

interface AddTestDialogProps {
  onTestAdded?: () => void;
}

export default function AddTestDialog({ onTestAdded }: AddTestDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    prompt: "",
    expected_result: "",
  });
  const [error, setError] = useState("");

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

      const result = await createTestAction({
        name: formData.name.trim(),
        prompt: formData.prompt.trim(),
        expected_result: formData.expected_result.trim(),
      });

      if (result.success) {
        // Reset form
        setFormData({
          name: "",
          prompt: "",
          expected_result: "",
        });
        setOpen(false);
        onTestAdded?.();
      } else {
        setError(result.error || "Failed to create test");
      }
    } catch (error) {
      console.error("Error creating test:", error);
      setError(error instanceof Error ? error.message : "Failed to create test");
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8">
          <Plus className="size-4" />
          Add Test
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add New Test</DialogTitle>
            <DialogDescription>
              Create a new test with a name, prompt, and expected result.
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
              {isSubmitting ? "Creating..." : "Create Test"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}