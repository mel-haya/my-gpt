import FilesDashboard from "@/components/admin/filesDashboard";

interface PageProps {
  searchParams?: Promise<{
    page?: string;
    search?: string;
  }>;
}

export default async function AdminFilesPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  return <FilesDashboard searchParams={resolvedSearchParams} />;
}