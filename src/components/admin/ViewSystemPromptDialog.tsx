"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface ViewSystemPromptDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    name?: string | null;
    prompt?: string | null;
}

export default function ViewSystemPromptDialog({
    open,
    onOpenChange,
    name,
    prompt,
}: ViewSystemPromptDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{name || "System Prompt"}</DialogTitle>
                    <DialogDescription>
                        Full content of the assigned system prompt.
                    </DialogDescription>
                </DialogHeader>
                <div className="mt-4 flex-1 overflow-auto">
                    <Textarea
                        value={prompt || "No system prompt content available."}
                        readOnly
                        className="min-h-[400px] font-mono text-sm bg-neutral-900 border-neutral-700 text-neutral-100 resize-none"
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
