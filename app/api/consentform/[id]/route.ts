import { NextResponse } from "next/server";

const CONSENT_FORM_URL = process.env.CONSENT_FORM_URL || "";
const AUTH_TOKEN = process.env.EQUIPMENT_AUTH_TOKEN || "";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = await context.params;
    const { id } = params;

    const res = await fetch(`${CONSENT_FORM_URL}/${id}`, {
      headers: {
        Authorization: `Bearer ${AUTH_TOKEN}`,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ success: false, error: errText }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/consentform/[id] error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch consent form" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = await context.params;
    const { id } = params;

    if (!id) {
      return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 });
    }

    const res = await fetch(`${CONSENT_FORM_URL}/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${AUTH_TOKEN}`,
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`Failed to delete consentform ${id}:`, res.status, errText);
      return NextResponse.json(
        { success: false, error: errText || `Failed to delete consent form with ID ${id}` },
        { status: res.status }
      );
    }

    const data = await res.json().catch(() => ({ success: true, message: `Consent form ${id} deleted` }));
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("DELETE /api/consentform/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error deleting consent form" },
      { status: 500 }
    );
  }
}
