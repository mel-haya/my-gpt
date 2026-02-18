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
import {
  Plus,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  Trash2,
  Edit,
  Loader2,
} from "lucide-react";
import {
  createTestProfileAction,
  updateTestProfileAction,
  getTestsForSelectionAction,
  getSystemPromptsForSelectionAction,
  getAllHotelsForSelectionAction,
} from "@/app/actions/testProfiles";
import type { ModelOption } from "@/app/actions/models";
import type { SelectTest, SelectSystemPrompt } from "@/lib/db-schema";
import type { DetailedTestProfile } from "@/services/testProfilesService";

interface TestSessionModalProps {
  initialData?: DetailedTestProfile;
  onSuccess?: () => void;
  availableModels: ModelOption[];
}

export default function TestSessionModal({
  initialData,
  onSuccess,
  availableModels: propAvailableModels,
}: TestSessionModalProps) {
  const isEditMode = !!initialData;
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [availableTests, setAvailableTests] = useState<SelectTest[]>([]);
  const [availableSystemPrompts, setAvailableSystemPrompts] = useState<
    SelectSystemPrompt[]
  >([]);
  const [availableModels, setAvailableModels] = useState<ModelOption[]>(
    propAvailableModels || [],
  );
  const [availableHotels, setAvailableHotels] = useState<
    { id: number; name: string }[]
  >([]);

  // Form state
  const [name, setName] = useState("");
  const [selectedSystemPrompt, setSelectedSystemPrompt] = useState("");
  const [selectedTestIds, setSelectedTestIds] = useState<number[]>([]);
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);
  const [manualTests, setManualTests] = useState<
    { prompt: string; expected_result: string }[]
  >([]);
  const [newManualPrompt, setNewManualPrompt] = useState("");
  const [newManualExpected, setNewManualExpected] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [isTestSectionCollapsed, setIsTestSectionCollapsed] = useState(false);
  const [selectedHotelId, setSelectedHotelId] = useState<string>("");

  // Update internal state if prop changes
  useEffect(() => {
    if (propAvailableModels) {
      setAvailableModels(propAvailableModels);
    }
  }, [propAvailableModels]);

  // Load data when modal opens or initialData changes
  useEffect(() => {
    if (open) {
      loadData();
      if (initialData) {
        populateForm(initialData);
      } else {
        resetForm();
      }
    }
  }, [open, initialData]);

  const populateForm = (data: DetailedTestProfile) => {
    setName(data.name);
    setSelectedSystemPrompt(
      data.system_prompt_id ? data.system_prompt_id.toString() : "",
    );
    setSelectedTestIds(
      data.tests.filter((t) => !t.is_manual).map((t) => Number(t.test_id)),
    );
    setSelectedModelIds(data.models.map((m) => m.model_name)); // Assuming model_name maps to ID or we need ID.
    // Wait, the EditModal used `model_name` as the selected ID?
    // Let's check `EditTestSessionModal.tsx`:
    // setSelectedModels(profile.models.map((m) => m.model_name));
    // And `handleModelSelection` adds `modelId` to the list.
    // The `profile.models` comes from `DetailedTestProfile`.
    // It seems `model_name` holds the ID string in the `models` array of `DetailedTestProfile`?
    // Let's check `TestProfileDetails` interface in `EditTestSessionModal.tsx`:
    // models: { id: number; profile_id: ...; model_name: string; ... }[]
    // And `availableModels` has `id` (string) and `name` (string).
    // In `EditTestSessionModal`, `handleModelSelection` uses `modelId` (string).
    // So `profile.models` probably contains the model IDs in `model_name` field?
    // Or `model_name` IS the model ID (like "gpt-4")?
    // Yes, `ModelOption` has `id` as string (e.g. "gpt-4").
    // So `model_name` in `profile.models` likely corresponds to `model.id` in `availableModels`.

    setManualTests(
      data.manual_tests
        ? data.manual_tests.map((t) => ({
            prompt: t.prompt,
            expected_result: t.expected_result,
          }))
        : data.tests
            .filter((t) => t.is_manual)
            .map((t) => ({
              prompt: t.test_prompt,
              expected_result: t.expected_result,
            })),
    );
    setSelectedHotelId(data.hotel_id ? data.hotel_id.toString() : "");
  };

  const loadData = async () => {
    try {
      const [testsResult, systemPromptsResult, hotelsResult] =
        await Promise.all([
          getTestsForSelectionAction(),
          getSystemPromptsForSelectionAction(),
          getAllHotelsForSelectionAction(),
        ]);

      if (testsResult.success && testsResult.data) {
        setAvailableTests(testsResult.data);
      }

      if (systemPromptsResult.success && systemPromptsResult.data) {
        setAvailableSystemPrompts(systemPromptsResult.data);
      }

      if (hotelsResult.success && hotelsResult.data) {
        setAvailableHotels(hotelsResult.data);
      }
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
    setManualTests([]);
    setNewManualPrompt("");
    setNewManualExpected("");
    setSelectedHotelId("");
  };

  const handleAddManualTest = () => {
    if (newManualPrompt.trim() && newManualExpected.trim()) {
      setManualTests((prev) => [
        ...prev,
        {
          prompt: newManualPrompt.trim(),
          expected_result: newManualExpected.trim(),
        },
      ]);
      setNewManualPrompt("");
      setNewManualExpected("");
    }
  };

  const handleRemoveManualTest = (index: number) => {
    setManualTests((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !selectedSystemPrompt) {
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
        (sp) => sp.id.toString() === selectedSystemPrompt,
      );
      if (!selectedSystemPromptObj) {
        alert("Selected system prompt not found");
        return;
      }

      const payload = {
        name: name.trim(),
        system_prompt_id: Number(selectedSystemPrompt),
        test_ids: selectedTestIds,
        model_configs: selectedModelIds,
        manual_tests: manualTests,
        hotel_id:
          selectedHotelId && selectedHotelId !== "none"
            ? Number(selectedHotelId)
            : null,
      };

      let result;
      if (isEditMode && initialData) {
        result = await updateTestProfileAction(initialData.id, payload);
      } else {
        result = await createTestProfileAction(payload);
      }

      if (result.success) {
        if (!isEditMode) resetForm();
        setOpen(false);
        onSuccess?.();
      } else {
        alert(
          result.error ||
            `Failed to ${isEditMode ? "update" : "create"} test session`,
        );
      }
    } catch (error) {
      console.error(
        `Error ${isEditMode ? "updating" : "creating"} test session:`,
        error,
      );
      alert(
        `An error occurred while ${isEditMode ? "updating" : "creating"} the test session`,
      );
    } finally {
      setLoading(false);
    }
  };

  const selectedSystemPromptObj = availableSystemPrompts.find(
    (sp) => sp.id.toString() === selectedSystemPrompt,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEditMode ? (
          <Button variant="outline" size="sm">
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        ) : (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Test Session
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit Test Session" : "Create New Test Session"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Update the session configuration including name, system prompt, tests, and model configurations."
              : "Create a new test session to run multiple tests with different models and system prompts."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
          <form
            id="test-session-form"
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

            {/* Hotel Knowledge Base */}
            <div className="space-y-2">
              <Label htmlFor="hotel-kb">Hotel Knowledge Base</Label>
              <Select
                value={selectedHotelId}
                onValueChange={setSelectedHotelId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All files (no filter)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All files (no filter)</SelectItem>
                  {availableHotels.map((hotel) => (
                    <SelectItem key={hotel.id} value={hotel.id.toString()}>
                      {hotel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                When set, tests will only search files from this hotel&apos;s
                knowledge base.
              </p>
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

            {/* Manual Tests Section */}
            <div className="space-y-4 pt-4 border-t border-gray-800">
              <Label className="text-sm font-medium text-gray-300">
                Manual Tests
              </Label>
              <div className="space-y-3">
                <div className="grid gap-2">
                  <Input
                    placeholder="New Question eg: What is the capital of France?"
                    value={newManualPrompt}
                    onChange={(e) => setNewManualPrompt(e.target.value)}
                    className="bg-neutral-900 border-gray-700 text-white"
                  />
                  <Input
                    placeholder="Expected Result eg: Paris"
                    value={newManualExpected}
                    onChange={(e) => setNewManualExpected(e.target.value)}
                    className="bg-neutral-900 border-gray-700 text-white"
                  />
                  <Button
                    type="button"
                    onClick={handleAddManualTest}
                    variant="outline"
                    size="sm"
                    className="w-full border-gray-600 bg-gray-800 text-white hover:bg-gray-700"
                  >
                    Add Manual Test
                  </Button>
                </div>

                {manualTests.length > 0 && (
                  <div className="space-y-2 mt-4">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Added Manual Tests ({manualTests.length})
                    </p>
                    <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                      {manualTests.map((test, index) => (
                        <div
                          key={index}
                          className="flex items-start justify-between p-2 bg-neutral-900 border border-gray-800 rounded group"
                        >
                          <div className="flex-1 min-w-0 mr-2">
                            <p className="text-xs font-medium text-white truncate">
                              {test.prompt}
                            </p>
                            <p className="text-[10px] text-gray-500 truncate">
                              Exp: {test.expected_result}
                            </p>
                          </div>
                          <Button
                            type="button"
                            onClick={() => handleRemoveManualTest(index)}
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>

        <DialogFooter className="mt-6 border-t pt-4">
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button type="submit" form="test-session-form" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {loading
              ? isEditMode
                ? "Updating..."
                : "Creating..."
              : isEditMode
                ? "Update Session"
                : "Create Session"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
