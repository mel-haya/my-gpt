"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Eye, EyeOff, ChevronDown, ChevronRight } from "lucide-react";
import {
  createTestProfileAction,
  getTestsForSelectionAction,
  getSystemPromptsForSelectionAction,
} from "@/app/actions/testProfiles";
import { getAvailableModels, type ModelOption } from "@/app/actions/models";
import type { SelectTest, SelectSystemPrompt } from "@/lib/db-schema";

interface CreateTestSessionModalProps {
  onSessionCreated?: () => void;
}

export default function CreateTestSessionModal({
  onSessionCreated,
}: CreateTestSessionModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [availableTests, setAvailableTests] = useState<SelectTest[]>([]);
  const [availableSystemPrompts, setAvailableSystemPrompts] = useState<
    SelectSystemPrompt[]
  >([]);
  const [availableModels, setAvailableModels] = useState<ModelOption[]>([]);

  // Form state
  const [name, setName] = useState("");
  const [selectedSystemPrompt, setSelectedSystemPrompt] = useState("");
  const [selectedTestIds, setSelectedTestIds] = useState<number[]>([]);
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [isTestSectionCollapsed, setIsTestSectionCollapsed] = useState(false);

  // Load data when modal opens
  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async () => {
    try {
      const [testsResult, systemPromptsResult, modelsResult] =
        await Promise.all([
          getTestsForSelectionAction(),
          getSystemPromptsForSelectionAction(),
          getAvailableModels(),
        ]);

      if (testsResult.success && testsResult.data) {
        setAvailableTests(testsResult.data);
      }

      if (systemPromptsResult.success && systemPromptsResult.data) {
        setAvailableSystemPrompts(systemPromptsResult.data);
      }

      setAvailableModels(modelsResult);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const handleTestSelection = (testId: number, checked: boolean) => {
    if (checked) {
      setSelectedTestIds((prev) => [...prev, testId]);
    } else {
      setSelectedTestIds((prev) => prev.filter((id) => id !== testId));
    }
  };

  const handleModelSelection = (modelId: string, checked: boolean) => {
    if (checked) {
      setSelectedModelIds((prev) => [...prev, modelId]);
    } else {
      setSelectedModelIds((prev) => prev.filter((id) => id !== modelId));
    }
  };

  const handleSelectAllTests = () => {
    setSelectedTestIds(availableTests.map((test) => test.id));
  };

  const handleDeselectAllTests = () => {
    setSelectedTestIds([]);
  };

  const resetForm = () => {
    setName("");
    setSelectedSystemPrompt("");
    setSelectedTestIds([]);
    setSelectedModelIds([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !selectedSystemPrompt || selectedTestIds.length === 0) {
      alert("Please fill in all required fields and select at least one test.");
      return;
    }

    if (selectedModelIds.length === 0) {
      alert("Please select at least one model.");
      return;
    }

    setLoading(true);

    try {
      const selectedSystemPromptObj = availableSystemPrompts.find(
        (sp) => sp.id.toString() === selectedSystemPrompt
      );
      if (!selectedSystemPromptObj) {
        alert("Selected system prompt not found");
        return;
      }

      const result = await createTestProfileAction({
        name: name.trim(),
        system_prompt_id: selectedSystemPromptObj.id,
        test_ids: selectedTestIds,
        model_configs: selectedModelIds,
      });

      if (result.success) {
        resetForm();
        setOpen(false);
        onSessionCreated?.();
      } else {
        alert(result.error || "Failed to create test session");
      }
    } catch (error) {
      console.error("Error creating test session:", error);
      alert("An error occurred while creating the test session");
    } finally {
      setLoading(false);
    }
  };

  const selectedSystemPromptObj = availableSystemPrompts.find(
    (sp) => sp.id.toString() === selectedSystemPrompt
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Test Session
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Create New Test Session</DialogTitle>
          <DialogDescription>
            Create a new test session to run multiple tests with different
            models and system prompts.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
          <form
            id="create-session-form"
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            {/* Session Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Session Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter session name"
                required
              />
            </div>

            {/* System Prompt Selection */}
            <div className="space-y-2">
              <Label htmlFor="system-prompt">System Prompt *</Label>
              <div className="flex gap-2">
                <Select
                  value={selectedSystemPrompt}
                  onValueChange={setSelectedSystemPrompt}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a system prompt" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSystemPrompts.map((prompt) => (
                      <SelectItem key={prompt.id} value={prompt.id.toString()}>
                        {prompt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedSystemPromptObj && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPreview(!showPreview)}
                    className="px-3"
                  >
                    {showPreview ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
              {selectedSystemPromptObj && showPreview && (
                <div className="p-3 bg-gray-50 rounded border">
                  <div className="text-xs text-gray-600 mb-2 font-medium">
                    Preview:
                  </div>
                  <pre className="text-sm text-gray-800 font-mono whitespace-pre-wrap overflow-wrap-break-word">
                    {selectedSystemPromptObj.prompt}
                  </pre>
                </div>
              )}
            </div>

            {/* Test Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label
                  className="flex items-center gap-2 cursor-pointer"
                  onClick={() =>
                    setIsTestSectionCollapsed(!isTestSectionCollapsed)
                  }
                >
                  {isTestSectionCollapsed ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  Select Tests *
                  <span className="text-sm text-gray-500 font-normal">
                    ({selectedTestIds.length} of {availableTests.length}{" "}
                    selected)
                  </span>
                </Label>
                {!isTestSectionCollapsed && availableTests.length > 0 && (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAllTests}
                      disabled={
                        selectedTestIds.length === availableTests.length
                      }
                    >
                      Select All
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDeselectAllTests}
                      disabled={selectedTestIds.length === 0}
                    >
                      Deselect All
                    </Button>
                  </div>
                )}
              </div>
              {!isTestSectionCollapsed && (
                <div className="border rounded-lg p-4 max-h-60 overflow-y-auto space-y-2">
                  {availableTests.length === 0 ? (
                    <p className="text-sm text-gray-500">No tests available</p>
                  ) : (
                    availableTests.map((test) => (
                      <div key={test.id} className="flex items-start space-x-2">
                        <Checkbox
                          id={`test-${test.id}`}
                          checked={selectedTestIds.includes(test.id)}
                          onCheckedChange={(checked) =>
                            handleTestSelection(test.id, checked as boolean)
                          }
                        />
                        <div className="flex-1">
                          <Label
                            htmlFor={`test-${test.id}`}
                            className="text-sm font-medium cursor-pointer"
                          >
                            {test.prompt.substring(0, 50)}
                            {test.prompt.length > 50 && "..."}
                          </Label>
                          <p className="text-xs text-gray-600 mt-1">
                            {test.expected_result.substring(0, 50)}
                            {test.expected_result.length > 50 && "..."}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Model Selection */}
            <div className="space-y-2">
              <Label>Select Models *</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    {selectedModelIds.length === 0
                      ? "Select models..."
                      : `${selectedModelIds.length} model${
                          selectedModelIds.length !== 1 ? "s" : ""
                        } selected`}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-full max-h-64 overflow-y-auto">
                  {availableModels.map((model) => (
                    <DropdownMenuCheckboxItem
                      key={model.id}
                      checked={selectedModelIds.includes(model.id)}
                      onCheckedChange={(checked) =>
                        handleModelSelection(model.id, checked as boolean)
                      }
                    >
                      {model.name} {model.premium && "(Premium)"}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              {selectedModelIds.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedModelIds.map((modelId) => {
                    const model = availableModels.find((m) => m.id === modelId);
                    return model ? (
                      <span
                        key={modelId}
                        className="inline-flex items-center px-2 py-1 rounded-md bg-blue-100 text-blue-800 text-xs font-medium"
                      >
                        {model.name}
                        <button
                          type="button"
                          onClick={() => handleModelSelection(modelId, false)}
                          className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-blue-200"
                        >
                          ×
                        </button>
                      </span>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          </form>
        </div>

        <DialogFooter className="mt-6 border-t pt-4">
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button type="submit" form="create-session-form" disabled={loading}>
            {loading ? "Creating..." : "Create Session"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
