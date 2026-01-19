import React from "react";
import { ExternalLink, Phone, MapPin, Clock, Euro } from "lucide-react";
export interface Activity {
  id: number;
  name: string;
  description: string;
  location?: string;
  category?: string;
  distance_from_hotel?: string;
  price_indicator?: "free" | "$" | "$$" | "$$$" | "$$$$";
  phone?: string;
  website?: string;
  image_url?: string;
  image?: string; // Add alias from tool output
}

interface ActivitySuggestionCardProps {
  activity: Activity;
}

export default function ActivitySuggestionCard({
  activity,
}: ActivitySuggestionCardProps) {
  const imageUrl = activity.image_url || activity.image;

  // Format price
  const renderPrice = (price?: string) => {
    if (!price) return null;
    if (price === "free")
      return <span className="text-green-500 font-medium">Free</span>;
    return (
      <div className="flex text-neutral-400">
        {price.split("").map((_, i) => (
          <Euro key={i} className="size-3.5" />
        ))}
      </div>
    );
  };

  return (
    <div className="group/card relative overflow-hidden rounded-2xl border border-neutral-200/60 bg-white/50 backdrop-blur-md dark:border-white/10 dark:bg-black/40 hover:border-neutral-300 dark:hover:border-white/20 transition-all duration-300 shadow-xs hover:shadow-md max-w-2xl w-full my-3">
      <div className="flex flex-col md:flex-row">
        {/* Image Section */}
        {imageUrl && (
          <div className="relative h-48 md:h-auto md:w-1/3 min-w-[150px] overflow-hidden">
            <img
              src={imageUrl}
              alt={activity.name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover/card:scale-105"
            />
            {/* Gradient Overlay for text readability on mobile if needed, or just aesthetic */}
            <div className="absolute inset-0 bg-linear-to-t from-black/50 to-transparent md:hidden" />
          </div>
        )}

        {/* Content Section */}
        <div className="flex-1 p-5 md:p-6 flex flex-col gap-3">
          <div className="flex justify-between items-start">
            <h3 className="text-lg font-bold tracking-tight text-neutral-900 dark:text-white group-hover/card:text-blue-600 dark:group-hover/card:text-blue-400 transition-colors">
              {activity.name}
            </h3>
            {activity.category && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-semibold border border-neutral-200 bg-neutral-100 text-neutral-600 dark:border-white/10 dark:bg-white/5 dark:text-neutral-300 shrink-0 ml-2">
                {activity.category}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-neutral-500 dark:text-neutral-400 font-medium">
            {activity.distance_from_hotel && (
              <div className="flex items-center gap-1">
                <MapPin className="size-3.5" />
                <span>{activity.distance_from_hotel}</span>
              </div>
            )}
            {/* Mocking opening hours as it's not in the strict schema but in the design */}
            <div className="flex items-center gap-1">
              <Clock className="size-3.5" />
              <span>09:00 - 22:00</span>
            </div>
            {renderPrice(activity.price_indicator)}
          </div>

          <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-300 line-clamp-2 number-of-lines-2 group-hover/card:line-clamp-none transition-all duration-300">
            {activity.description}
          </p>

          <div className="pt-2 mt-auto flex items-center gap-3 flex-wrap">
            {activity.website && (
              <a
                href={activity.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 dark:bg-white/5 dark:border-white/10 dark:text-white dark:hover:bg-white/10 transition-colors"
              >
                <ExternalLink className="size-3.5" />
                Visit
              </a>
            )}
            {activity.phone && (
              <a
                href={`tel:${activity.phone}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 dark:bg-white/5 dark:border-white/10 dark:text-white dark:hover:bg-white/10 transition-colors"
              >
                <Phone className="size-3.5" />
                Contact
              </a>
            )}
            {activity.location && (
              <span className="ml-auto text-xs text-neutral-400 hidden sm:block truncate max-w-[150px]">
                {activity.location}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
