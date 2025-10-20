import { serve } from "https://deno.land/std@0.192.0/http/server.ts";

serve(async (req) => {
  const { searchParams } = new URL(req.url);
  const target = searchParams.get("url");
  const width = searchParams.get("w") || "256";
  const quality = searchParams.get("q") || "70";

  if (!target) {
    return new Response("Missing ?url= parameter", { status: 400 });
  }

  const allowedPrefix =
    "https://fpwrazvgrmatlajjzdiq.supabase.co/storage/v1/object/public/";

  if (!target.startsWith(allowedPrefix)) {
    return new Response("Forbidden path", { status: 403 });
  }

  try {
    const relPath = target.substring(allowedPrefix.length);
    const projectUrl = "https://fpwrazvgrmatlajjzdiq.supabase.co";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!anonKey) {
      return new Response("Missing anon key", { status: 500 });
    }

    // Use correct render endpoint for Supabase images
    const renderUrl = `${projectUrl}/storage/v1/render/image/public/${relPath}?width=${width}&quality=${quality}&format=webp`;

    const res = await fetch(renderUrl, {
      headers: {
        "Authorization": `Bearer ${anonKey}`,
        "apikey": anonKey,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      return new Response(`Upstream error ${res.status}: ${text}`, {
        status: res.status,
      });
    }

    const headers = new Headers(res.headers);
    headers.set("Cache-Control", "public, max-age=86400");
    headers.set("Access-Control-Allow-Origin", "*");

    return new Response(await res.arrayBuffer(), {
      status: 200,
      headers,
    });
  } catch (err) {
    return new Response(`Fetch error: ${err}`, { status: 500 });
  }
});
