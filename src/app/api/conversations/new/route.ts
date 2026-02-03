import { auth } from "@clerk/nextjs/server";
import { NextResponse as Response } from "next/server";
import { addConversation } from "@/services/conversationsService";
import { getHotelBySlug } from "@/services/hotelService";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body = {};
  try {
    body = await req.json();
  } catch (error) {
    // Empty body is acceptable
  }
  const { hotelSlug } = body as { hotelSlug?: string };

  let hotelId = undefined;
  if (hotelSlug) {
    const hotel = await getHotelBySlug(hotelSlug);
    if (hotel) {
      hotelId = hotel.id;
    }
  }

  const conversation = await addConversation(userId, hotelId);
  return new Response(JSON.stringify(conversation), { status: 200 });
}
