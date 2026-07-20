import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { openAIError, responseText, socialMediaApiKey } from "@/lib/openaiServer";

export const runtime = "nodejs";
export const maxDuration = 120;

const ANALYSIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    voice: { type: "array", minItems: 3, maxItems: 5, items: { type: "string", minLength: 2, maxLength: 40 } },
    pillars: { type: "array", minItems: 4, maxItems: 6, items: { type: "string", minLength: 2, maxLength: 60 } },
  },
  required: ["voice", "pillars"],
} as const;

const PLAN_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    ideas: {
      type: "array",
      minItems: 1,
      maxItems: 48,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          pillar: { type: "string", minLength: 2, maxLength: 60 },
          title: { type: "string", minLength: 3, maxLength: 100 },
          caption: { type: "string", minLength: 20, maxLength: 900 },
          hashtags: { type: "array", minItems: 2, maxItems: 8, items: { type: "string", minLength: 2, maxLength: 60 } },
          graphicCopy: { type: "string", minLength: 2, maxLength: 100 },
          artDirection: { type: "string", minLength: 10, maxLength: 300 },
        },
        required: ["pillar", "title", "caption", "hashtags", "graphicCopy", "artDirection"],
      },
    },
  },
  required: ["ideas"],
} as const;

export async function POST(request: NextRequest) {
  if (request.headers.get("sec-fetch-site") === "cross-site") {
    return NextResponse.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
  }
  const apiKey = socialMediaApiKey();
  if (!apiKey) return NextResponse.json({ error: "Social media AI is not configured." }, { status: 503 });

  const body = await request.json().catch(() => null);
  const action = body?.action === "plan" ? "plan" : body?.action === "analyze" ? "analyze" : null;
  const sourceText = typeof body?.sourceText === "string" ? body.sourceText.trim().slice(0, 30_000) : "";
  if (!action) return NextResponse.json({ error: "Unsupported social-media action." }, { status: 400 });
  if (!sourceText) return NextResponse.json({ error: "Add a handle, website, recent posts, or brand notes first." }, { status: 400 });

  const count = Math.max(1, Math.min(48, Number(body?.count) || 1));
  const clientName = typeof body?.clientName === "string" ? body.clientName.slice(0, 160) : "Client";
  const context = {
    sourceType: typeof body?.source === "string" ? body.source : "brand",
    sourceText,
    voice: Array.isArray(body?.voice) ? body.voice.slice(0, 6) : [],
    pillars: Array.isArray(body?.pillars) ? body.pillars.slice(0, 8) : [],
    channels: Array.isArray(body?.channels) ? body.channels.slice(0, 8) : [],
    weeks: body?.weeks,
    count,
  };
  const schema = action === "analyze" ? ANALYSIS_SCHEMA : PLAN_SCHEMA;
  const instructions = action === "analyze"
    ? "Analyze the supplied real brand source. Return concise, distinct voice traits and usable social content pillars. Do not invent performance claims or facts not present in the source."
    : `Create exactly ${count} distinct, client-ready social post ideas grounded in the supplied source, voice, and pillars. Vary angles and calls to action. Hashtags must begin with #. Do not invent testimonials, metrics, awards, or product facts.`;

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5.6-luna",
        store: false,
        safety_identifier: createHash("sha256").update(`social:${clientName}`).digest("hex").slice(0, 32),
        reasoning: { effort: "low" },
        max_output_tokens: action === "plan" ? Math.min(16_000, 900 + count * 300) : 1_200,
        instructions,
        input: `Client: ${clientName}\nSocial planning context:\n${JSON.stringify(context, null, 2)}`,
        text: { verbosity: "medium", format: { type: "json_schema", name: `social_${action}`, strict: true, schema } },
      }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const mapped = openAIError(response.status, payload, "OpenAI could not complete the social plan.");
      console.error("Social media generation failed.", { status: response.status, code: payload?.error?.code });
      return NextResponse.json({ error: mapped.message }, { status: mapped.status });
    }
    const result = JSON.parse(responseText(payload));
    if (action === "plan" && (!Array.isArray(result?.ideas) || result.ideas.length !== count)) {
      return NextResponse.json({ error: `The plan returned ${result?.ideas?.length || 0} of ${count} requested posts. Please try again.` }, { status: 502 });
    }
    return NextResponse.json({ result });
  } catch (error) {
    console.error("Unable to generate social media content.", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to generate social media content." }, { status: 502 });
  }
}
