import { notFound } from "next/navigation";
import { getTestDetails } from "@/services/testsService";
import TestDetailPage from "@/components/admin/TestDetailPage";

// Force dynamic rendering for admin pages
export const dynamic = 'force-dynamic';

interface TestDetailParams {
  params: Promise<{
    id: string;
  }>;
}

export default async function TestDetail({ params }: TestDetailParams) {
  const { id } = await params;
  const testId = parseInt(id);
  
  if (isNaN(testId)) {
    notFound();
  }

  const testDetails = await getTestDetails(testId);

  if (!testDetails) {
    notFound();
  }

  return <TestDetailPage testDetails={testDetails} />;
}