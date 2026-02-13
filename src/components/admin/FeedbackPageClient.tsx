"use client";

import {
  FeedbackCard,
  Pagination,
  FeedbackData,
} from "@/components/admin/FeedbackList";
import { MessageSquare, ThumbsDown, ThumbsUp, Activity } from "lucide-react";

interface Stats {
  total: number;
  positive: number;
  negative: number;
  satisfactionRate: number;
}

export default function FeedbackPageClient({
  feedbacks,
  stats,
  currentPage,
  hasMore,
  showHotelName = false,
}: {
  feedbacks: FeedbackData[];
  stats: Stats;
  currentPage: number;
  hasMore: boolean;
  showHotelName?: boolean;
}) {
  return (
    <div className="p-8 max-w-7xl mx-auto font-sans text-gray-200">
      <header className="mb-10">
        <h1 className="text-4xl font-extrabold mb-2 text-gray-200">
          User Feedback
        </h1>
        <p className="text-gray-400 text-lg">
          Monitor and manage user satisfaction
        </p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <div className="bg-gray-800/50 backdrop-blur-lg border border-white/10 rounded-2xl p-6 flex items-center gap-5 transition-all duration-200 hover:-translate-y-1 hover:bg-gray-800/80 shadow-lg flex-col">
          <div className="p-4 rounded-2xl flex gap-2 items-center justify-center bg-blue-500/10 text-blue-500">
            <MessageSquare size={24} />
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Total Feedback
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-bold text-white leading-tight">
              {stats.total}
            </span>
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-lg border border-white/10 rounded-2xl p-6 flex items-center gap-5 transition-all duration-200 hover:-translate-y-1 hover:bg-gray-800/80 shadow-lg flex-col">
          <div className="p-4 rounded-2xl flex gap-2 items-center justify-center bg-green-500/10 text-green-500">
            <ThumbsUp size={24} />
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Positive
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-bold text-white leading-tight">
              {stats.positive}
            </span>
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-lg border border-white/10 rounded-2xl p-6 flex items-center gap-5 transition-all duration-200 hover:-translate-y-1 hover:bg-gray-800/80 shadow-lg flex-col">
          <div className="p-4 rounded-2xl flex items-center justify-center bg-red-500/10 text-red-500 gap-2">
            <ThumbsDown size={24} />
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Negative
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-bold text-white leading-tight">
              {stats.negative}
            </span>
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-lg border border-white/10 rounded-2xl p-6 flex items-center gap-5 transition-all duration-200 hover:-translate-y-1 hover:bg-gray-800/80 shadow-lg flex-col">
          <div className="p-4 flex gap-2 rounded-2xl items-center justify-center bg-purple-500/10 text-purple-500">
            <Activity size={24} />
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Satisfaction Rate
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-bold text-white leading-tight">
              {stats.satisfactionRate}%
            </span>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-8">
        <div className="flex flex-col gap-4">
          {feedbacks.length === 0 ? (
            <div className="text-center py-16 text-gray-500 bg-gray-800/20 border-2 border-dashed border-white/5 rounded-2xl text-lg">
              No feedback found.
            </div>
          ) : (
            feedbacks.map((f) => (
              <FeedbackCard
                key={f.id}
                feedback={f}
                showHotelName={showHotelName}
              />
            ))
          )}
        </div>

        {feedbacks.length > 0 && (
          <Pagination currentPage={currentPage} hasMore={hasMore} />
        )}
      </section>
    </div>
  );
}
