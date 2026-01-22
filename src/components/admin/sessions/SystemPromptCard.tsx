import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SystemPromptCardProps {
  systemPrompt: string | null;
  systemPromptName: string | null;
  systemPromptId: number | null;
  onView: () => void;
}

export function SystemPromptCard({
  systemPrompt,
  systemPromptName,
  systemPromptId,
  onView,
}: SystemPromptCardProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-neutral-900 border border-gray-700 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gray-800 rounded-md">
          <Eye className="w-5 h-5 text-gray-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">System Prompt</h3>
          <p className="text-xs text-gray-400">
            {systemPrompt
              ? systemPromptName || `Prompt #${systemPromptId}`
              : "No prompt assigned"}
          </p>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onView}
        disabled={!systemPrompt}
        className="flex items-center gap-2 border-gray-600 bg-gray-800 text-white hover:bg-gray-700"
      >
        <Eye className="w-4 h-4" />
        View Prompt
      </Button>
    </div>
  );
}
