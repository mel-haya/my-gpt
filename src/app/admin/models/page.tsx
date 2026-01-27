import ModelsDashboard from "@/components/admin/ModelsDashboard";
import {
  getModelsAction,
  getTopModelStatsAction,
} from "@/app/actions/modelsAdmin";
import { redirect } from "next/navigation";

// Force dynamic rendering since this page uses authentication
export const dynamic = "force-dynamic";

interface ModelsPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}

export default async function ModelsPage({ searchParams }: ModelsPageProps) {
  const resolvedSearchParams = await searchParams;
  const currentPage = Number(resolvedSearchParams?.page) || 1;
  const searchQuery = resolvedSearchParams?.search || "";
  const sortBy =
    (resolvedSearchParams?.sortBy as
      | "name"
      | "created_at"
      | "score"
      | "cost"
      | "latency"
      | "responses"
      | "victories") || "created_at";
  const sortOrder =
    (resolvedSearchParams?.sortOrder as "asc" | "desc") || "desc";
  const itemsPerPage = 10;

  // Fetch initial data on the server for SSR
  const [result, statsResult] = await Promise.all([
    getModelsAction(
      searchQuery.trim() || undefined,
      itemsPerPage,
      currentPage,
      sortBy,
      sortOrder,
    ),
    getTopModelStatsAction(),
  ]);

  // Handle errors by redirecting to admin page
  if (!result.success) {
    redirect("/admin");
  }

  const initialData = result.data!;
  const topStats = statsResult.success ? statsResult.data! : null;

  return (
    <div className="p-6">
      <ModelsDashboard
        initialData={initialData}
        searchQuery={searchQuery}
        topStats={topStats}
      />
    </div>
  );
}
