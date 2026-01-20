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
import { updateSystemPromptAction } from "@/app/actions/systemPrompts";
import { toast } from "react-toastify";

interface ViewSystemPromptDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    systemPromptId?: number | null;
    name?: string | null;
    prompt?: string | null;
    onPromptUpdated?: () => void;
}

export default function ViewSystemPromptDialog({
    open,
    onOpenChange,
    systemPromptId,
    name,
    prompt,
    onPromptUpdated,
}: ViewSystemPromptDialogProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [currentPrompt, setCurrentPrompt] = useState("");
    const [isSaving, setIsSaving] = useState(false);

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

    return (
        <Dialog open={open} onOpenChange={(val) => {
            if (!isSaving) onOpenChange(val);
        }}>
            <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <div className="flex items-center justify-between mr-8">
                        <div>
                            <DialogTitle>{name || "System Prompt"}</DialogTitle>
                            <DialogDescription>
                                {isEditing ? "Edit the system prompt content." : "Full content of the assigned system prompt."}
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
                        <Button onClick={handleSave} disabled={isSaving}>
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
        </Dialog>
    );
}
