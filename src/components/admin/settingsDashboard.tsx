"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "react-toastify";
import { Loader2, Save } from "lucide-react";

export default function SettingsDashboard() {
  const [systemPrompt, setSystemPrompt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSystemPrompt();
  }, []);

  const fetchSystemPrompt = async () => {
    try {
      const response = await fetch("/api/admin/settings");
      if (response.ok) {
        const data = await response.json();
        setSystemPrompt(data.systemPrompt);
      } else {
        toast.error("Failed to fetch settings");
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Failed to fetch settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!systemPrompt.trim()) {
      toast.error("System prompt cannot be empty");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ systemPrompt: systemPrompt.trim() }),
      });

      if (response.ok) {
        toast.success("Settings saved successfully");
      } else {
        toast.error("Failed to save settings");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    const defaultPrompt = `You are a helpful assistant with access to a knowledge base. 
When users ask questions, search the knowledge base for relevant information.
Always search before answering if the question might relate to uploaded documents.
Base your answers on the search results when available. Give concise answers that correctly answer what the user is asking for. Do not flood them with all the information from the search results.`;
    
    setSystemPrompt(defaultPrompt);
  };

  if (loading) {
    return (
      <div className="flex-1 p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Configure system-wide settings and preferences.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>System Prompt</CardTitle>
            <CardDescription>
              Configure the system prompt that guides the AI assistant&apos;s behavior and responses.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Enter the system prompt for the AI assistant..."
              className="min-h-[200px] resize-y"
            />
            <div className="flex gap-2">
              <Button 
                onClick={handleSave} 
                disabled={saving}
                className="flex items-center gap-2"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Changes
              </Button>
              <Button 
                variant="outline" 
                onClick={handleReset}
                disabled={saving}
              >
                Reset to Default
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}