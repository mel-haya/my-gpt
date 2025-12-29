import TestsDashboard from "@/components/admin/testsDashboard";

// Force dynamic rendering since this page uses authentication
export const dynamic = 'force-dynamic';

interface TestsPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
  }>;
}

export default async function TestsPage({ searchParams }: TestsPageProps) {
  const resolvedSearchParams = await searchParams;
  return <TestsDashboard searchParams={resolvedSearchParams} />;
}