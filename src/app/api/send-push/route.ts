import { NextResponse } from 'next/server';

const ONESIGNAL_APP_ID = "595fdd83-68b2-498a-8ca6-66fd1ae7be8e"; // Deine ID
const ONESIGNAL_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

export async function POST(request: Request) {
  try {
    const { title, message } = await request.json();

    if (!title || !message) {
      return NextResponse.json({ error: 'Titel und Nachricht fehlen' }, { status: 400 });
    }

    // Nachricht an OneSignal senden (SOFORT)
    const body = {
      app_id: ONESIGNAL_APP_ID,
      headings: { en: title },
      contents: { en: message },
      included_segments: ["All"], // An alle
      url: "https://ride2salah.vercel.app" // Klick öffnet App
    };

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_API_KEY}`
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    return NextResponse.json({ success: true, data });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}