"use client";

import { SelectActivity } from "@/lib/db-schema";
import {
  MapPin,
  Phone,
  Globe,
  Edit2,
  Trash2,
  Tag,
  DollarSign,
  Navigation,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";

import { useState } from "react";


interface ActivitiesListProps {
  activities: SelectActivity[];
  onEdit: (activity: SelectActivity) => void;
  onDelete: (activity: SelectActivity) => void;
}

export function ActivitiesList({
  activities,
  onEdit,
  onDelete,
}: ActivitiesListProps) {
  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No activities found. Curate your first activity to get started.
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activities.map((activity) => (
          <ActivityCard
            key={activity.id}
            activity={activity}
            onEdit={() => onEdit(activity)}
            onDelete={() => onDelete(activity)}
          />
        ))}
      </div>
    </>
  );
}

function ActivityCard({
  activity,
  onEdit,
  onDelete
}: {
  activity: SelectActivity;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex flex-col p-4 border rounded-xl hover:shadow-md transition-shadow bg-card h-full">
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground truncate max-w-[150px]">
            {activity.name}
          </h3>
          <Badge
            variant="secondary"
            className="text-[10px] h-4 px-1 py-0 bg-muted text-muted-foreground font-normal rounded-sm capitalize"
          >
            {activity.category}
          </Badge>
        </div>
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={onEdit}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Image Preview if available */}
      {activity.image_url && (
        <div className="relative aspect-video mb-4 overflow-hidden rounded-lg border border-white/5">
          <Image
            src={activity.image_url}
            alt={activity.name}
            fill
            className="object-cover grayscale hover:grayscale-0 transition-all duration-500"
          />
        </div>
      )}

      {/* Narrative */}
      <p className="text-sm text-neutral-400 line-clamp-2 mb-4 italic font-serif">
        &quot;{activity.description}&quot;
      </p>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-4 mb-4 px-1">
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
            Distance
          </p>
          <div className="flex items-center space-x-1">
            <Navigation className="h-3 w-3 text-blue-500" />
            <span className="font-bold text-xs text-foreground">
              {activity.distance_from_hotel || "N/A"}
            </span>
          </div>
        </div>
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
            Price Tier
          </p>
          <div className="flex items-center space-x-1">
            <DollarSign className="h-3 w-3 text-green-500" />
            <span className="font-bold text-xs text-foreground">
              {activity.price_indicator || "free"}
            </span>
          </div>
        </div>
      </div>

      {/* Footer Contact Info */}
      <div className="mt-auto pt-4 border-t border-white/5 flex flex-col gap-2">
        {activity.location && (
          <div className="flex items-center gap-2 text-[10px] text-neutral-500">
            <MapPin size={12} className="text-neutral-600" />
            <span className="truncate">{activity.location}</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {activity.phone && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-neutral-600 hover:text-white"
                asChild
              >
                <a href={`tel:${activity.phone}`} title={activity.phone}>
                  <Phone size={12} />
                </a>
              </Button>
            )}
            {activity.website && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-neutral-600 hover:text-white"
                asChild
              >
                <a
                  href={activity.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Website"
                >
                  <Globe size={12} />
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
