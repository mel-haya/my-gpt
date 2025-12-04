import { useTokenUsage } from "@/hooks/useTokenUsage";
import { useEffect } from "react";

export default function MessagesLimit() {
  const { usage, loading, error } = useTokenUsage();
  if (!usage) return null;
  const { todaysUsage, remainingMessages, hasReachedLimit } = usage;

  // Calculate the percentage of messages remaining
  const percentageRemaining = Math.max(
    0,
    (remainingMessages / todaysUsage.daily_message_limit) * 100
  );

  return (
    <div className="rounded flex flex-col gap-2">
      <h2 className="text-md font-semibold ">Daily Messages</h2>
      {/* Progress bar container */}
      <div className=" bg-gray-200 rounded-full h-1">
        <div
          className="h-1 rounded-full transition-all duration-300 ease-in-out"
          style={{
            width: `${percentageRemaining}%`,
            background: hasReachedLimit
              ? "linear-gradient(90deg, #8B5CF6, #A855F7)"
              : "linear-gradient(90deg, #8B5CF6, #A855F7)",
          }}
        />
      </div>
        <div className="flex justify-between text-sm text-gray-500 mb-2">
          <span>{remainingMessages} messages remaining</span>
        </div>
    </div>
  );
}
