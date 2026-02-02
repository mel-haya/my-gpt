import Home from "../page";

// Strict typing for params
export default async function HotelPage({
  params,
}: {
  params: Promise<{ hotelName: string }>;
}) {
  const { hotelName } = await params;
  return <Home hotelName={hotelName} />;
}
