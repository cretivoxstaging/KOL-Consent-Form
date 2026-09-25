import { NextResponse } from "next/server";
import { decodeHashId } from "@/lib/hashId";

const CONTENT_THEME_URL = process.env.CONTENT_THEME_URL || "";
const AUTH_TOKEN = process.env.EQUIPMENT_AUTH_TOKEN || "";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const decodedId = decodeHashId(id);

    if (!decodedId) {
      return NextResponse.json({ success: false, error: "Invalid template ID" }, { status: 400 });
    }

    const res = await fetch(`${CONTENT_THEME_URL}/${decodedId}`, {
      headers: {
        Authorization: `Bearer ${AUTH_TOKEN}`,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`Failed to fetch content theme ${decodedId} from equipment API:`, res.status, errText);
      return NextResponse.json({ success: false, data: null }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/contenttheme/[id] error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch content theme by id" }, { status: 500 });
  }
}

