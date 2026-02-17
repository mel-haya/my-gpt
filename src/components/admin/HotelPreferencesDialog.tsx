"use client";

import { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  updateHotelPreferencesAction,
  getModelsForSelectAction,
  getSystemPromptsForSelectAction,
} from "@/app/actions/hotels";
import { HotelWithStaffCount } from "@/services/hotelService";
import { Loader2, Settings } from "lucide-react";
import { toast } from "react-toastify";

interface HotelPreferencesDialogProps {
  hotel: HotelWithStaffCount;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function HotelPreferencesDialog({
  hotel,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: HotelPreferencesDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);

  const [models, setModels] = useState<{ id: number; name: string }[]>([]);
  const [systemPrompts, setSystemPrompts] = useState<
    { id: number; name: string }[]
  >([]);

  const [selectedModelId, setSelectedModelId] = useState<string>(
    hotel.model_id?.toString() || "null",
  );
  const [selectedSystemPromptId, setSelectedSystemPromptId] = useState<string>(
    hotel.system_prompt_id?.toString() || "null",
  );
  const [preferredLanguage, setPreferredLanguage] = useState<string>(
    hotel.preferred_language || "english",
  );

  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        setLoading(true);
        try {
          const [modelsData, promptsData] = await Promise.all([
            getModelsForSelectAction(),
            getSystemPromptsForSelectAction(),
          ]);
          setModels(modelsData);
          setSystemPrompts(promptsData);
        } catch (error) {
          console.error("Failed to load options", error);
          toast.error("Failed to load options");
        } finally {
          setLoading(false);
        }
      };

      fetchData();

      // Reset local state to match prop when opened
      setSelectedModelId(hotel.model_id?.toString() || "null");
      setSelectedSystemPromptId(hotel.system_prompt_id?.toString() || "null");
      setPreferredLanguage(hotel.preferred_language || "english");
    }
  }, [
    isOpen,
    hotel.model_id,
    hotel.system_prompt_id,
    hotel.preferred_language,
  ]);

  const handleSave = () => {
    startTransition(async () => {
      try {
        const modelId =
          selectedModelId === "null" ? null : parseInt(selectedModelId);
        const systemPromptId =
          selectedSystemPromptId === "null"
            ? null
            : parseInt(selectedSystemPromptId);

        const result = await updateHotelPreferencesAction(
          hotel.id,
          systemPromptId,
          modelId,
          preferredLanguage,
        );

        if (result.success) {
          toast.success("Preferences updated");
          setOpen(false);
        } else {
          toast.error(result.error || "Failed to update preferences");
        }
      } catch (error) {
        console.error("Error saving preferences:", error);
        toast.error("An unexpected error occurred");
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {trigger !== undefined ? (
        trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon">
            <Settings className="w-4 h-4" />
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>Hotel Preferences</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="model">Model</Label>
              <Select
                value={selectedModelId}
                onValueChange={setSelectedModelId}
                disabled={isPending}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="null">None (use default)</SelectItem>
                  {models.map((model) => (
                    <SelectItem key={model.id} value={model.id.toString()}>
                      {model.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Select the AI model to use for this hotel&apos;s chat.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="system-prompt">System Prompt</Label>
              <Select
                value={selectedSystemPromptId}
                onValueChange={setSelectedSystemPromptId}
                disabled={isPending}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a system prompt" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="null">None (use default)</SelectItem>
                  {systemPrompts.map((prompt) => (
                    <SelectItem key={prompt.id} value={prompt.id.toString()}>
                      {prompt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Select the system prompt (persona) for this hotel.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="preferred-language">Preferred Language</Label>
              <Select
                value={preferredLanguage}
                onValueChange={setPreferredLanguage}
                disabled={isPending}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="english">English</SelectItem>
                  <SelectItem value="spanish">Spanish</SelectItem>
                  <SelectItem value="french">French</SelectItem>
                  <SelectItem value="german">German</SelectItem>
                  <SelectItem value="italian">Italian</SelectItem>
                  <SelectItem value="portuguese">Portuguese</SelectItem>
                  <SelectItem value="chinese">Chinese</SelectItem>
                  <SelectItem value="japanese">Japanese</SelectItem>
                  <SelectItem value="arabic">Arabic</SelectItem>
                  <SelectItem value="russian">Russian</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                The primary language for this hotel&apos;s operations and AI
                responses.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button onClick={handleSave} disabled={isPending || loading}>
            {isPending ? "Saving..." : "Save Preferences"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
