"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { FileTextIcon, TrendingUpIcon } from "lucide-react";

interface KnowledgeBaseResult {
  id: number;
  content: string;
  similarity: number;
}

interface KnowledgeBaseResultsProps {
  success: boolean;
  message: string;
  results?: KnowledgeBaseResult[];
  className?: string;
}

export const KnowledgeBaseResults = ({
  success,
  message,
  results = [],
  className,
}: KnowledgeBaseResultsProps) => {
  if (!success || results.length === 0) {
    return (
      <div className={cn("p-4 text-center text-muted-foreground", className)}>
        <FileTextIcon className="mx-auto mb-2 h-8 w-8 opacity-50" />
        <p className="text-sm">{message}</p>
      </div>
    );
  }

  // Sort results by similarity (highest first)
  const sortedResults = [...results].sort((a, b) => b.similarity - a.similarity);

  // Get similarity color based on score
  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 0.8) return "bg-green-100 text-green-800 border-green-200";
    if (similarity >= 0.6) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    if (similarity >= 0.4) return "bg-orange-100 text-orange-800 border-orange-200";
    return "bg-red-100 text-red-800 border-red-200";
  };

  // Get similarity label
  const getSimilarityLabel = (similarity: number) => {
    if (similarity >= 0.8) return "High";
    if (similarity >= 0.6) return "Medium";
    if (similarity >= 0.4) return "Low";
    return "Very Low";
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with summary */}
      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-2">
          <FileTextIcon className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">{message}</span>
        </div>
        <Badge variant="secondary" className="text-xs">
          {results.length} result{results.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Similarity Scores Overview */}
      <div className="p-3 bg-muted/20 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">Similarity Scores</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {sortedResults.map((result, index) => (
            <div
              key={result.id}
              className="flex items-center justify-between p-2 bg-background rounded border"
            >
              <span className="text-xs text-muted-foreground">#{index + 1}</span>
              <Badge
                variant="outline"
                className={cn("text-xs px-2 py-1", getSimilarityColor(result.similarity))}
              >
                {(result.similarity * 100).toFixed(1)}%
              </Badge>
            </div>
          ))}
        </div>
      </div>

      {/* Document Results */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <FileTextIcon className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">Retrieved Documents</span>
        </div>
        
        {sortedResults.map((result, index) => (
          <div
            key={result.id}
            className="p-3 bg-background border rounded-lg space-y-2"
          >
            {/* Document header with similarity */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Document #{index + 1}
                </span>
                <span className="text-xs text-muted-foreground">
                  ID: {result.id}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn("text-xs", getSimilarityColor(result.similarity))}
                >
                  {getSimilarityLabel(result.similarity)}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {(result.similarity * 100).toFixed(1)}%
                </Badge>
              </div>
            </div>
            
            {/* Document content */}
            <div className="text-sm text-foreground bg-muted/30 p-3 rounded border">
              <p className="whitespace-pre-wrap">{result.content}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};