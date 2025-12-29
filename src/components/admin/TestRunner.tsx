"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAvailableModels, type ModelOption } from "@/app/actions/models";
import { Play, Loader2 } from "lucide-react";

export default function TestRunner() {
  const [models, setModels] = useState<ModelOption[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadModels() {
      try {
        const availableModels = await getAvailableModels();
        setModels(availableModels);
        // Set GPT-4o as default, fallback to first model if not available
        const defaultModel = availableModels.find(model => model.id === "openai/gpt-4o") || availableModels[0];
        if (defaultModel) {
          setSelectedModel(defaultModel.id);
        }
      } catch (error) {
        console.error("Error loading models:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadModels();
  }, []);

  const handleRunTests = async () => {
    if (!selectedModel) {
      alert("Please select a model first");
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
          selectedModel
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        alert(`Tests started successfully! ${result.message}`);
        // Optionally redirect to view test results or refresh the page
        window.location.reload();
      } else {
        alert(`Failed to start tests: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Error running tests:", error);
      alert("Failed to run tests");
    } finally {
      setIsRunning(false);
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
        
        <Button 
          onClick={handleRunTests} 
          disabled={isRunning || !selectedModel}
          className="w-full"
          size="lg"
        >
          {isRunning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running Tests...
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