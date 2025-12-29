import TestsDashboard from "@/components/admin/testsDashboard";

// Force dynamic rendering since this page uses authentication
export const dynamic = 'force-dynamic';

export default function TestsPage() {
  return <TestsDashboard />;
}