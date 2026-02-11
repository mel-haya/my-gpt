import Home from "../mainChat";
import { getHotelBySlug } from "@/services/hotelService";
import { notFound } from "next/navigation";

// Strict typing for params
export default async function HotelPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const hotel = await getHotelBySlug(slug);

  if (!hotel) {
    notFound();
  }

  return <Home hotelSlug={slug} />;
}
