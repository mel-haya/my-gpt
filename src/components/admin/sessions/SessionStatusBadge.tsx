import { Clock, CheckCircle, XCircle, Pause } from "lucide-react";
import type { SelectTestProfileWithPrompt } from "@/lib/db-schema";
import type { SessionRunResult } from "@/app/actions/testSessions";

interface SessionStatusBadgeProps {
  profile: SelectTestProfileWithPrompt;
  isSelected?: boolean;
  runningSessionId: number | null;
  sessionRuns?: SessionRunResult[];
}

export function SessionStatusBadge({
  profile,
  isSelected,
  runningSessionId,
  sessionRuns = [],
}: SessionStatusBadgeProps) {
  // Check if this profile is currently running (in-memory state)
  if (runningSessionId === profile.id) {
    return (
      <div className="group relative" title="Running">
        <Clock className="w-3 h-3 text-blue-500 animate-pulse" />
        <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1 px-1.5 py-0.5 bg-gray-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
          Running
        </span>
      </div>
    );
  }

  // Determine status from either the selected profile's detailed runs or the profile's cached latest status
  let status: string | null = null;
  if (isSelected && sessionRuns.length > 0) {
    status = sessionRuns[0].status;
  } else {
    status = profile.latest_status;
  }

  if (!status) {
    return (
      <div className="group relative" title="Idle">
        <Pause className="w-3 h-3 text-gray-400" />
        <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1 px-1.5 py-0.5 bg-gray-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
          Idle
        </span>
      </div>
    );
  }

  switch (status) {
    case "Running":
      return (
        <div className="group relative" title="Running">
          <Clock className="w-3 h-3 text-blue-500 animate-pulse" />
          <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1 px-1.5 py-0.5 bg-gray-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
            Running
          </span>
        </div>
      );
    case "Done":
      return (
        <div className="group relative" title="Completed">
          <CheckCircle className="w-3 h-3 text-green-500" />
          <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1 px-1.5 py-0.5 bg-gray-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
            Completed
          </span>
        </div>
      );
    case "Failed":
      return (
        <div className="group relative" title="Failed">
          <XCircle className="w-3 h-3 text-red-500" />
          <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1 px-1.5 py-0.5 bg-gray-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
            Failed
          </span>
        </div>
      );
    case "Stopped":
      return (
        <div className="group relative" title="Stopped">
          <XCircle className="w-3 h-3 text-orange-500" />
          <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1 px-1.5 py-0.5 bg-gray-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
            Stopped
          </span>
        </div>
      );
    default:
      return (
        <div className="group relative" title="Idle">
          <Pause className="w-3 h-3 text-gray-400" />
          <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1 px-1.5 py-0.5 bg-gray-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
            Idle
          </span>
        </div>
      );
  }
}
