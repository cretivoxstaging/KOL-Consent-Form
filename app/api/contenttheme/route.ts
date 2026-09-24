import { NextResponse } from "next/server";

const CONTENT_THEME_URL = process.env.CONTENT_THEME_URL || "";
const AUTH_TOKEN = process.env.EQUIPMENT_AUTH_TOKEN || "";

export async function GET() {
  try {
    const res = await fetch(CONTENT_THEME_URL, {
      headers: {
        Authorization: `Bearer ${AUTH_TOKEN}`,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn("Failed to fetch content themes from equipment API:", res.status, errText);
      return NextResponse.json({ success: false, data: [] });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/contenttheme error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch content themes" }, { status: 500 });
  }
}
