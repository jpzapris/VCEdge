// Force dynamic execution + no caching
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";

type MCQ = {
  subject: string;
  topic?: string;
  difficulty: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

function noStore(json: any, status = 200) {
  const res = NextResponse.json(json, { status });
  res.headers.set("Cache-Control", "no-store, max-age=0");
  return res;
}

const TOPICS: Record<string, string[]> = {
  English: ["Language analysis", "Argument analysis", "Comparative"],
  "Mathematical Methods": ["Functions", "Calculus", "Probability", "Algebra"],
  "Specialist Mathematics": ["Complex numbers", "Vectors", "Matrices", "Mechanics"],
  Chemistry: ["Stoichiometry", "Acids and bases", "Redox", "Organic"],
  Physics: ["Kinematics", "Dynamics", "Electricity", "Waves"],
  Biology: ["Cells", "Genetics", "Evolution", "Homeostasis"],
  Economics: ["Microeconomics", "Macroeconomics", "Policy", "Markets"],
  Psychology: ["Research methods", "Learning", "Memory", "Neuropsychology"],
};

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({} as any));
  const subject: string = body.subject ?? "English";
  const difficulty = Math.max(1, Math.min(5, Number(body.difficulty ?? 2)));
  const topicInput: string | undefined = body.topic || undefined;

  const apiKey = process.env.OPENAI_API_KEY;
  const requireAI = String(process.env.REQUIRE_AI || "").toLowerCase() === "true";

  if (!apiKey) {
    // Strict AI-only mode -> error if no key
    if (requireAI) return noStore({ error: "OPENAI_API_KEY missing" }, 503);
    // Otherwise, soft message to help debug
    return noStore({ source: "demo", reason: "no_key", question: null }, 200);
  }

  try {
    // Pick/validate topic
    const pool = TOPICS[subject] ?? ["Core"];
    const topic = topicInput && pool.includes(topicInput)
      ? topicInput
      : pool[Math.floor(Math.random() * pool.length)];

    // Add a seed so each call varies
    const seed = Math.random().toString(36).slice(2);

    const prompt = `Return ONLY JSON with keys:
subject, topic, difficulty (1-5), question, options (array of 4 strings), correctIndex (0..3), explanation.
Write a fresh VCE ${subject} MCQ on "${topic}" at difficulty ${difficulty}. Use Australian/VCAA terminology.
Vary numbers/wording each time. Seed: ${seed}.`;

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.35,
        messages: [
          { role: "system", content: "Output ONLY compact JSON. No markdown, no commentary." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!r.ok) {
      const txt = await r.text();
      console.error("OPENAI_HTTP", r.status, txt);
      if (requireAI) return noStore({ error: `openai_http_${r.status}` }, 503);
      return noStore({ source: "demo", reason: `openai_http_${r.status}`, question: null });
    }

    const j = await r.json();
    const text: string = j.choices?.[0]?.message?.content?.trim() || "{}";

    let parsed: MCQ;
    try {
      parsed = JSON.parse(text);
    } catch {
      console.error("PARSE_ERROR", text.slice(0, 300));
      if (requireAI) return noStore({ error: "parse_error" }, 503);
      return noStore({ source: "demo", reason: "parse_error", question: null });
    }

    const ok =
      parsed &&
      typeof parsed.subject === "string" &&
      typeof parsed.question === "string" &&
      Array.isArray(parsed.options) &&
      parsed.options.length === 4 &&
      typeof parsed.correctIndex === "number" &&
      typeof parsed.explanation === "string";

    if (!ok) {
      console.error("SCHEMA_FAIL", parsed);
      if (requireAI) return noStore({ error: "schema_fail" }, 503);
      return noStore({ source: "demo", reason: "schema_fail", question: null });
    }

    return noStore({ source: "ai", question: parsed });
  } catch (err) {
    console.error("OPENAI_RUNTIME", err);
    if (requireAI) return noStore({ error: "runtime_error" }, 503);
    return noStore({ source: "demo", reason: "runtime_error", question: null });
  }
}

