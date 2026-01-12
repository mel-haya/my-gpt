"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Edit2, Trash2, Search, Eye, Star, User } from "lucide-react";
import type { SelectSystemPromptWithUser } from "@/services/systemPromptsService";
import type { SelectSystemPrompt } from "@/lib/db-schema";

interface SystemPromptsTableProps {
  systemPrompts: SelectSystemPromptWithUser[];
  onEdit: (prompt: SelectSystemPromptWithUser) => void;
  onDelete: (promptId: number, promptName: string) => void;
  onSetDefault: (promptId: number, promptName: string) => void;
  selectedRows: Set<number>;
  onSelectRow: (promptId: number, checked: boolean) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearch: () => void;
  onBulkDelete: () => void;
  isPending: boolean;
}

export default function SystemPromptsList({
  systemPrompts,
  onEdit,
  onDelete,
  onSetDefault,
  selectedRows,
  onSelectRow,
  searchQuery,
  onSearchChange,
  onSearch,
  onBulkDelete,
  isPending,
}: SystemPromptsTableProps) {
  const [viewPromptModal, setViewPromptModal] = useState<{
    isOpen: boolean;
    prompt: SelectSystemPromptWithUser | null;
  }>({ isOpen: false, prompt: null });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const truncateToLines = (text: string, maxLines: number) => {
    const lines = text.split('\n');
    if (lines.length <= maxLines) {
      return text;
    }
    return lines.slice(0, maxLines).join('\n') + '...';
  };

  const handleViewPrompt = (prompt: SelectSystemPromptWithUser) => {
    setViewPromptModal({ isOpen: true, prompt });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
          <CardTitle>System Prompts ({systemPrompts.length})</CardTitle>

          <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-4 sm:items-center">
            {/* Bulk Delete */}
            {selectedRows.size > 0 && (
              <div className="flex items-center space-x-2">
                <Button variant="destructive" size="sm" onClick={onBulkDelete}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  {`Delete ${selectedRows.size} Selected`}
                </Button>
              </div>
            )}
            {/* Search */}
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search prompts..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && onSearch()}
                  className="pl-8 w-48"
                />
              </div>
              <Button onClick={onSearch} disabled={isPending} size="sm">
                Search
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {systemPrompts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No system prompts found. Create your first system prompt to get
            started.
          </div>
        ) : (
          <div className="space-y-4">
            {systemPrompts.map((prompt) => (
              <div
                key={prompt.id}
                className="flex items-start space-x-4 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                {/* Checkbox */}
                <Checkbox
                  checked={selectedRows.has(prompt.id)}
                  onCheckedChange={(checked) =>
                    onSelectRow(prompt.id, checked as boolean)
                  }
                  className="mt-1"
                />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold text-sm">{prompt.name}</h3>
                      {prompt.default && (
                        <Badge variant="default" className="text-xs">
                          <Star className="h-3 w-3 mr-1" />
                          Default
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {!prompt.default && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onSetDefault(prompt.id, prompt.name)}
                          title="Set as default for testing"
                        >
                          <Star className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(prompt)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onDelete(prompt.id, prompt.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Prompt Preview */}
                  <div className="mb-3">
                    <p className="text-sm text-muted-foreground mb-1">
                      Prompt:
                    </p>
                    <div
                      className="bg-muted p-3 rounded cursor-pointer hover:bg-muted/80 transition-colors group"
                      onClick={() => handleViewPrompt(prompt)}
                    >
                      <div className="flex items-start justify-between">
                        <p className="text-sm font-mono whitespace-pre-wrap flex-1">
                          {truncateToLines(prompt.prompt, 2)}
                        </p>
                        <Eye className="h-4 w-4 text-muted-foreground group-hover:text-foreground ml-2 mt-1 shrink-0" />
                      </div>
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center space-x-4">
                      <span>
                        Updated: {formatDate(prompt.updated_at.toString())}
                      </span>
                      <span className="flex items-center">
                        <User className="h-3 w-3 mr-1" />
                        Created by: {prompt.creator_name || "Unknown"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* View Prompt Modal */}
      <Dialog
        open={viewPromptModal.isOpen}
        onOpenChange={(open) => setViewPromptModal({ isOpen: open, prompt: null })}
      >
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {viewPromptModal.prompt?.name || "System Prompt"}
            </DialogTitle>
            <DialogDescription>
              Full system prompt content
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <div className="bg-muted p-4 rounded">
              <pre className="text-sm font-mono whitespace-pre-wrap wrap-break-word">
                {viewPromptModal.prompt?.prompt}
              </pre>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
