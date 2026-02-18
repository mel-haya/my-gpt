import QuestionsDashboard from "@/components/admin/QuestionsDashboard";
import { getTestsWithStatus } from "@/app/actions/tests";
import { getAllHotelsForSelectionAction } from "@/app/actions/testProfiles";

// Force dynamic rendering since this page uses authentication
export const dynamic = "force-dynamic";

interface QuestionsPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    category?: string;
    hotel?: string;
  }>;
}

export default async function QuestionsPage({
  searchParams,
}: QuestionsPageProps) {
  const resolvedSearchParams = await searchParams;
  const currentPage = Number(resolvedSearchParams?.page) || 1;
  const searchQuery = resolvedSearchParams?.search || "";
  const categoryQuery = resolvedSearchParams?.category || "";
  const hotelQuery = resolvedSearchParams?.hotel || "";
  const itemsPerPage = 10;

  const hotelId = hotelQuery ? Number(hotelQuery) : undefined;

  // Fetch initial data on the server for SSR
  const [initialData, hotelsResult] = await Promise.all([
    getTestsWithStatus(
      searchQuery.trim() || undefined,
      categoryQuery,
      itemsPerPage,
      currentPage,
      hotelId,
    ),
    getAllHotelsForSelectionAction(),
  ]);

  const hotels = hotelsResult.success ? hotelsResult.data || [] : [];

  return (
    <QuestionsDashboard
      initialData={initialData}
      searchQuery={searchQuery}
      categoryQuery={categoryQuery}
      hotelQuery={hotelQuery}
      hotels={hotels}
    />
  );
}
