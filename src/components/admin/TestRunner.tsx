"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAvailableModels, type ModelOption } from "@/app/actions/models";
import { Play, Loader2, Square } from "lucide-react";
import { toast } from "react-toastify";

interface TestRunnerProps {
  onTestsComplete?: () => void;
}

export default function TestRunner({ onTestsComplete }: TestRunnerProps) {
  const [models, setModels] = useState<ModelOption[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [selectedEvaluatorModel, setSelectedEvaluatorModel] = useState<string>("");
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTestRunId, setCurrentTestRunId] = useState<number | null>(null);
  const [testProgress, setTestProgress] = useState<{ completed: number; total: number } | null>(null);
  const wasRunningRef = useRef(false);

  // Function to check test status
  const checkTestStatus = useCallback(async () => {
    try {
      const statusResponse = await fetch('/api/admin/test-status');
      if (statusResponse.ok) {
        const statusResult = await statusResponse.json();
        
        // Check if tests were running and now completed
        const wasRunning = wasRunningRef.current;
        const isStillRunning = statusResult.isRunning;
        
        setIsRunning(isStillRunning);
        if (isStillRunning) {
          setCurrentTestRunId(statusResult.currentTestRunId);
          // Set progress if available
          if (statusResult.progress) {
            setTestProgress(statusResult.progress);
          }
        } else {
          setCurrentTestRunId(null);
          setTestProgress(null);
          
          // If tests were running and now stopped, trigger refresh
          if (wasRunning && !isStillRunning) {
            setTimeout(() => {
              onTestsComplete?.();
            }, 1000); // Small delay to ensure backend processing is complete
          }
        }
        
        // Update the ref for next iteration
        wasRunningRef.current = isStillRunning;
      }
    } catch (error) {
      console.error("Error checking test status:", error);
    }
  }, [onTestsComplete]);

  useEffect(() => {
    async function loadModelsAndCheckStatus() {
      try {
        // Load available models
        const availableModels = await getAvailableModels();
        setModels(availableModels);
        // Set GPT-4o as default, fallback to first model if not available
        const defaultModel = availableModels.find(model => model.id === "openai/gpt-4o") || availableModels[0];
        if (defaultModel) {
          setSelectedModel(defaultModel.id);
        }
        
        // Set evaluator model default to GPT-4o or first available model
        const defaultEvaluatorModel = availableModels.find(model => model.id === "openai/gpt-4o") || availableModels[0];
        if (defaultEvaluatorModel) {
          setSelectedEvaluatorModel(defaultEvaluatorModel.id);
        }

        // Initial status check
        await checkTestStatus();
      } catch (error) {
        console.error("Error loading models or status:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadModelsAndCheckStatus();
  }, [checkTestStatus]);

  // Polling effect for test status updates
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(checkTestStatus, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }, [isRunning, checkTestStatus]);

  const handleRunTests = async () => {
    if (!selectedModel || !selectedEvaluatorModel) {
      toast.error("Please select both models first");
      return;
    }

    setIsRunning(true);
    setTestProgress(null); // Reset progress
    try {
      const response = await fetch('/api/admin/run-tests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selectedModel,
          selectedEvaluatorModel
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setCurrentTestRunId(result.testRunId);
        toast.success(`Tests started successfully! ${result.message}`);
      } else {
        toast.error(`Failed to start tests: ${result.error || 'Unknown error'}`);
        setIsRunning(false);
      }
    } catch (error) {
      console.error("Error running tests:", error);
      toast.error("Failed to run tests");
      setIsRunning(false);
    }
  };

  const handleStopTests = async () => {
    if (!currentTestRunId) {
      toast.error("No test run to stop");
      return;
    }

    try {
      const response = await fetch('/api/admin/stop-tests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testRunId: currentTestRunId
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success("Tests will stop after the current test completes");
        // Check status immediately after stopping
        await checkTestStatus();
      } else {
        toast.error(`Failed to stop tests: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Error stopping tests:", error);
      toast.error("Failed to stop tests");
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-center">Run Tests</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isRunning && (
          <>
            <div>
              <label htmlFor="model-select" className="block text-sm font-medium mb-2">
                Select Model
              </label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger id="model-select">
                  <SelectValue placeholder="Choose a model" />
                </SelectTrigger>
                <SelectContent>
                  {models.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label htmlFor="evaluator-select" className="block text-sm font-medium mb-2">
                Select Evaluator Model
              </label>
              <Select value={selectedEvaluatorModel} onValueChange={setSelectedEvaluatorModel}>
                <SelectTrigger id="evaluator-select">
                  <SelectValue placeholder="Choose an evaluator model" />
                </SelectTrigger>
                <SelectContent>
                  {models.map((model) => (
                    <SelectItem key={`eval-${model.id}`} value={model.id}>
                      {model.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}
        
        {isRunning && testProgress && (
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">
              Progress: {testProgress.completed}/{testProgress.total} tests completed
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${(testProgress.completed / testProgress.total) * 100}%` }}
              ></div>
            </div>
          </div>
        )}
        
        <Button 
          onClick={isRunning ? handleStopTests : handleRunTests} 
          disabled={!selectedModel || !selectedEvaluatorModel}
          className="w-full"
          size="lg"
        >
          {isRunning ? (
            <>
              <Square className="mr-2 h-4 w-4" />
              Stop Tests
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Run All Tests
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}