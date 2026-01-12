/**
 * Instagram Disconnect Endpoint
 *
 * Allows users to disconnect their Instagram account from the platform.
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { disconnectInstagramAccount } from "@/lib/instagram";

/**
 * DELETE /api/auth/instagram/disconnect
 *
 * Disconnects the user's Instagram account.
 */
export async function DELETE() {
  // Verify user is authenticated
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "You must be logged in to disconnect Instagram" },
      { status: 401 }
    );
  }

  try {
    await disconnectInstagramAccount(session.user.id);

    return NextResponse.json({
      success: true,
      message: "Instagram account disconnected successfully",
    });
  } catch (error) {
    console.error("Error disconnecting Instagram:", error);
    return NextResponse.json(
      { error: "Failed to disconnect Instagram account" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/auth/instagram/disconnect
 *
 * Alternative method for disconnecting (for form submissions).
 */
export async function POST() {
  return DELETE();
}
