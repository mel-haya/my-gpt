import SystemPromptsDashboard from "@/components/admin/SystemPromptsDashboard";
import { getSystemPromptsAction } from "@/app/actions/systemPrompts";
import { redirect } from "next/navigation";

// Force dynamic rendering since this page uses authentication
export const dynamic = 'force-dynamic';

interface SystemPromptsPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
  }>;
}

export default async function SystemPromptsPage({ searchParams }: SystemPromptsPageProps) {
  const resolvedSearchParams = await searchParams;
  const currentPage = Number(resolvedSearchParams?.page) || 1;
  const searchQuery = resolvedSearchParams?.search || "";
  const itemsPerPage = 10;

  // Fetch initial data on the server for SSR
  const result = await getSystemPromptsAction(
    searchQuery.trim() || undefined,
    itemsPerPage,
    currentPage
  );

  // Handle errors by redirecting to admin page
  if (!result.success) {
    redirect('/admin');
  }

  const initialData = result.data!;

  return (
    <div className="p-6">
      <SystemPromptsDashboard
        initialData={initialData}
        searchQuery={searchQuery}
      />
    </div>
  );
}