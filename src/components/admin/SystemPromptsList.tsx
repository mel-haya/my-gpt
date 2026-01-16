"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Edit2,
  Trash2,
  Search,
  Eye,
  Star,
  Zap,
  Beaker,
  DollarSign,
  Coins,
} from "lucide-react";
import type { SelectSystemPromptWithUser } from "@/services/systemPromptsService";
import { encode } from "gpt-tokenizer";
import Link from "next/link";

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
  const [expandedPrompts, setExpandedPrompts] = useState<Set<number>>(
    new Set()
  );

  const togglePromptExpansion = (id: number) => {
    const newExpanded = new Set(expandedPrompts);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedPrompts(newExpanded);
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
            {systemPrompts.map((prompt) => {
              const tokensCount = encode(prompt.prompt).length;
              const isExpanded = expandedPrompts.has(prompt.id);

              return (
                <div
                  key={prompt.id}
                  className="flex flex-col p-4 border rounded-xl hover:shadow-md transition-shadow bg-card"
                >
                  {/* Header row */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        checked={selectedRows.has(prompt.id)}
                        onCheckedChange={(checked) =>
                          onSelectRow(prompt.id, checked as boolean)
                        }
                      />
                      <div className="flex items-center space-x-2">
                        <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground mr-1">
                          {prompt.name}
                        </h3>
                        <Badge
                          variant="secondary"
                          className="text-[10px] h-4 px-1 py-0 bg-muted text-muted-foreground font-normal rounded-sm"
                        >
                          v1
                        </Badge>
                        {prompt.default && (
                          <Badge
                            variant="default"
                            className="text-[10px] h-4 px-1 py-0 font-normal rounded-sm"
                          >
                            <Star className="h-2.5 w-2.5 mr-0.5" />
                            Default
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => togglePromptExpansion(prompt.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => onEdit(prompt)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => onDelete(prompt.id, prompt.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Stats Row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4 px-1">
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                        Average Score
                      </p>
                      <div className="flex items-center space-x-1">
                        <Zap className="h-4 w-4 text-orange-500" />
                        <span className="font-bold text-sm">
                          {prompt.averageScore !== null &&
                          prompt.averageScore !== undefined
                            ? prompt.averageScore.toFixed(1)
                            : "N/A"}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                        Sessions
                      </p>
                      <div className="flex items-center space-x-1">
                        <Beaker className="h-4 w-4 text-blue-500" />
                        <span className="font-bold text-sm">
                          {prompt.sessionsCount || 0}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                        Estimated Tokens
                      </p>
                      <div className="flex items-center space-x-1 text-green-600">
                        <Coins className="h-4 w-4" />
                        <span className="font-bold text-sm">
                          ~{tokensCount}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Collapsible Prompt Content */}
                  {isExpanded && (
                    <div className="mb-4 bg-muted/50 p-3 rounded-lg border text-sm font-mono whitespace-pre-wrap animate-in fade-in slide-in-from-top-1 duration-200">
                      {prompt.prompt}
                    </div>
                  )}

                  {/* Footer actions */}
                  <div className="flex items-center space-x-4 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={prompt.default || isPending}
                      onClick={() => onSetDefault(prompt.id, prompt.name)}
                      className={`h-8 rounded-md px-3 text-xs font-medium border-orange-200 text-orange-600 hover:bg-orange-50 hover:text-orange-700 ${
                        prompt.default
                          ? "bg-orange-50 bg-opacity-50 border-none cursor-default"
                          : ""
                      }`}
                    >
                      {prompt.default ? "Par défaut" : "Définir par défaut"}
                    </Button>
                    <Link
                      href={`/admin/sessions?search=${encodeURIComponent(
                        prompt.name
                      )}`}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
                    >
                      Voir évaluations
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
