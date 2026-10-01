const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const PRIMARY_MODEL = "gemini-2.5-flash";
const FALLBACK_MODEL = "gemini-2.0-flash";
const API_TIMEOUT_MS = 8000;
const MAX_ATTEMPTS = 3;
// Redeploy trigger: updated model selection and retry logic

class GeminiError extends Error {
  retryable: boolean;

  constructor(message: string, retryable = false) {
    super(message);
    this.name = "GeminiError";
    this.retryable = retryable;
  }
}

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
            temperature: 0.35,
            maxOutputTokens: 4096,
            responseMimeType: "application/json",
          },
        }),
      },
    );

    if (response.status === 404) throw new GeminiError("Gemini model unavailable.", true);
    if (response.status === 408 || response.status === 429 || response.status >= 500) {
      throw new GeminiError("Gemini request can be retried.", true);
    }
    if (!response.ok) throw new GeminiError("Gemini returned an error.");

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== "string" || text.trim().length === 0) {
      throw new GeminiError("Gemini returned no content.", true);
    }
    return text;
  } catch (error) {
    if (error instanceof GeminiError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new GeminiError("Gemini request timed out.", true);
    }
    throw new GeminiError("Gemini network request failed.", true);
  } finally {
    clearTimeout(timeout);
  }
}

async function generate(prompt: string): Promise<string> {
  let lastError: GeminiError | null = null;
  let model = PRIMARY_MODEL;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    try {
      return await callModel(model, prompt);
    } catch (error) {
      lastError = error instanceof GeminiError ? error : new GeminiError("Gemini request failed.", true);
      if (!lastError.retryable) throw lastError;
      if (lastError.message === "Gemini model unavailable.") model = FALLBACK_MODEL;
      if (attempt < MAX_ATTEMPTS - 1) await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  throw lastError ?? new GeminiError("Gemini request failed.", true);
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
