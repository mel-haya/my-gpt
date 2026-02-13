"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
// import { SelectFeedback } from "@/lib/db-schema";
import DeleteFeedbackDialog from "@/components/admin/DeleteFeedbackDialog";

export interface FeedbackData {
  id: number;
  feedback: "positive" | "negative" | null;
  submitted_at: Date;
  conversation_id: number | null;
  message_id: number | null;
  message_content: string | null;
  hotel_name?: string | null;
}

export function FeedbackCard({
  feedback,
  showHotelName = false,
}: {
  feedback: FeedbackData;
  showHotelName?: boolean;
}) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const router = useRouter();

  const isPositive = feedback.feedback === "positive";

  return (
    <div className="bg-gray-800/30 backdrop-blur-md border border-white/5 rounded-2xl p-6 w-full transition-all duration-200 hover:bg-gray-800/50 hover:border-indigo-500/30">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
              isPositive
                ? "bg-green-500/10 text-green-400 border border-green-500/20"
                : "bg-red-500/10 text-red-400 border border-red-500/20"
            }`}
          >
            {isPositive ? "Positive" : "Negative"}
          </span>
          {showHotelName && feedback.hotel_name && (
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {feedback.hotel_name}
            </span>
          )}
        </div>
        <span className="text-gray-500 text-sm">
          {new Date(feedback.submitted_at).toLocaleString()}
        </span>
      </div>
      <div className="mb-5">
        <p className="text-gray-200 leading-relaxed text-base whitespace-pre-wrap">
          {feedback.message_content || "Message content not available"}
        </p>
      </div>
      <div className="mt-5 pt-4 border-t border-white/5 flex justify-between items-center">
        {feedback.conversation_id && (
          <button
            onClick={() =>
              router.push(
                `/admin/history?conversationId=${feedback.conversation_id}&messageId=${feedback.message_id}`,
              )
            }
            className="text-indigo-400 text-xs font-medium hover:text-indigo-300 hover:bg-indigo-500/10 px-3 py-1.5 rounded-lg transition-all duration-200"
          >
            View Conversation
          </button>
        )}
        <button
          onClick={() => setIsDeleteDialogOpen(true)}
          className="text-gray-400 hover:text-red-500 hover:bg-red-500/10 p-2 rounded-lg transition-all duration-200 flex items-center justify-center"
          title="Delete feedback"
        >
          <Trash2 size={18} />
        </button>
      </div>

      <DeleteFeedbackDialog
        feedbackId={feedback.id}
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onSuccess={() => {
          setIsDeleteDialogOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}

export function Pagination({
  currentPage,
  hasMore,
}: {
  currentPage: number;
  hasMore: boolean;
}) {
  const router = useRouter();

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(window.location.search);
    params.set("page", newPage.toString());
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex justify-center items-center gap-6 mt-8">
      <button
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className="bg-gray-800/50 border border-white/10 text-white px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 hover:enabled:bg-indigo-500/10 hover:enabled:border-indigo-500 hover:enabled:text-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Previous
      </button>
      <span className="text-gray-400 text-sm font-medium">
        Page {currentPage}
      </span>
      <button
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={!hasMore}
        className="bg-gray-800/50 border border-white/10 text-white px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 hover:enabled:bg-indigo-500/10 hover:enabled:border-indigo-500 hover:enabled:text-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Next
      </button>
    </div>
  );
}
