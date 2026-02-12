import HotelsPageClient from "@/components/admin/HotelsPageClient";
import { getHotels } from "@/services/hotelService";

export const dynamic = "force-dynamic";

interface HotelsPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
  }>;
}

export default async function HotelsPage({ searchParams }: HotelsPageProps) {
  const resolvedSearchParams = await searchParams;
  const page = resolvedSearchParams.page
    ? Number(resolvedSearchParams.page)
    : 1;
  const searchQuery = resolvedSearchParams.search || "";
  const limit = 10;

  const { hotels, pagination } = await getHotels(searchQuery, limit, page);

  return (
    <HotelsPageClient
      hotels={hotels}
      pagination={pagination}
      searchQuery={searchQuery}
    />
  );
}
