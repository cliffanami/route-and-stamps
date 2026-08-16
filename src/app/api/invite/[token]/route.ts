import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { InvitePreview } from "@/types/database.types";

// Sanctioned Route Handler use (CONVENTIONS.md §1: invite-token resolution).
// Unauthenticated on purpose — this is what powers the public /invite/[token]
// teaser page, so no supabase.auth.getUser() gate here.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("resolve_invite_preview", { p_token: token })
    .single<InvitePreview>();

  if (error || !data) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Invite not found." } },
      { status: 404 },
    );
  }

  return NextResponse.json({ preview: data });
}
