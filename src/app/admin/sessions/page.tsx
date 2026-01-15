"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import {
  Trash2,
  Search,
  Play,
  Eye,
  Square,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Coins,
  Medal,
  RefreshCcw,
  Star,
} from "lucide-react";
import CreateTestSessionModal from "@/components/CreateTestSessionModal";
import EditTestSessionModal from "@/components/EditTestSessionModal";
import DeleteTestSessionDialog from "@/components/DeleteTestSessionDialog";
import ViewSystemPromptDialog from "@/components/admin/ViewSystemPromptDialog";
import {
  getTestProfilesAction,
  deleteTestProfileAction,
  getTestProfileDetailsAction,
} from "@/app/actions/testProfiles";
import {
  runTestSessionAction,
  stopTestSessionAction,
  getSessionRunStatusAction,
  getSessionRunsAction,
  getTestInProfileDetailsAction,
  regenerateTestResultAction,
  reEvaluateTestResultAction,
  type SessionRunResult,
  type TestInProfileDetail,
} from "@/app/actions/testSessions";
import { getAvailableModels, type ModelOption } from "@/app/actions/models";
import TestResultsList from "@/components/admin/TestResultsList";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  SelectTestProfile,
  SelectTestProfileWithPrompt,
} from "@/lib/db-schema";

interface TestProfileDetails {
  id: number;
  name: string;
  system_prompt_id: number | null;
  system_prompt: string | null;
  system_prompt_name?: string | null;
  user_id: string;
  username: string;
  created_at: Date;
  updated_at: Date;
  tests: {
    test_id: number;
    test_prompt: string;
    best_model: string | null;
    best_score: number | null;
  }[];
  models: {
    id: number;
    profile_id: number;
    model_name: string;
    created_at: Date;
  }[];
  total_tokens_cost: number | null;
  average_score: number | null;
}

