import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

/**
 * Clerk webhook handler — syncs user creation/updates to Supabase profiles.
 *
 * Set up in Clerk Dashboard → Webhooks:
 *   - URL: https://sudo.supply/api/webhooks/clerk
 *   - Events: user.created, user.updated
 */
export async function POST(req: NextRequest) {
  const payload = await req.json();
  const eventType = payload.type;
  const data = payload.data;

  const supabase = createServiceClient();

  try {
    if (eventType === "user.created" || eventType === "user.updated") {
      const email = data.email_addresses?.[0]?.email_address;
      const name =
        [data.first_name, data.last_name].filter(Boolean).join(" ") || null;

      await supabase.from("profiles").upsert(
        {
          clerk_user_id: data.id,
          email: email ?? "",
          name,
        },
        { onConflict: "clerk_user_id" }
      );

      console.log(`[clerk webhook] Synced profile for ${data.id}`);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[clerk webhook] Error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
