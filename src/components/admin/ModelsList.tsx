"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Edit2,
  Trash2,
  Search,
  Star,
  Bot,
} from "lucide-react";
import type { SelectModelWithStats } from "@/services/modelsService";

interface ModelsListProps {
  models: SelectModelWithStats[];
  onEdit: (model: SelectModelWithStats) => void;
  onDelete: (modelId: number, modelName: string) => void;
  onSetDefault: (modelId: number, modelName: string) => void;
  selectedRows: Set<number>;
  onSelectRow: (modelId: number, checked: boolean) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearch: () => void;
  onBulkDelete: () => void;
  isPending: boolean;
  sortBy: string;
  sortOrder: "asc" | "desc";
  onSort: (column: "name" | "created_at" | "score" | "cost" | "tokens") => void;
  selectAll: boolean;
  onSelectAll: (checked: boolean) => void;
}

const getProviderIcon = (modelId: string) => {
  const lowerId = modelId.toLowerCase();

  if (lowerId.includes("openai") || lowerId.includes("gpt")) {
    return <i className="fa-brands fa-openai text-[#c9c9c9]" />;
  }
  if (lowerId.includes("anthropic") || lowerId.includes("claude")) {
    return <i className="fa-solid fa-a text-[#d4a27f]" />;
  }
  if (lowerId.includes("google") || lowerId.includes("gemini")) {
    return <i className="fa-brands fa-google text-[#4285f4]" />;
  }
  if (lowerId.includes("meta") || lowerId.includes("llama")) {
    return <i className="fa-brands fa-meta text-[#0082fb]" />;
  }
  if (lowerId.includes("mistral")) {
    return <i className="fa-solid fa-wind text-[#ff7000]" />;
  }

  return <Bot className="h-4 w-4 text-muted-foreground" />;
};

export default function ModelsList({
  models,
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
  sortBy,
  sortOrder,
  onSort,
  selectAll,
  onSelectAll,
}: ModelsListProps) {
  const renderSortIcon = (column: string) => {
    if (sortBy !== column) return <ChevronsUpDown className="ml-2 h-4 w-4" />;
    return sortOrder === "asc" ? (
      <ChevronUp className="ml-2 h-4 w-4" />
    ) : (
      <ChevronDown className="ml-2 h-4 w-4" />
    );
  };

  return (
    <div className="space-y-4">
      {/* Search and Bulk Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center flex-1 space-x-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search models..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSearch()}
              className="pl-8 w-64"
            />
          </div>
          <Button
            onClick={onSearch}
            disabled={isPending}
            size="sm"
            variant="secondary"
          >
            Search
          </Button>
        </div>
        {selectedRows.size > 0 && (
          <Button variant="destructive" size="sm" onClick={onBulkDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            {`Delete ${selectedRows.size}`}
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={selectAll}
                  onCheckedChange={(checked) => onSelectAll(checked as boolean)}
                />
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onSort("name")}
              >
                <div className="flex items-center">
                  Name
                  {renderSortIcon("name")}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/50 w-[150px]"
                onClick={() => onSort("score")}
              >
                <div className="flex items-center">
                  Score
                  {renderSortIcon("score")}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/50 w-[150px]"
                onClick={() => onSort("cost")}
              >
                <div className="flex items-center">
                  Cost
                  {renderSortIcon("cost")}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/50 w-[150px]"
                onClick={() => onSort("tokens")}
              >
                <div className="flex items-center">
                  Tokens
                  {renderSortIcon("tokens")}
                </div>
              </TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {models.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No models found.
                </TableCell>
              </TableRow>
            ) : (
              [...models]
                .sort((a, b) => {
                  if (a.default && !b.default) return -1;
                  if (!a.default && b.default) return 1;
                  return 0;
                })
                .map((model) => (
                  <TableRow
                    key={model.id}
                    className={!model.enabled ? "opacity-60 bg-muted/20" : ""}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedRows.has(model.id)}
                        onCheckedChange={(checked) =>
                          onSelectRow(model.id, checked as boolean)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="p-1 rounded-md bg-muted/50 border">
                            {getProviderIcon(model.model_id)}
                          </span>
                          <span className="font-medium">{model.name}</span>
                          {model.default && (
                            <Badge
                              variant="default"
                              className="bg-yellow-500 hover:bg-yellow-600 text-white border-0 text-[10px] px-1 h-4"
                            >
                              <Star className="h-2 w-2 mr-1 fill-current" />
                              Default
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground font-mono ml-8">
                          {model.model_id}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <span className="font-semibold">
                          {model.score ? model.score.toFixed(1) : "-"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-mono text-xs">
                        {model.cost ? `$${model.cost.toFixed(4)}` : "$0.0000"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-mono text-xs">
                        {model.tokens
                          ? new Intl.NumberFormat("en-US", {
                              notation: "compact",
                              compactDisplay: "short",
                            }).format(model.tokens)
                          : "0"}
                      </div>
                    </TableCell>
                    <TableCell>
                      {model.enabled ? (
                        <Badge
                          variant="outline"
                          className="bg-green-500/10 text-green-700 hover:bg-green-500/20 border-green-200"
                        >
                          Active
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-red-500/10 text-red-700 hover:bg-red-500/20 border-red-200"
                        >
                          Disabled
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {!model.default && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onSetDefault(model.id, model.name)}
                            title="Make Default"
                            className="h-8 w-8 p-0"
                          >
                            <Star className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(model)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => onDelete(model.id, model.name)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
