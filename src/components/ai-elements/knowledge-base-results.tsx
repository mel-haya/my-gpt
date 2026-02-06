"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ChevronDownIcon, FileTextIcon, TrendingUpIcon } from "lucide-react";

interface KnowledgeBaseResult {
  id: number;
  content: string;
  similarity: number;
}

interface KnowledgeBaseResultsProps {
  success: boolean;
  message: string;
  results?: KnowledgeBaseResult[];
  system?: string;
  className?: string;
}

export const KnowledgeBaseResults = ({
  success,
  message,
  results = [],
  system,
  className,
}: KnowledgeBaseResultsProps) => {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  if (!success || results.length === 0) {
    return (
      <div className={cn("p-4 text-center text-muted-foreground", className)}>
        <FileTextIcon className="mx-auto mb-2 h-8 w-8 opacity-50" />
        <p className="text-sm">{message}</p>
      </div>
    );
  }

  // Sort results by similarity (highest first)
  const sortedResults = [...results].sort(
    (a, b) => b.similarity - a.similarity,
  );

  // Get similarity color based on score
  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 0.8)
      return "bg-green-100 text-green-800 border-green-200";
    if (similarity >= 0.6)
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    if (similarity >= 0.4)
      return "bg-orange-100 text-orange-800 border-orange-200";
    return "bg-red-100 text-red-800 border-red-200";
  };

  const handleToggle = (id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* System Message */}
      {system && (
        <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
          <span className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">
            System:
          </span>
          <span className="text-sm text-blue-700 dark:text-blue-300">
            {system}
          </span>
        </div>
      )}

      {/* Header with summary */}
      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-2">
          <FileTextIcon className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">{message}</span>
        </div>
        <Badge variant="secondary" className="text-xs">
          {results.length} result{results.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {/* Similarity Scores - Clickable to expand documents */}
      <div className="p-3 bg-muted/20 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">
            Click a score to view document
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {sortedResults.map((result, index) => {
            const isExpanded = expandedId === result.id;
            return (
              <button
                key={result.id}
                onClick={() => handleToggle(result.id)}
                className={cn(
                  "flex items-center justify-between p-2 rounded border transition-all cursor-pointer",
                  isExpanded
                    ? "bg-primary/10 border-primary ring-1 ring-primary/30"
                    : "bg-background hover:bg-muted/50",
                )}
              >
                <span className="text-xs text-muted-foreground">
                  #{index + 1}
                </span>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs px-2 py-1",
                    getSimilarityColor(result.similarity),
                  )}
                >
                  {(result.similarity * 100).toFixed(1)}%
                </Badge>
              </button>
            );
          })}
        </div>
      </div>

      {/* Expanded Document Content */}
      {expandedId !== null && (
        <div className="overflow-hidden rounded-lg border bg-background animate-in slide-in-from-top-2 duration-200">
          {sortedResults
            .filter((result) => result.id === expandedId)
            .map((result, index) => {
              const originalIndex = sortedResults.findIndex(
                (r) => r.id === result.id,
              );
              return (
                <div key={result.id} className="p-4 space-y-3">
                  {/* Document header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileTextIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        Document #{originalIndex + 1}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ID: {result.id}
                      </span>
                    </div>
                    <button
                      onClick={() => setExpandedId(null)}
                      className="p-1 rounded hover:bg-muted transition-colors"
                    >
                      <ChevronDownIcon className="h-4 w-4 rotate-180" />
                    </button>
                  </div>

                  {/* Similarity badge */}
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs",
                      getSimilarityColor(result.similarity),
                    )}
                  >
                    {(result.similarity * 100).toFixed(1)}% similarity
                  </Badge>

                  {/* Document content */}
                  <div className="text-sm text-foreground bg-muted/30 p-3 rounded border max-h-64 overflow-y-auto">
                    <p className="whitespace-pre-wrap">{result.content}</p>
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
};
