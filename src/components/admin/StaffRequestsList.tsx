"use client";

import { SelectStaffRequest } from "@/lib/db-schema";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  AlertCircle,
  Trash2,
} from "lucide-react";

type StaffRequestWithDetails = SelectStaffRequest & {
  completer_name: string | null;
  hotel_name: string | null;
};

interface StaffRequestsListProps {
  requests: StaffRequestWithDetails[];
  onComplete: (request: SelectStaffRequest) => void;
  onDelete: (request: SelectStaffRequest) => void;
  showHotelColumn?: boolean;
  showAdminContent?: boolean;
}

export function StaffRequestsList({
  requests,
  onComplete,
  onDelete,
  showHotelColumn = false,
  showAdminContent = false,
}: StaffRequestsListProps) {
  if (requests.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        No requests found matching your criteria.
      </div>
    );
  }

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case "critical":
        return <AlertCircle className="h-4 w-4 text-white" />;
      case "high":
        return <AlertTriangle className="h-4 w-4 text-white" />;
      case "medium":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "low":
        return <Clock className="h-4 w-4 text-gray-500" />;
      default:
        return null;
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "critical":
        return "bg-red-500 text-white hover:bg-red-600 border-red-600 font-semibold shadow-sm shadow-red-500/30 animate-pulse";
      case "high":
        return "bg-orange-500 text-white hover:bg-orange-600 border-orange-600 font-semibold shadow-sm shadow-orange-500/30";
      case "medium":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200";
      case "low":
        return "bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getCardUrgencyStyle = (urgency: string) => {
    switch (urgency) {
      case "critical":
        return "ring-2 ring-red-500/60 border-red-300 bg-red-50/30 dark:bg-red-950/20";
      case "high":
        return "ring-2 ring-orange-400/50 border-orange-200 bg-orange-50/20 dark:bg-orange-950/10";
      default:
        return "";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "done":
        return "bg-green-100 text-green-800 hover:bg-green-200 border-green-200";
      case "in_progress":
        return "bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200";
      default:
        return "bg-secondary text-secondary-foreground hover:bg-secondary/80";
    }
  };

  const getDisplayText = (
    adminValue: string | null | undefined,
    fallbackValue: string,
  ) => {
    if (!showAdminContent) {
      return fallbackValue;
    }
    const trimmed = adminValue?.trim();
    return trimmed ? trimmed : fallbackValue;
  };

  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <div
          key={request.id}
          className={`bg-card text-card-foreground rounded-lg border shadow-sm p-4 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center transition-all hover:shadow-md ${getCardUrgencyStyle(request.urgency)}`}
        >
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="outline"
                className={`flex items-center gap-1.5 ${getUrgencyColor(
                  request.urgency,
                )}`}
              >
                {getUrgencyIcon(request.urgency)}
                <span className="capitalize">{request.urgency}</span>
              </Badge>
              <Badge
                variant="outline"
                className={getStatusColor(request.status)}
              >
                {request.status.replace("_", " ")}
              </Badge>
              <Badge variant="secondary" className="font-mono">
                {request.category.replace("_", " ")}
              </Badge>
              {!!request.room_number && (
                <Badge variant="outline">Room {request.room_number}</Badge>
              )}
              {!!request.guest_contact && (
                <Badge
                  variant="outline"
                  className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                >
                  📞 {request.guest_contact}
                </Badge>
              )}
              {showHotelColumn && (
                <Badge
                  variant="secondary"
                  className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                >
                  {request.hotel_name || "N/A"}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground ml-auto md:ml-2">
                Created {formatDistanceToNow(new Date(request.created_at))} ago
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-lg">
                {getDisplayText(request.admin_title, request.title)}
              </h3>
              <p className="text-muted-foreground text-sm mt-1">
                {getDisplayText(request.admin_description, request.description)}
              </p>
            </div>
            {(request.completion_note || request.completed_at) && (
              <div className="bg-muted/50 p-3 rounded-md text-sm mt-2 border">
                <div className="font-medium flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Completed by {request.completer_name || "staff"}
                  {request.completed_at && (
                    <span className="text-muted-foreground font-normal text-xs">
                      •{" "}
                      {formatDistanceToNow(new Date(request.completed_at), {
                        addSuffix: true,
                      })}
                    </span>
                  )}
                </div>
                {request.completion_note && (
                  <p className="text-muted-foreground mt-1 ml-6">
                    &quot;{request.completion_note}&quot;
                  </p>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            {request.status !== "done" && (
              <Button onClick={() => onComplete(request)}>Complete</Button>
            )}
            <Button
              variant="outline"
              size="icon"
              className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => onDelete(request)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
