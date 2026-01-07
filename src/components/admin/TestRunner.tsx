"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { getAvailableModels, type ModelOption } from "@/app/actions/models";
import { getSystemPromptAction } from "@/app/actions/settings";
import { Play, Loader2, Square, Settings, X } from "lucide-react";
import { toast } from "react-toastify";

interface TestRunnerProps {
  onTestsComplete?: () => void;
  isTestsRunning?: boolean;
}

export default function TestRunner({ onTestsComplete, isTestsRunning }: TestRunnerProps) {
  const [models, setModels] = useState<ModelOption[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [selectedEvaluatorModel, setSelectedEvaluatorModel] = useState<string>("");
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTestRunId, setCurrentTestRunId] = useState<number | null>(null);
  const [isConfigureOpen, setIsConfigureOpen] = useState(false);
  const [isConfigureVisible, setIsConfigureVisible] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState<string>("");

  // Handle opening the sidebar with animation
  const handleOpenConfigure = () => {
    setIsConfigureVisible(true);
    setTimeout(() => setIsConfigureOpen(true), 10);
  };

  // Handle closing the sidebar with animation
  const handleCloseConfigure = () => {
    setIsConfigureOpen(false);
    setTimeout(() => setIsConfigureVisible(false), 300);
  };

  // Check initial test status on component mount
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

        // Load default system prompt
        try {
          const defaultSystemPrompt = await getSystemPromptAction();
          setSystemPrompt(defaultSystemPrompt);
        } catch (error) {
          console.error("Error loading system prompt:", error);
          setSystemPrompt("You are a helpful assistant.");
        }

        // Check if tests are currently running
        const statusResponse = await fetch('/api/admin/test-status');
        if (statusResponse.ok) {
          const statusResult = await statusResponse.json();
          setIsRunning(statusResult.isRunning);
          if (statusResult.isRunning) {
            setCurrentTestRunId(statusResult.currentTestRunId);
          }
        }
      } catch (error) {
        console.error("Error loading models or status:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadModelsAndCheckStatus();
  }, []);

  const handleRunTests = async () => {
    if (!selectedModel || !selectedEvaluatorModel) {
      toast.error("Please select both models first");
      return;
    }

    if (!systemPrompt.trim()) {
      toast.error("Please enter a system prompt");
      return;
    }

    setIsRunning(true);
    try {
      const response = await fetch('/api/admin/run-tests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selectedModel,
          selectedEvaluatorModel,
          systemPrompt: systemPrompt.trim()
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setCurrentTestRunId(result.testRunId);
        toast.success(`Tests started with custom system prompt! ${result.message}`);
        // Notify parent component that tests have started
        onTestsComplete?.();
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
        // Reset local state since stop was successful
        setIsRunning(false);
        setCurrentTestRunId(null);
        // Notify parent component that stop was requested
        onTestsComplete?.();
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
    <>
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold">Run Tests</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenConfigure}
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Configure
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={(isTestsRunning ?? isRunning) ? handleStopTests : handleRunTests} 
            disabled={!selectedModel || !selectedEvaluatorModel || !systemPrompt.trim()}
            className="w-full"
            size="lg"
          >
            {(isTestsRunning ?? isRunning) ? (
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

      {/* Configuration Sidebar */}
      {isConfigureVisible && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div 
            className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ease-in-out ${
              isConfigureOpen ? 'opacity-100' : 'opacity-0'
            }`}
            onClick={handleCloseConfigure}
          />
          
          {/* Sidebar */}
          <div className={`absolute right-0 top-0 h-full w-96 bg-background border-l shadow-xl transition-transform duration-300 ease-in-out ${
            isConfigureOpen ? 'translate-x-0' : 'translate-x-full'
          }`}>
            <div className="flex h-full flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-border">
                <h2 className="text-lg font-semibold text-foreground">Configuration</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCloseConfigure}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Content */}
              <div className="flex-1 p-6 space-y-6 overflow-y-auto">
                <div>
                  <label htmlFor="sidebar-model-select" className="block text-sm font-medium text-foreground mb-3">
                    Model
                  </label>
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger id="sidebar-model-select">
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
                  <p className="text-xs text-muted-foreground mt-2">
                    This model will be used to run the tests.
                  </p>
                </div>
                
                <div>
                  <label htmlFor="sidebar-evaluator-select" className="block text-sm font-medium text-foreground mb-3">
                    Evaluator Model
                  </label>
                  <Select value={selectedEvaluatorModel} onValueChange={setSelectedEvaluatorModel}>
                    <SelectTrigger id="sidebar-evaluator-select">
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
                  <p className="text-xs text-muted-foreground mt-2">
                    This model will be used to evaluate the responses generated by the main model.
                  </p>
                </div>
                
                <div>
                  <label htmlFor="sidebar-system-prompt" className="block text-sm font-medium text-foreground mb-3">
                    System Prompt
                  </label>
                  <Textarea
                    id="sidebar-system-prompt"
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    placeholder="Enter system prompt for the AI model..."
                    className="h-24 resize-none overflow-y-auto"
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    This will be used as the system message for the ai chatbot.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-border">
                <Button 
                  onClick={handleCloseConfigure}
                  className="w-full"
                >
                  Apply Configuration
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}