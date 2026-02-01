import HotelsPageClient from "@/components/admin/HotelsPageClient";
import { getHotels } from "@/services/hotelService";

export const dynamic = "force-dynamic";

interface HotelsPageProps {
  searchParams: {
    page?: string;
    search?: string;
  };
}

export default async function HotelsPage({ searchParams }: HotelsPageProps) {
  const page = searchParams.page ? Number(searchParams.page) : 1;
  const searchQuery = searchParams.search || "";
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
