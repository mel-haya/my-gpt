import { NextResponse } from "next/server";
import { db } from "@/lib/db-config";
import { uploadedFiles } from "@/lib/db-schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const hash = searchParams.get("hash");

  if (!hash) {
    return NextResponse.json(
      { error: "Hash parameter is required" },
      { status: 400 }
    );
  }

  try {
    const file = await db
      .select({
        id: uploadedFiles.id,
        fileName: uploadedFiles.fileName,
        status: uploadedFiles.status,
      })
      .from(uploadedFiles)
      .where(eq(uploadedFiles.fileHash, hash))
      .limit(1);

    if (file.length === 0) {
      return NextResponse.json(
        { exists: false, status: "not_found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      exists: true,
      status: file[0].status,
      fileName: file[0].fileName,
      id: file[0].id,
    });
  } catch (error) {
    console.error("Error checking file status:", error);
    return NextResponse.json(
      { error: "Failed to check file status" },
      { status: 500 }
    );
  }
}