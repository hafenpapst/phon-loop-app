import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();

  // hier landen alle Daten
  console.log("📥 Neues Feedback:", JSON.stringify(body, null, 2));

  return NextResponse.json({ ok: true });
}
