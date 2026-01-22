import { Trophy, Coins, DollarSign } from "lucide-react";
import { formatTokens } from "@/lib/utils";

interface ModelAverage {
  model: string;
  average_score: number;
  total_tokens: number;
  total_cost: number;
}

interface ModelRankingsCardProps {
  modelAverages: ModelAverage[];
}

export function ModelRankingsCard({ modelAverages }: ModelRankingsCardProps) {
  if (!modelAverages || modelAverages.length === 0) {
    return null;
  }

  return (
    <div className="p-4 bg-neutral-900 border border-gray-700 rounded-lg">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 bg-gray-800 rounded-md">
          <Trophy className="w-5 h-5 text-amber-500" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Model Rankings</h3>
          <p className="text-xs text-gray-400">
            Average score per model (latest runs)
          </p>
        </div>
      </div>
      <div className="space-y-2">
        {modelAverages.map((modelAvg, index) => (
          <div
            key={modelAvg.model}
            className="flex items-center justify-between p-2 bg-gray-800 rounded-md"
          >
            <div className="flex items-center gap-2">
              <span
                className={`text-sm font-bold ${
                  index === 0
                    ? "text-amber-500"
                    : index === 1
                      ? "text-gray-400"
                      : index === 2
                        ? "text-amber-700"
                        : "text-gray-500"
                }`}
              >
                #{index + 1}
              </span>
              <span className="text-sm text-white">
                {modelAvg.model.split("/").pop()}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5" title="Total Tokens">
                <Coins className="w-3 h-3 text-yellow-600 dark:text-yellow-400" />
                <span className="text-xs text-gray-400">
                  {formatTokens(modelAvg.total_tokens)}
                </span>
              </div>
              <div className="flex items-center gap-1.5" title="Total Cost">
                <DollarSign className="w-3 h-3 text-green-600 dark:text-green-400" />
                <span className="text-xs text-gray-400">
                  ${modelAvg.total_cost.toFixed(4)}
                </span>
              </div>
              <span
                className={`text-sm font-medium ${
                  modelAvg.average_score >= 8
                    ? "text-green-500"
                    : modelAvg.average_score >= 6
                      ? "text-yellow-500"
                      : "text-red-500"
                }`}
              >
                {modelAvg.average_score.toFixed(2)}/10
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
