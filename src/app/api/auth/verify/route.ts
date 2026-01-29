import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    // Simple token verification (in production, use JWT)
    if (token && token.length > 0) {
      try {
        Buffer.from(token, "base64").toString();
        return NextResponse.json({ valid: true }, { status: 200 });
      } catch {
        return NextResponse.json({ valid: false }, { status: 401 });
      }
    }

    return NextResponse.json({ valid: false }, { status: 401 });
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.json({ valid: false }, { status: 500 });
  }
}
