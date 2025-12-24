import UsersDashboard from "@/components/admin/usersDashboard";

interface AdminUsersPageProps {
  searchParams?: {
    page?: string;
    search?: string;
  };
}

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  const resolvedSearchParams = await searchParams;
  return <UsersDashboard searchParams={resolvedSearchParams} />;
}