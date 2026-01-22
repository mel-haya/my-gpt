"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Loader2, Eye } from "lucide-react";
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
  type TestInProfileDetailResult,
} from "@/app/actions/testSessions";
import { getAvailableModels, type ModelOption } from "@/app/actions/models";
import { SessionsListSidebar } from "@/components/admin/sessions/SessionsListSidebar";
import { SessionHeader } from "@/components/admin/sessions/SessionHeader";
import { SystemPromptCard } from "@/components/admin/sessions/SystemPromptCard";
import { ModelRankingsCard } from "@/components/admin/sessions/ModelRankingsCard";
import { AssociatedTestsList } from "@/components/admin/sessions/AssociatedTestsList";
import { ModelConfigurationsList } from "@/components/admin/sessions/ModelConfigurationsList";
import { RecentRunsList } from "@/components/admin/sessions/RecentRunsList";
import type { SelectTestProfileWithPrompt } from "@/lib/db-schema";
import type { DetailedTestProfile } from "@/services/testProfilesService";

export default function SessionsPage() {
  const [testProfiles, setTestProfiles] = useState<
    SelectTestProfileWithPrompt[]
  >([]);
  const [selectedProfile, setSelectedProfile] =
    useState<DetailedTestProfile | null>(null);
  const [selectedTestId, setSelectedTestId] = useState<number | string | null>(
    null,
  );
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
  const [testDetailsData, setTestDetailsData] =
    useState<TestInProfileDetailResult | null>(null);
  const [testDetailsLoading, setTestDetailsLoading] = useState(false);
  const [regeneratingTests, setRegeneratingTests] = useState<
    Set<number | string>
  >(new Set());
  const [reEvaluatingTests, setReEvaluatingTests] = useState<
    Set<number | string>
  >(new Set());

  const loadTestDetails = useCallback(
    async (testId: number | string) => {
      if (!selectedProfile) return;
      setTestDetailsLoading(true);
      try {
        const result = await getTestInProfileDetailsAction(
          selectedProfile.id,
          testId,
        );
        if (result.success && result.data) {
          setTestDetailsData(result.data);
        }
      } catch (error) {
        console.error("Error loading test details:", error);
      } finally {
        setTestDetailsLoading(false);
      }
    },
    [selectedProfile],
  );

  const handleToggleTestDetails = useCallback(
    (testId: number | string) => {
      if (selectedTestId === testId) {
        setSelectedTestId(null);
        setTestDetailsData(null); // Clear data when collapsing
      } else {
        setSelectedTestId(testId);
        loadTestDetails(testId);
      }
    },
    [selectedTestId, loadTestDetails],
  );

  const loadTestProfiles = useCallback(
    async (silent: boolean = false) => {
      if (!silent) setLoading(true);
      try {
        const result = await getTestProfilesAction(
          searchQuery,
          10,
          currentPage,
        );
        if (result.success && result.data) {
          setTestProfiles(result.data.testProfiles);
          setTotalPages(result.data.totalPages);
        }
      } catch (error) {
        console.error("Error loading test profiles:", error);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [searchQuery, currentPage],
  );

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
    async (profileId: number, silent: boolean = false) => {
      if (!silent) setDetailsLoading(true);
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
        if (!silent) setDetailsLoading(false);
      }
    },
    [loadSessionRuns],
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

  const handleSelectProfile = async (profile: SelectTestProfileWithPrompt) => {
    // Clear previous details to avoid showing them on the new profile
    setTestDetailsData(null);
    setSelectedTestId(null);
    await loadProfileDetails(profile.id);
  };

  const pollRunStatus = useCallback(
    async (testRunId: number, testId?: number | string) => {
      try {
        const result = await getSessionRunStatusAction(testRunId);
        if (result.success && result.data) {
          setCurrentRunStatus(result.data);

          // Continue polling if still running
          if (result.data.status === "Running") {
            setTimeout(() => pollRunStatus(testRunId, testId), 2000); // Poll every 2 seconds
          } else {
            setRunningSession(null);
            setCurrentRunStatus(null);
            // Refresh session runs
            if (selectedProfile) {
              loadSessionRuns(selectedProfile.id);
              // Also refresh profile details
              loadProfileDetails(selectedProfile.id, true);
              // Refresh the entire list to update stats (tokens, cost, score)
              loadTestProfiles(true);

              // If we are polling because of a single test regeneration, refresh its details
              if (testId && selectedTestId === testId) {
                loadTestDetails(testId);
              } else if (selectedTestId) {
                loadTestDetails(selectedTestId);
              }
            }
          }
        }
      } catch (error) {
        console.error("Error polling run status:", error);
      }
    },
    [
      selectedProfile,
      loadSessionRuns,
      loadProfileDetails,
      selectedTestId,
      loadTestDetails,
      loadTestProfiles,
    ],
  );

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

  const handleRegenerateTest = async (
    testId: number | string,
    modelUsed?: string,
  ) => {
    if (!selectedProfile) return;
    setRegeneratingTests((prev) => new Set(prev).add(testId));
    setRunningSession(selectedProfile.id);
    try {
      const result = await regenerateTestResultAction(
        selectedProfile.id,
        testId,
        modelUsed,
      );
      if (result.success && result.data) {
        // Start polling for status updates
        pollRunStatus(result.data.testRunId, testId);

        // Reload details if this is the currently expanded test
        if (selectedTestId === testId) {
          loadTestDetails(testId);
        }
        loadProfileDetails(selectedProfile.id);
      } else {
        setRunningSession(null);
      }
    } catch (error) {
      console.error("Error regenerating test:", error);
      setRunningSession(null);
    } finally {
      setRegeneratingTests((prev) => {
        const next = new Set(prev);
        next.delete(testId);
        return next;
      });
    }
  };

  const handleReEvaluateTest = async (testId: number | string) => {
    if (!selectedProfile) return;
    setReEvaluatingTests((prev) => new Set(prev).add(testId));
    try {
      const result = await reEvaluateTestResultAction(
        selectedProfile.id,
        testId,
        "openai/gpt-4o",
      );
      if (result.success) {
        if (selectedTestId === testId) {
          loadTestDetails(testId);
        }
        loadProfileDetails(selectedProfile.id);
        loadTestProfiles(true);
      }
    } catch (error) {
      console.error("Error re-evaluating test:", error);
    } finally {
      setReEvaluatingTests((prev) => {
        const next = new Set(prev);
        next.delete(testId);
        return next;
      });
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  // Get the winner model from backend-computed model_averages
  const winnerModel = useMemo(() => {
    if (
      !selectedProfile?.model_averages ||
      selectedProfile.model_averages.length === 0
    )
      return null;

    // model_averages is already sorted by average_score descending
    const winner = selectedProfile.model_averages[0];
    return { model: winner.model, avgScore: winner.average_score };
  }, [selectedProfile?.model_averages]);

  return (
    <div className="flex h-[calc(100vh-2rem)] gap-6 p-6 custom-scrollbar">
      {/* Left Sidebar - Sessions List */}
      <SessionsListSidebar
        testProfiles={testProfiles}
        selectedProfileId={selectedProfile?.id || null}
        loading={loading}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        onSelectProfile={handleSelectProfile}
        onSessionCreated={loadTestProfiles}
        availableModels={availableModels}
        runningSessionId={runningSession}
        sessionRuns={sessionRuns}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      {/* Right Panel - Session Details */}
      <div className="flex-1 border rounded-lg overflow-y-auto h-full">
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
          <div className="p-6 min-h-full">
            <SessionHeader
              profile={selectedProfile}
              currentRunStatus={currentRunStatus}
              availableModels={availableModels}
              evaluatorModel={evaluatorModel}
              onEvaluatorModelChange={setEvaluatorModel}
              isRunning={runningSession === selectedProfile.id}
              onRunSession={() => handleRunSession(selectedProfile.id)}
              onStopSession={handleStopSession}
              onDeleteSession={() => openDeleteDialog(selectedProfile)}
              onSessionUpdated={() => {
                loadProfileDetails(selectedProfile.id);
                loadTestProfiles();
                // Clear expanded states to force refresh of results
                setTestDetailsData(null);
                setSelectedTestId(null);
              }}
              winnerModel={winnerModel}
            />

            <div className="space-y-6">
              <SystemPromptCard
                systemPrompt={selectedProfile.system_prompt}
                systemPromptName={selectedProfile.system_prompt_name}
                systemPromptId={selectedProfile.system_prompt_id}
                onView={() => setShowSystemPrompt(true)}
              />

              <ModelRankingsCard
                modelAverages={selectedProfile.model_averages}
              />

              <AssociatedTestsList
                tests={selectedProfile.tests}
                selectedTestId={selectedTestId}
                testDetailsData={testDetailsData}
                testDetailsLoading={testDetailsLoading}
                regeneratingTests={regeneratingTests}
                reEvaluatingTests={reEvaluatingTests}
                onRegenerateTest={handleRegenerateTest}
                onReEvaluateTest={handleReEvaluateTest}
                onToggleTestDetails={handleToggleTestDetails}
              />

              <ModelConfigurationsList models={selectedProfile.models} />

              <RecentRunsList runs={sessionRuns} loading={runsLoading} />
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
          systemPromptId={selectedProfile.system_prompt_id}
          name={
            selectedProfile.system_prompt_name ||
            `Prompt #${selectedProfile.system_prompt_id}`
          }
          prompt={selectedProfile.system_prompt}
          onPromptUpdated={() => {
            loadProfileDetails(selectedProfile.id);
            loadTestProfiles(true);
          }}
          isDefault={selectedProfile.system_prompt_default}
          testProfileId={selectedProfile.id}
        />
      )}
    </div>
  );
}
