import {
  getFeedbacksAction,
  getFeedbackStatsAction,
} from "@/app/actions/feedback";
import FeedbackPageClient from "@/components/admin/FeedbackPageClient";
import { FeedbackData } from "@/components/admin/FeedbackList";

export const dynamic = "force-dynamic";

export default async function FeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const currentPage = parseInt(resolvedSearchParams.page || "1");
  const pageSize = 10;

  const [feedbacksResult, statsResult] = await Promise.all([
    getFeedbacksAction({ page: currentPage, limit: pageSize }),
    getFeedbackStatsAction(),
  ]);

  const feedbacks: FeedbackData[] = feedbacksResult.success
    ? (feedbacksResult.data as FeedbackData[]) || []
    : [];
  const stats =
    statsResult.success && statsResult.data
      ? statsResult.data
      : { total: 0, positive: 0, negative: 0, satisfactionRate: 0 };
  const hasMore = feedbacks.length === pageSize;

  return (
    <FeedbackPageClient
      feedbacks={feedbacks}
      stats={stats}
      currentPage={currentPage}
      hasMore={hasMore}
    />
  );
}
