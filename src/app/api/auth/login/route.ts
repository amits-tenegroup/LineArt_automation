import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    // Get credentials from environment variables
    const validUsername = process.env.AUTH_USERNAME || "admin";
    const validPassword = process.env.AUTH_PASSWORD || "password123";

    // Validate credentials
    if (username === validUsername && password === validPassword) {
      // Generate a simple token (in production, use JWT or similar)
      const token = Buffer.from(`${username}:${Date.now()}`).toString("base64");

      return NextResponse.json(
        { success: true, token },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
