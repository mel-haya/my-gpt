import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { headers } from "next/headers";
import { createUserIfNotExists, deleteUser } from "@/services/userService";

interface WebhookEvent {
  type: string;
  data: {
    id: string;
    email_addresses: Array<{
      id: string;
      email_address: string;
    }>;
    username?: string;
    first_name?: string;
    last_name?: string;
    primary_email_address_id: string;
  };
}

export async function POST(req: NextRequest) {
  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new NextResponse("Error: Missing svix headers", {
      status: 400,
    });
  }

  // Get the body
  const payload = await req.text();

  // Get the webhook secret from environment variables
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error(
      "Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local"
    );
  }

  // Create a new Svix instance with your secret
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(payload, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new NextResponse("Error: Webhook verification failed", {
      status: 400,
    });
  }

  // Handle the webhook
  const eventType = evt.type;

  if (eventType === "user.created") {
    try {
      // Extract user data from the webhook payload
      const { id, email_addresses, first_name, last_name } = evt.data;
      
      // Get primary email
      const primaryEmail = email_addresses.find(
        (email) => email.id === evt.data.primary_email_address_id
      );
      
      if (!primaryEmail) {
        console.error("No primary email found for user:", id);
        return new NextResponse("Error: No primary email found", {
          status: 400,
        });
      }

      // Create username fallback if not provided
      const displayUsername = first_name && last_name
        ? `${first_name} ${last_name}`
        : `user_${id.substring(0, 8)}`;

      // Create user in database (only if not already exists)
      const newUser = await createUserIfNotExists({
        id,
        username: displayUsername,
        email: primaryEmail.email_address,
      });

      console.log("User created successfully:", newUser);
      
      return new NextResponse("User created successfully", { status: 200 });
    } catch (error) {
      console.error("Error creating user:", error);
      return new NextResponse("Error: Failed to create user", {
        status: 500,
      });
    }
  }

  if (eventType === "user.deleted") {
    try {
      // Extract user ID from the webhook payload
      const { id } = evt.data;

      // Delete user from database
      const deletedUser = await deleteUser(id);

      if (deletedUser) {
        console.log("User deleted successfully:", deletedUser);
        return new NextResponse("User deleted successfully", { status: 200 });
      } else {
        console.log("User not found for deletion:", id);
        return new NextResponse("User not found", { status: 404 });
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      return new NextResponse("Error: Failed to delete user", {
        status: 500,
      });
    }
  }

  // For other event types, just return success
  console.log(`Webhook received: ${eventType}`);
  return new NextResponse("Webhook received", { status: 200 });
}