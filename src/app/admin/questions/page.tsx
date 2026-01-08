import QuestionsDashboard from "@/components/admin/QuestionsDashboard";
import { getTestsWithStatus } from "@/app/actions/tests";

// Force dynamic rendering since this page uses authentication
export const dynamic = 'force-dynamic';

interface QuestionsPageProps {
    searchParams: Promise<{
        page?: string;
        search?: string;
    }>;
}

export default async function QuestionsPage({ searchParams }: QuestionsPageProps) {
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

    return (
        <QuestionsDashboard
            initialData={initialData}
            searchQuery={searchQuery}
        />
    );
}
