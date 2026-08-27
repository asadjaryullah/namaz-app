import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendPushToAll } from "@/lib/webpush";
import { isMainAdmin } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";


export async function POST(req: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Auth prüfen
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    /* Nur der Hauptadmin darf an alle senden. Vorher stand hier
       "ADMIN_EMAIL && ...": War die Variable nicht gesetzt, fiel die Pruefung
       ganz weg und jeder angemeldete Nutzer konnte die ganze Gemeinde
       anschreiben. isMainAdmin() verweigert ohne Konfiguration den Zugang. */
    if (!isMainAdmin(userData.user.email)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { title, message } = body;

    if (!title || !message) {
      return NextResponse.json({ error: "title und message erforderlich" }, { status: 400 });
    }

    const logs: string[] = [];
    const count = await sendPushToAll({ title, body: message, url: "/" }, logs);

    return NextResponse.json({ success: true, sent: count, logs });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "server_error" }, { status: 500 });
  }
}
