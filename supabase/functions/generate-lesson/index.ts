const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GEMINI_MODELS = ["gemini-3.1-flash-lite", "gemini-3.6-flash", "gemini-flash-lite-latest"];
const API_TIMEOUT_MS = 45000;

class GeminiError extends Error {}

async function callModel(model: string, prompt: string): Promise<string> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new GeminiError("Gemini API key is not configured on the server.");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 8192,
            responseMimeType: "application/json",
          },
        }),
      },
    );

    if ([404, 429, 503].includes(response.status)) throw new Error(`RETRY_${response.status}`);
    if (!response.ok) throw new GeminiError("Gemini returned an error.");

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new GeminiError("Gemini returned no content.");
    return text;
  } finally {
    clearTimeout(timeout);
  }
}

async function generate(prompt: string): Promise<string> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    for (const model of GEMINI_MODELS) {
      try {
        return await callModel(model, prompt);
      } catch (error) {
        lastError = error;
        if (error instanceof GeminiError) throw error;
      }
    }
    if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw lastError instanceof Error ? lastError : new GeminiError("Gemini request failed.");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    if (typeof body.prompt !== "string" || body.prompt.length < 1 || body.prompt.length > 50000) {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const text = await generate(body.prompt);
    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Gemini function error", error);
    return new Response(JSON.stringify({ error: "Unable to generate content" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
