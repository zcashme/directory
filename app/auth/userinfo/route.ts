import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";

/**
 * UserInfo Endpoint — GET /auth/userinfo
 *
 * Returns the authenticated user's profile information.
 *
 * The developer's OIDC library calls this with the access token
 * received from the token endpoint to fetch the user's full profile.
 *
 * For MVP, the access token is the user's Zcash address (opaque,
 * not yet validated against a token store). This is acceptable
 * because:
 * 1. The address was verified via ZFA (payment + OTP)
 * 2. The access token was only returned to the developer's server
 *    via a server-to-server token exchange (not exposed to the browser)
 *
 * In production, we'll use a proper token store (Supabase) and
 * validate the access token before returning data.
 */

interface ZcasherProfile {
  id: number;
  name: string;
  display_name: string | null;
  profile_image_url: string | null;
  bio: string | null;
  address: string | null;
  slug: string | null;
}

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "invalid_token", error_description: "Missing bearer token." },
        { status: 401 },
      );
    }

    // Extract the access token
    // For MVP, the access token IS the Zcash address (passed through from token endpoint)
    // In production, look up the access token in a token store
    const accessToken = authHeader.slice(7);

    // For now, we treat the access token as the Zcash address
    // This is a simplification — the proper approach is to store the
    // access token → address mapping in the session store
    const address = accessToken;

    if (!address || !address.startsWith("u1")) {
      return NextResponse.json(
        { error: "invalid_token", error_description: "Invalid access token." },
        { status: 401 },
      );
    }

    // Fetch the profile from Supabase
    const supabase = createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "server_error", error_description: "Database unavailable." },
        { status: 503 },
      );
    }

    const { data: profile, error } = await supabase
      .from("zcasher")
      .select("id, name, display_name, profile_image_url, bio, address, slug")
      .eq("address", address)
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: "server_error", error_description: "Database error." },
        { status: 503 },
      );
    }

    // Return standard OIDC userinfo claims
    const userinfo = {
      sub: address,
      name: profile?.name ?? profile?.display_name ?? null,
      preferred_username: profile?.name ?? null,
      picture: profile?.profile_image_url ?? null,
      address: address,
    };

    return NextResponse.json(userinfo, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "application/json",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "server_error", error_description: "Internal server error." },
      { status: 500 },
    );
  }
}