import TestsDashboard from "@/components/admin/testsDashboard";
import { getTestsWithStatus } from "@/app/actions/tests";

// Force dynamic rendering since this page uses authentication
export const dynamic = "force-dynamic";

interface TestsPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
  }>;
}

export default async function TestsPage({ searchParams }: TestsPageProps) {
  const resolvedSearchParams = await searchParams;
  const currentPage = Number(resolvedSearchParams?.page) || 1;
  const searchQuery = resolvedSearchParams?.search || "";
  const itemsPerPage = 10;

  // Fetch initial data on the server for SSR
  const initialData = await getTestsWithStatus(
    searchQuery.trim() || undefined,
    itemsPerPage,
    currentPage
  );

  return <TestsDashboard initialData={initialData} searchQuery={searchQuery} />;
}
