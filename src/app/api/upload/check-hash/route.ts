import { db } from "@/lib/db-config";
import { uploadedFiles } from "@/lib/db-schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const hash = searchParams.get("hash");

  if (!hash) {
    return NextResponse.json({ error: "Hash is required" }, { status: 400 });
  }

  try {
    const existingFile = await db
      .select()
      .from(uploadedFiles)
      .where(eq(uploadedFiles.fileHash, hash));

    if (existingFile.length > 0) {
      return NextResponse.json({ exists: true });
    } else {
      return NextResponse.json({ exists: false });
    }
  } catch (error) {
    console.error("Error checking hash:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