export default function SessionsPage() {
  const [testProfiles, setTestProfiles] = useState<
    SelectTestProfileWithPrompt[]
  >([]);
  const [selectedProfile, setSelectedProfile] =
    useState<TestProfileDetails | null>(null);
  const [sessionRuns, setSessionRuns] = useState<SessionRunResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [runsLoading, setRunsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [runningSession, setRunningSession] = useState<number | null>(null);
  const [currentRunStatus, setCurrentRunStatus] =
    useState<SessionRunResult | null>(null);
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [availableModels, setAvailableModels] = useState<ModelOption[]>([]);
  const [evaluatorModel, setEvaluatorModel] = useState("openai/gpt-4o");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<{
    id: number;
    name: string;
  } | null>(null);

  // State for inline test details (expanded cards)
  const [expandedTestIds, setExpandedTestIds] = useState<Set<number>>(
    new Set()
  );
  const [loadingTestDetails, setLoadingTestDetails] = useState<Set<number>>(
    new Set()
  );
  const [regeneratingTests, setRegeneratingTests] = useState<Set<number>>(
    new Set()
  );
  const [reEvaluatingTests, setReEvaluatingTests] = useState<Set<number>>(
    new Set()
  );
  const [testDetailsData, setTestDetailsData] = useState<
    Record<number, { expectedResult: string; results: TestInProfileDetail[] }>
  >({});

  const sortedTests = useMemo(() => {
    if (!selectedProfile?.tests) return [];
    return [...selectedProfile.tests].sort((a, b) => {
      const scoreA = a.best_score ?? -1;
      const scoreB = b.best_score ?? -1;
      return scoreA - scoreB;
    });
  }, [selectedProfile?.tests]);

  const handleToggleTestDetails = async (testId: number) => {
    // Toggle expanded state
    setExpandedTestIds((prev) => {
      const next = new Set(prev);
      if (next.has(testId)) {
        next.delete(testId);
      } else {
        next.add(testId);
      }
      return next;
    });

    // If opening and no data, fetch it
    if (
      !expandedTestIds.has(testId) &&
      !testDetailsData[testId] &&
      selectedProfile
    ) {
      setLoadingTestDetails((prev) => new Set(prev).add(testId));
      try {
        const result = await getTestInProfileDetailsAction(
          selectedProfile.id,
          testId
        );
        if (result.success && result.data) {
          const data = result.data;
          setTestDetailsData((prev) => ({
            ...prev,
            [testId]: {
              expectedResult: data.test.expected_result,
              results: data.results,
            },
          }));
        }
      } catch (error) {
        console.error("Error loading test details:", error);
      } finally {
        setLoadingTestDetails((prev) => {
          const next = new Set(prev);
          next.delete(testId);
          return next;
        });
      }
    }
  };

  const loadTestProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getTestProfilesAction(searchQuery, 10, currentPage);
      if (result.success && result.data) {
        setTestProfiles(result.data.testProfiles);
        setTotalPages(result.data.totalPages);
      }
    } catch (error) {
      console.error("Error loading test profiles:", error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, currentPage]);

  const loadModels = useCallback(async () => {
    try {
      const models = await getAvailableModels();
      setAvailableModels(models);
    } catch (error) {
      console.error("Error loading models:", error);
    }
  }, []);

  const loadSessionRuns = useCallback(async (profileId: number) => {
    setRunsLoading(true);
    try {
      const result = await getSessionRunsAction(profileId);
      if (result.success && result.data) {
        setSessionRuns(result.data);
      }
    } catch (error) {
      console.error("Error loading session runs:", error);
    } finally {
      setRunsLoading(false);
    }
  }, []);

  const loadProfileDetails = useCallback(
    async (profileId: number) => {
      setDetailsLoading(true);
      try {
        const result = await getTestProfileDetailsAction(profileId);
        if (result.success && result.data) {
          // Ensure system_prompt_id is present
          setSelectedProfile({
            ...result.data,
            system_prompt_id: result.data.system_prompt_id,
          });
          // Load recent runs for this profile
          await loadSessionRuns(profileId);
        }
      } catch (error) {
        console.error("Error loading profile details:", error);
      } finally {
        setDetailsLoading(false);
      }
    },
    [loadSessionRuns]
  );

  useEffect(() => {
    loadTestProfiles();
    loadModels();
  }, [loadTestProfiles, loadModels]);

  const handleDeleteProfile = async (id: number) => {
    const result = await deleteTestProfileAction(id);
    if (result.success) {
      loadTestProfiles();
      if (selectedProfile?.id === id) {
        setSelectedProfile(null);
      }
    } else {
      alert(result.error || "Failed to delete test session");
    }
  };

  const openDeleteDialog = (profile: { id: number; name: string }) => {
    setSessionToDelete(profile);
    setDeleteDialogOpen(true);
  };

  const handleSelectProfile = async (profile: SelectTestProfile) => {
    // Clear previous details to avoid showing them on the new profile
    setTestDetailsData({});
    setExpandedTestIds(new Set());
    await loadProfileDetails(profile.id);
  };

  const handleRunSession = async (profileId: number) => {
    try {
      setRunningSession(profileId);
      const result = await runTestSessionAction(profileId, evaluatorModel);

      if (result.success && result.data) {
        // Start polling for status updates
        const testRunId = result.data.testRunId;
        pollRunStatus(testRunId);

        // Refresh session runs if this profile is selected
        if (selectedProfile?.id === profileId) {
          loadSessionRuns(profileId);
        }
      } else {
        alert(result.error || "Failed to start test session");
        setRunningSession(null);
      }
    } catch (error) {
      console.error("Error running session:", error);
      alert("Failed to start test session");
      setRunningSession(null);
    }
  };

  const handleStopSession = async () => {
    if (!currentRunStatus) return;

    try {
      const result = await stopTestSessionAction(currentRunStatus.testRunId);
      if (result.success) {
        setRunningSession(null);
        setCurrentRunStatus(null);
        // Refresh session runs
        if (selectedProfile) {
          loadSessionRuns(selectedProfile.id);
        }
      } else {
        alert(result.error || "Failed to stop test session");
      }
    } catch (error) {
      console.error("Error stopping session:", error);
      alert("Failed to stop test session");
    }
  };

  const handleRegenerateTest = async (testId: number) => {
    if (!selectedProfile) return;

    setRegeneratingTests((prev) => new Set(prev).add(testId));
    try {
      const result = await regenerateTestResultAction(
        selectedProfile.id,
        testId
      );
      if (result.success && result.data) {
        // Start polling for this run
        const testRunId = result.data.testRunId;
        setRunningSession(selectedProfile.id);
        pollRunStatus(testRunId);

        // Refresh session runs and test details if expanded
        loadSessionRuns(selectedProfile.id);
        if (expandedTestIds.has(testId)) {
          // Re-fetch details to show "Running" status
          const profileId = selectedProfile.id;
          const detailResult = await getTestInProfileDetailsAction(
            profileId,
            testId
          );
          if (detailResult.success && detailResult.data) {
            const data = detailResult.data;
            setTestDetailsData((prev) => ({
              ...prev,
              [testId]: {
                expectedResult: data.test.expected_result,
                results: data.results,
              },
            }));
          }
        }
      } else {
        alert(result.error || "Failed to regenerate test");
      }
    } catch (error) {
      console.error("Error regenerating test:", error);
      alert("Failed to regenerate test");
    } finally {
      setRegeneratingTests((prev) => {
        const next = new Set(prev);
        next.delete(testId);
        return next;
      });
    }
  };

  const handleReEvaluateTest = async (testId: number) => {
    if (!selectedProfile) return;

    setReEvaluatingTests((prev) => new Set(prev).add(testId));
    try {
      const result = await reEvaluateTestResultAction(
        selectedProfile.id,
        testId,
        evaluatorModel
      );
      if (result.success) {
        // Refresh session runs and test details if expanded
        loadSessionRuns(selectedProfile.id);

        // Also refresh profile details to update the "Associated Tests" best scores
        await loadProfileDetails(selectedProfile.id);

        if (expandedTestIds.has(testId)) {
          // Re-fetch details to show updated scores
          const profileId = selectedProfile.id;
          const detailResult = await getTestInProfileDetailsAction(
            profileId,
            testId
          );
          if (detailResult.success && detailResult.data) {
            const data = detailResult.data;
            setTestDetailsData((prev) => ({
              ...prev,
              [testId]: {
                expectedResult: data.test.expected_result,
                results: data.results,
              },
            }));
          }
        }
      } else {
        alert(result.error || "Failed to re-evaluate test");
      }
    } catch (error) {
      console.error("Error re-evaluating test:", error);
      alert("Failed to re-evaluate test");
    } finally {
      setReEvaluatingTests((prev) => {
        const next = new Set(prev);
        next.delete(testId);
        return next;
      });
    }
  };

  const pollRunStatus = useCallback(
    async (testRunId: number) => {
      try {
        const result = await getSessionRunStatusAction(testRunId);
        if (result.success && result.data) {
          setCurrentRunStatus(result.data);

          // Continue polling if still running
          if (result.data.status === "Running") {
            setTimeout(() => pollRunStatus(testRunId), 2000); // Poll every 2 seconds
          } else {
            setRunningSession(null);
            setCurrentRunStatus(null);
            // Refresh session runs
            if (selectedProfile) {
              loadSessionRuns(selectedProfile.id);
              // Also refresh profile details to update the "Associated Tests" best scores
              loadProfileDetails(selectedProfile.id);

              // If we are polling because of a single test regeneration,
              // we should also refresh the expanded test details to show the final result
              const currentExpandedIds = Array.from(expandedTestIds);
              for (const testId of currentExpandedIds) {
                // Fetch latest details for each expanded test
                const detailResult = await getTestInProfileDetailsAction(
                  selectedProfile.id,
                  testId
                );
                if (detailResult.success && detailResult.data) {
                  const data = detailResult.data;
                  setTestDetailsData((prev) => ({
                    ...prev,
                    [testId]: {
                      expectedResult: data.test.expected_result,
                      results: data.results,
                    },
                  }));
                }
              }
            }
          }
        }
      } catch (error) {
        console.error("Error polling run status:", error);
      }
    },
    [selectedProfile, loadSessionRuns, loadProfileDetails, expandedTestIds]
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const getStatusBadge = (profile: SelectTestProfileWithPrompt) => {
    // Check if this profile is currently running (in-memory state)
    if (runningSession === profile.id) {
      return (
        <Badge variant="default" className="bg-blue-500">
          <Clock className="w-3 h-3 mr-1" />
          Running
        </Badge>
      );
    }

    // Determine status from either the selected profile's detailed runs or the profile's cached latest status
    let status: string | null = null;
    if (selectedProfile?.id === profile.id && sessionRuns.length > 0) {
      status = sessionRuns[0].status;
    } else {
      status = profile.latest_status;
    }

    if (!status) {
      return <Badge variant="secondary">Idle</Badge>;
    }

    switch (status) {
      case "Running":
        return (
          <Badge variant="default" className="bg-blue-500">
            <Clock className="w-3 h-3 mr-1" />
            Running
          </Badge>
        );
      case "Done":
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      case "Failed":
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      case "Stopped":
        return (
          <Badge variant="secondary">
            <XCircle className="w-3 h-3 mr-1" />
            Stopped
          </Badge>
        );
      default:
        return <Badge variant="secondary">Idle</Badge>;
    }
  };

  return (
    <div className="flex h-[calc(100vh-2rem)] gap-6 p-6">
      {/* Left Sidebar - Sessions List */}
      <div className="w-1/3 min-w-[320px] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Test Sessions</h1>
            <p className="text-sm text-gray-600">Manage session profiles</p>
          </div>
          <div className="flex items-center gap-2">
            <CreateTestSessionModal
              onSessionCreated={loadTestProfiles}
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
            onChange={handleSearchChange}
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
              <p className="text-sm">
                Create your first session to get started.
              </p>
            </div>
          ) : (
            testProfiles.map((profile) => (
              <Card
                key={profile.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedProfile?.id === profile.id
                    ? "ring-2 ring-neutral-500 bg-neutral-600/40 border-blue-200"
                    : ""
                }`}
                onClick={() => handleSelectProfile(profile)}
              >
                <CardHeader className="">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm font-medium truncate">
                        {profile.name}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        {getStatusBadge(profile)}
                        <span className="text-xs text-gray-500">
                          {new Date(profile.created_at).toLocaleDateString()}
                        </span>
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
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
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
              onClick={() =>
                setCurrentPage((prev) => Math.min(totalPages, prev + 1))
              }
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        )}
      </div>

      {/* Right Panel - Session Details */}
      <div className="flex-1 border rounded-lg">
        {!selectedProfile ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <Eye className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">Select a Session</h3>
              <p className="text-sm">
                Choose a test session from the left to view details and manage
                runs
              </p>
            </div>
          </div>
        ) : detailsLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p className="text-sm text-gray-600">
                Loading session details...
              </p>
            </div>
          </div>
        ) : (
          <div className="p-6 h-full">
            {/* Session Header */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold">{selectedProfile.name}</h2>
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
                    onValueChange={setEvaluatorModel}
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
                {runningSession === selectedProfile.id ? (
                  <Button
                    onClick={handleStopSession}
                    variant="destructive"
                    size="sm"
                    disabled={!currentRunStatus}
                  >
                    <Square className="w-4 h-4 mr-2" />
                    Stop Session
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleRunSession(selectedProfile.id)}
                    className="bg-green-600 hover:bg-green-700"
                    size="sm"
                    disabled={
                      selectedProfile.tests.length === 0 ||
                      selectedProfile.models.length === 0
                    }
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Run Session
                  </Button>
                )}
                <EditTestSessionModal
                  profile={selectedProfile}
                  onSessionUpdated={() => {
                    loadProfileDetails(selectedProfile.id);
                    loadTestProfiles();
                    // Clear expanded states to force refresh of results
                    setTestDetailsData({});
                    setExpandedTestIds(new Set());
                  }}
                />
                <Button
                  onClick={() =>
                    openDeleteDialog({
                      id: selectedProfile.id,
                      name: selectedProfile.name,
                    })
                  }
                  variant="destructive"
                  size="sm"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 py-2 text-sm text-gray-600 dark:text-gray-400">
              <span>
                Created on{" "}
                {new Date(selectedProfile.created_at).toLocaleDateString()} by{" "}
                {selectedProfile.username}
              </span>
              {selectedProfile.average_score !== null &&
                !isNaN(selectedProfile.average_score) && (
                  <div className="flex items-center gap-4 pl-4 border-l border-gray-300 dark:border-gray-700">
                    <div
                      className="flex items-center gap-1.5"
                      title="Total Token Cost (Lifetime)"
                    >
                      <Coins className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        $
                        {selectedProfile.total_tokens_cost
                          ? selectedProfile.total_tokens_cost.toFixed(4)
                          : "0.0000"}
                      </span>
                    </div>
                    <div
                      className="flex items-center gap-1.5"
                      title="Average Score (Lifetime)"
                    >
                      <Medal className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {selectedProfile.average_score.toFixed(1)}/10
                      </span>
                    </div>
                  </div>
                )}
            </div>

            <div className="space-y-6">
              {/* System Prompt Info - Just the button now */}
              <div className="flex items-center justify-between p-4 bg-neutral-900 border border-gray-700 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-800 rounded-md">
                    <Eye className="w-5 h-5 text-gray-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      System Prompt
                    </h3>
                    <p className="text-xs text-gray-400">
                      {selectedProfile.system_prompt
                        ? selectedProfile.system_prompt_name ||
                          `Prompt #${selectedProfile.system_prompt_id}`
                        : "No prompt assigned"}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSystemPrompt(true)}
                  disabled={!selectedProfile.system_prompt}
                  className="flex items-center gap-2 border-gray-600 bg-gray-800 text-white hover:bg-gray-700"
                >
                  <Eye className="w-4 h-4" />
                  View Prompt
                </Button>
              </div>

              {/* Associated Tests */}
              <div>
                <h3 className="text-lg font-semibold mb-3">
                  Associated Tests ({selectedProfile.tests.length})
                </h3>
                {selectedProfile.tests.length === 0 ? (
                  <Card>
                    <CardContent className="pt-4 text-center text-gray-500">
                      <p>No tests associated with this session</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {sortedTests.map((test) => (
                      <Card
                        key={test.test_id}
                        className="hover:shadow-sm transition-shadow py-4"
                      >
                        <CardContent>
                          <div className="flex items-center justify-between mb-2 gap-4">
                            <div className="flex-1 min-w-0">
                              <h4
                                className="text-base font-bold text-neutral-900 dark:text-neutral-100 line-clamp-2 leading-tight"
                                title={test.test_prompt}
                              >
                                {test.test_prompt}
                              </h4>
                            </div>
                            {test.best_model && test.best_score !== null && (
                              <Badge
                                variant="secondary"
                                className="bg-neutral-800 text-[10px] gap-1 py-0 px-2 h-5 border-neutral-700 shrink-0"
                              >
                                <Medal className="w-3 h-3 text-blue-400" />
                                <span className="text-gray-400 font-normal">
                                  {test.best_model}:
                                </span>
                                <span className="font-bold text-white">
                                  {test.best_score}/10
                                </span>
                              </Badge>
                            )}
                            <div>
                              <Button
                                title={
                                  test.best_score === null
                                    ? "Run Test"
                                    : "Regenerate Test"
                                }
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRegenerateTest(test.test_id);
                                }}
                                disabled={regeneratingTests.has(test.test_id)}
                              >
                                {regeneratingTests.has(test.test_id) ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : test.best_score === null ? (
                                  <Play className="w-4 h-4" />
                                ) : (
                                  <RefreshCcw className="w-4 h-4" />
                                )}
                              </Button>
                              {test.best_score !== null && (
                                <Button
                                  title="Re-evaluate Results"
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleReEvaluateTest(test.test_id);
                                  }}
                                  disabled={reEvaluatingTests.has(test.test_id)}
                                >
                                  {reEvaluatingTests.has(test.test_id) ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Star className="w-4 h-4" />
                                  )}
                                </Button>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 w-full mt-3">
                            <div className="flex items-center justify-between">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleTestDetails(test.test_id);
                                }}
                                disabled={loadingTestDetails.has(test.test_id)}
                              >
                                {loadingTestDetails.has(test.test_id) ? (
                                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                ) : (
                                  <Eye className="w-4 h-4 mr-1" />
                                )}
                                {expandedTestIds.has(test.test_id)
                                  ? "Hide Details"
                                  : "View Details"}
                              </Button>
                            </div>

                            {expandedTestIds.has(test.test_id) &&
                              testDetailsData[test.test_id] && (
                                <TestResultsList
                                  expectedResult={
                                    testDetailsData[test.test_id].expectedResult
                                  }
                                  results={
                                    testDetailsData[test.test_id].results
                                  }
                                />
                              )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Model Configurations */}
              <div>
                <h3 className="text-lg font-semibold mb-3">
                  Model Configurations ({selectedProfile.models.length})
                </h3>
                {selectedProfile.models.length === 0 ? (
                  <Card>
                    <CardContent className="pt-4 text-center text-gray-500">
                      <p>No models configured for this session</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {selectedProfile.models.map((model) => (
                      <Badge key={model.id} variant="outline">
                        {model.model_name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Runs */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Recent Runs</h3>
                {runsLoading ? (
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                      <p>Loading recent runs...</p>
                    </CardContent>
                  </Card>
                ) : sessionRuns.length === 0 ? (
                  <Card>
                    <CardContent className="pt-4 text-center text-gray-500">
                      <Clock className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      <p>No recent runs found</p>
                      <p className="text-sm">
                        Run this session to see results here
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {sessionRuns.map((run) => (
                      <Card
                        key={run.testRunId}
                        className="hover:shadow-sm transition-shadow"
                      >
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium">
                                  Run #{run.testRunId}
                                </h4>
                                {run.status === "Running" ? (
                                  <Badge
                                    variant="default"
                                    className="bg-blue-500"
                                  >
                                    <Clock className="w-3 h-3 mr-1" />
                                    Running
                                  </Badge>
                                ) : run.status === "Done" ? (
                                  <Badge
                                    variant="default"
                                    className="bg-green-500"
                                  >
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Completed
                                  </Badge>
                                ) : run.status === "Failed" ? (
                                  <Badge variant="destructive">
                                    <XCircle className="w-3 h-3 mr-1" />
                                    Failed
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary">
                                    <XCircle className="w-3 h-3 mr-1" />
                                    Stopped
                                  </Badge>
                                )}
                              </div>
                              <div className="flex gap-4 text-sm text-gray-600">
                                <span>Total: {run.totalTests}</span>
                                {run.results && (
                                  <>
                                    <span className="text-green-600">
                                      ✓ {run.results.success}
                                    </span>
                                    <span className="text-red-600">
                                      ✗ {run.results.failed}
                                    </span>
                                    {run.results.pending > 0 && (
                                      <span className="text-gray-600">
                                        ⏳ {run.results.pending}
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-right">
                                <div className="text-sm font-medium">
                                  {run.completedTests}/{run.totalTests}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {Math.round(
                                    (run.completedTests / run.totalTests) * 100
                                  )}
                                  %
                                </div>
                              </div>
                              <div className="w-16 bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full transition-all ${
                                    run.status === "Done"
                                      ? "bg-green-500"
                                      : run.status === "Failed"
                                      ? "bg-red-500"
                                      : "bg-blue-500"
                                  }`}
                                  style={{
                                    width: `${
                                      (run.completedTests / run.totalTests) *
                                      100
                                    }%`,
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {sessionToDelete && (
        <DeleteTestSessionDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          sessionName={sessionToDelete.name}
          onConfirm={() => handleDeleteProfile(sessionToDelete.id)}
        />
      )}
      {/* View System Prompt Dialog */}
      {selectedProfile && (
        <ViewSystemPromptDialog
          open={showSystemPrompt}
          onOpenChange={setShowSystemPrompt}
          name={
            selectedProfile.system_prompt_name ||
            `Prompt #${selectedProfile.system_prompt_id}`
          }
          prompt={selectedProfile.system_prompt}
        />
      )}
    </div>
  );
}
