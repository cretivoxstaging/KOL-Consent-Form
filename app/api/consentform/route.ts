import { NextResponse } from "next/server";

const CONSENT_FORM_URL = process.env.CONSENT_FORM_URL || "";
const AUTH_TOKEN = process.env.EQUIPMENT_AUTH_TOKEN || "";

export async function GET() {
  try {
    const res = await fetch(CONSENT_FORM_URL, {
      headers: {
        Authorization: `Bearer ${AUTH_TOKEN}`,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn("Failed to fetch consent forms:", res.status, errText);
      return NextResponse.json({ success: false, data: [] });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/consentform error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch consent forms" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const res = await fetch(CONSENT_FORM_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${AUTH_TOKEN}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("Failed to post consentform multipart:", res.status, errText);
        return NextResponse.json({ success: false, error: errText }, { status: res.status });
      }

      const data = await res.json();
      return NextResponse.json(data);
    } else {
      const body = await req.json();
      const res = await fetch(CONSENT_FORM_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${AUTH_TOKEN}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("Failed to post consentform JSON:", res.status, errText);
        return NextResponse.json({ success: false, error: errText }, { status: res.status });
      }

      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch (error) {
    console.error("POST /api/consentform error:", error);
    return NextResponse.json({ success: false, error: "Failed to submit consent form" }, { status: 500 });
  }
}
