import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Loader2,
  DollarSign,
  Coins,
  Medal,
  Trophy,
} from "lucide-react";
import TestSessionModal from "@/components/TestSessionModal";
import { SessionStatusBadge } from "./SessionStatusBadge";
import { formatTokens } from "@/lib/utils";
import type { SelectTestProfileWithDetails } from "@/lib/db-schema";
import type { ModelOption } from "@/app/actions/models";
import type { SessionRunResult } from "@/app/actions/testSessions";

interface SessionsListSidebarProps {
  testProfiles: SelectTestProfileWithDetails[];
  selectedProfileId: number | null;
  loading: boolean;
  searchQuery: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectProfile: (profile: SelectTestProfileWithDetails) => void;
  onSessionCreated: () => void;
  availableModels: ModelOption[];
  runningSessionId: number | null;
  sessionRuns: SessionRunResult[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function SessionsListSidebar({
  testProfiles,
  selectedProfileId,
  loading,
  searchQuery,
  onSearchChange,
  onSelectProfile,
  onSessionCreated,
  availableModels,
  runningSessionId,
  sessionRuns,
  currentPage,
  totalPages,
  onPageChange,
}: SessionsListSidebarProps) {
  return (
    <div className="w-1/3 min-w-[320px] flex flex-col h-full space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Test Sessions</h1>
          <p className="text-sm text-gray-600">Manage session profiles</p>
        </div>
        <div className="flex items-center gap-2">
          <TestSessionModal
            onSuccess={onSessionCreated}
            availableModels={availableModels}
          />
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search sessions..."
          value={searchQuery}
          onChange={onSearchChange}
          className="pl-10"
        />
      </div>

      {/* Sessions List */}
      <div className="space-y-2 overflow-y-auto flex-1">
        {loading ? (
          <div className="text-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
            Loading sessions...
          </div>
        ) : testProfiles.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No sessions found.</p>
            <p className="text-sm">Create your first session to get started.</p>
          </div>
        ) : (
          testProfiles.map((profile) => (
            <Card
              key={profile.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedProfileId === profile.id
                  ? "ring-2 ring-neutral-500 bg-neutral-600/40 border-blue-200"
                  : ""
              }`}
              onClick={() => onSelectProfile(profile)}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm font-medium truncate">
                      {profile.name}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-500">
                      <SessionStatusBadge
                        profile={profile}
                        isSelected={selectedProfileId === profile.id}
                        runningSessionId={runningSessionId}
                        sessionRuns={sessionRuns}
                      />
                      <span>
                        {new Date(profile.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {/* Stats Row */}
                    <div className="flex items-center gap-3 mt-2 text-[10px]">
                      {profile.total_tokens_cost !== null &&
                        profile.total_tokens_cost > 0 && (
                          <div
                            className="flex items-center gap-0.5"
                            title="Total Cost"
                          >
                            <DollarSign className="w-3 h-3 text-green-500" />
                            <span className="text-gray-400">
                              {Number(profile.total_tokens_cost).toFixed(4)}
                            </span>
                          </div>
                        )}
                      {profile.total_tokens !== null &&
                        Number(profile.total_tokens) > 0 && (
                          <div
                            className="flex items-center gap-0.5"
                            title="Total Tokens"
                          >
                            <Coins className="w-3 h-3 text-yellow-500" />
                            <span className="text-gray-400">
                              {formatTokens(Number(profile.total_tokens))}
                            </span>
                          </div>
                        )}
                      {profile.average_score !== null &&
                        !isNaN(Number(profile.average_score)) && (
                          <div
                            className="flex items-center gap-0.5"
                            title="Average Score"
                          >
                            <Medal className="w-3 h-3 text-blue-500" />
                            <span className="text-gray-400">
                              {Number(profile.average_score).toFixed(1)}
                            </span>
                          </div>
                        )}
                      {profile.best_model && (
                        <div
                          className="flex items-center gap-0.5 min-w-0"
                          title={`Best Model: ${profile.best_model}`}
                        >
                          <Trophy className="w-3 h-3 text-amber-500 shrink-0" />
                          <span className="text-gray-400 truncate">
                            {profile.best_model.split("/").pop()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="text-gray-600">
            {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
