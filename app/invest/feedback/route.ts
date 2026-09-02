import { NextResponse } from "next/server";
import { getInvestSession } from "@/lib/invest/auth";
import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";

type FeedbackPayload = {
  rating?: unknown;
  comments?: unknown;
};

export async function POST(request: Request) {
  const session = await getInvestSession();
  if (!session?.accessEventId) {
    return NextResponse.json({ error: "Please reopen the brief with your access password." }, { status: 401 });
  }

  const payload = await request.json().catch((): FeedbackPayload => ({}));
  const rating = typeof payload.rating === "number" && Number.isInteger(payload.rating) && payload.rating >= 1 && payload.rating <= 5
    ? payload.rating
    : null;
  const comments = typeof payload.comments === "string" ? payload.comments.trim().slice(0, 2000) : null;

  if (!rating && !comments) {
    return NextResponse.json({ error: "Add a rating or comment before submitting." }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Feedback is temporarily unavailable." }, { status: 503 });
  }

  const { error } = await supabase.rpc("record_invest_access_feedback", {
    access_event_id: session.accessEventId,
    expected_password_id: session.passwordId,
    submitted_rating: rating,
    submitted_comments: comments,
  });
  if (error) {
    return NextResponse.json({ error: "Feedback could not be saved." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
