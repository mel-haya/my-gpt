import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Square,
  Play,
  Trash2,
  DollarSign,
  Coins,
  Medal,
  Trophy,
} from "lucide-react";
import EditTestSessionModal from "@/components/EditTestSessionModal";
import { formatTokens } from "@/lib/utils";
import type { DetailedTestProfile } from "@/services/testProfilesService";
import type { SessionRunResult } from "@/app/actions/testSessions";
import type { ModelOption } from "@/app/actions/models";

interface SessionHeaderProps {
  profile: DetailedTestProfile;
  currentRunStatus: SessionRunResult | null;
  availableModels: ModelOption[];
  evaluatorModel: string;
  onEvaluatorModelChange: (value: string) => void;
  isRunning: boolean;
  onRunSession: () => void;
  onStopSession: () => void;
  onDeleteSession: () => void;
  onSessionUpdated: () => void;
  winnerModel: { model: string; avgScore: number } | null;
}

export function SessionHeader({
  profile,
  currentRunStatus,
  availableModels,
  evaluatorModel,
  onEvaluatorModelChange,
  isRunning,
  onRunSession,
  onStopSession,
  onDeleteSession,
  onSessionUpdated,
  winnerModel,
}: SessionHeaderProps) {
  return (
    <div className="mb-6">
      {/* Session Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">{profile.name}</h2>
          {currentRunStatus && (
            <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800 rounded-md">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium dark:text-blue-100">
                  Test Session Running
                </span>
                <Badge variant="default" className="bg-blue-500">
                  {currentRunStatus.completedTests}/
                  {currentRunStatus.totalTests}
                </Badge>
              </div>
              <div className="mt-1 bg-gray-200 dark:bg-gray-800 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${
                      (currentRunStatus.completedTests /
                        currentRunStatus.totalTests) *
                      100
                    }%`,
                  }}
                />
              </div>
              {currentRunStatus.results && (
                <div className="flex gap-4 mt-2 text-xs">
                  <span className="text-green-600 dark:text-green-400">
                    ✓ {currentRunStatus.results.success} Success
                  </span>
                  <span className="text-red-600 dark:text-red-400">
                    ✗ {currentRunStatus.results.failed} Failed
                  </span>
                  <span className="text-gray-600 dark:text-gray-400">
                    ⏳ {currentRunStatus.results.pending} Pending
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 items-center">
            <span className="text-xs text-muted-foreground font-medium ml-1">
              Evaluator Model
            </span>
            <Select
              value={evaluatorModel}
              onValueChange={onEvaluatorModelChange}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select Evaluator" />
              </SelectTrigger>
              <SelectContent>
                {availableModels.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isRunning ? (
            <Button
              onClick={onStopSession}
              variant="destructive"
              size="sm"
              disabled={!currentRunStatus}
            >
              <Square className="w-4 h-4 mr-2" />
              Stop Session
            </Button>
          ) : (
            <Button
              onClick={onRunSession}
              className="bg-green-600 hover:bg-green-700"
              size="sm"
              disabled={
                profile.tests.length === 0 || profile.models.length === 0
              }
            >
              <Play className="w-4 h-4 mr-2" />
              Run Session
            </Button>
          )}
          <EditTestSessionModal
            profile={profile}
            onSessionUpdated={onSessionUpdated}
          />
          <Button onClick={onDeleteSession} variant="destructive" size="sm">
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4 py-2 text-sm text-gray-600 dark:text-gray-400">
        <span>
          Created on {new Date(profile.created_at).toLocaleDateString()} by{" "}
          {profile.username}
        </span>
        {profile.average_score !== null && !isNaN(profile.average_score) && (
          <div className="flex items-center gap-4 pl-4 border-l border-gray-300 dark:border-gray-700">
            <div
              className="flex items-center gap-1.5"
              title="Total Token Cost (Lifetime)"
            >
              <DollarSign className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {profile.total_tokens_cost
                  ? profile.total_tokens_cost.toFixed(4)
                  : "0.0000"}
              </span>
            </div>
            <div
              className="flex items-center gap-1.5"
              title="Total Tokens (Lifetime)"
            >
              <Coins className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {formatTokens(profile.total_tokens)}
              </span>
            </div>
            <div
              className="flex items-center gap-1.5"
              title="Average Score (Lifetime)"
            >
              <Medal className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {profile.average_score.toFixed(1)}/10
              </span>
            </div>
            {winnerModel && (
              <div
                className="flex items-center gap-1.5"
                title={`Winner Model: ${winnerModel.model} (Avg: ${winnerModel.avgScore.toFixed(1)}/10)`}
              >
                <Trophy className="w-4 h-4 text-amber-500" />
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {winnerModel.model.split("/").pop()}:{" "}
                  <span
                    className={
                      winnerModel.avgScore >= 8
                        ? `text-green-600 dark:text-green-400`
                        : winnerModel.avgScore >= 6
                          ? `text-yellow-600 dark:text-yellow-400`
                          : `text-red-600 dark:text-red-400`
                    }
                  >
                    {winnerModel.avgScore.toFixed(1)}
                  </span>
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
