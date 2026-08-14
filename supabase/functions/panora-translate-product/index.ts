import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept",
  "Access-Control-Max-Age": "86400",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // Supabase should deploy this function with JWT verification enabled.
  if (!req.headers.get("Authorization")) return json({ error: "Unauthorized" }, 401);

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return json({ error: "OPENAI_API_KEY is not configured" }, 500);

  let payload: { name_ru?: string; description_ru?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const name = String(payload.name_ru || "").trim();
  const description = String(payload.description_ru || "").trim();
  if (!name) return json({ error: "name_ru is required" }, 400);
  if (name.length > 300 || description.length > 4000) return json({ error: "Text is too long" }, 400);

  const instructions = [
    "You translate bakery product cards from Russian into English and Spanish.",
    "Preserve product meaning, ingredients, food terminology, numbers, units, brand names, and proper nouns.",
    "Use natural concise commercial wording suitable for a B2B bakery catalogue.",
    "Do not invent facts or ingredients.",
    "Return ONLY valid JSON with this exact shape:",
    '{"en":{"name":"...","description":"..."},"es":{"name":"...","description":"..."}}',
    "If the Russian description is empty, return an empty description in both languages."
  ].join("\n");

  const input = `Russian product name:\n${name}\n\nRussian description:\n${description}`;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: Deno.env.get("OPENAI_TRANSLATION_MODEL") || "gpt-5-mini",
      instructions,
      input,
    }),
  });

  const raw = await response.text();
  if (!response.ok) {
    console.error("OpenAI translation error", response.status, raw.slice(0, 1000));
    return json({ error: `Translation service error (${response.status})` }, 502);
  }

  let result: any;
  try {
    result = JSON.parse(raw);
  } catch {
    return json({ error: "Invalid response from translation service" }, 502);
  }

  const outputText =
    result.output_text ||
    (Array.isArray(result.output)
      ? result.output
          .flatMap((item: any) => item?.content || [])
          .filter((part: any) => part?.type === "output_text")
          .map((part: any) => part?.text || "")
          .join("")
      : "");

  let translated: any;
  try {
    translated = JSON.parse(String(outputText).trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim());
  } catch {
    console.error("Translation JSON parse error", String(outputText).slice(0, 1000));
    return json({ error: "Translation returned invalid JSON" }, 502);
  }

  const clean = {
    en: {
      name: String(translated?.en?.name || "").trim(),
      description: String(translated?.en?.description || "").trim(),
    },
    es: {
      name: String(translated?.es?.name || "").trim(),
      description: String(translated?.es?.description || "").trim(),
    },
  };

  if (!clean.en.name || !clean.es.name) return json({ error: "Translation is incomplete" }, 502);
  return json(clean);
});
