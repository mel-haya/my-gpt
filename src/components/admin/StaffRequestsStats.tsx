"use client";

import { Card, CardContent } from "@/components/ui/card";
import { StaffRequestStats } from "@/services/staffRequestsService";
import { ClipboardList, Clock3, CheckCircle2, Timer } from "lucide-react";

interface StaffRequestsStatsProps {
  stats: StaffRequestStats;
}

export function StaffRequestsStats({ stats }: StaffRequestsStatsProps) {
  const formatResponseTime = (minutes: number | null): string => {
    if (minutes === null) return "—";
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.round((minutes / 60) * 10) / 10;
    return `${hours}h`;
  };

  const statCards = [
    {
      label: "Total Requests",
      value: stats.totalRequests,
      icon: ClipboardList,
      color: "text-violet-500",
      bgColor: "bg-violet-500/10",
    },
    {
      label: "Pending",
      value: stats.pendingRequests,
      icon: Clock3,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
    {
      label: "Completed",
      value: stats.completedRequests,
      icon: CheckCircle2,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      label: "Avg. Response",
      value: formatResponseTime(stats.avgResponseTimeMinutes),
      icon: Timer,
      color: "text-sky-500",
      bgColor: "bg-sky-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat) => (
        <Card
          key={stat.label}
          className="py-4 border-0 shadow-none bg-muted/40"
        >
          <CardContent className="px-4 flex items-center gap-4">
            <div className={`p-2.5 rounded-xl ${stat.bgColor}`}>
              <stat.icon className={`h-5 w-5 ${stat.color}`} strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-semibold tracking-tight truncate">
                {stat.value}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {stat.label}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
