// Always run dynamically (no static caching)
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

function noStore(json: any) {
  const res = NextResponse.json(json);
  res.headers.set("Cache-Control", "no-store, max-age=0");
  return res;
}

const DEMO: Record<string, MCQ[]> = {
  English: [
    {
      subject: "English",
      topic: "Language analysis",
      difficulty: 2,
      question: "Which statement best describes the author’s tone?",
      options: ["Dismissive", "Cautiously optimistic", "Ironic", "Indifferent"],
      correctIndex: 1,
      explanation: "Phrases like “promising, provided” indicate cautious optimism.",
    },
    {
      subject: "English",
      topic: "Argument analysis",
      difficulty: 2,
      question: "Which feature most directly strengthens an author’s **appeal to logic (logos)**?",
      options: ["Emotive adjectives", "Inclusive language", "Statistical evidence", "Anecdotes"],
      correctIndex: 2,
      explanation: "Logos is supported by verifiable data such as statistics.",
    },
  ],
  "Mathematical Methods": [
    {
      subject: "Mathematical Methods",
      topic: "Functions",
      difficulty: 2,
      question: "For f(x)=x^2−4x, the x-coordinate of the vertex is:",
      options: ["−4", "−2", "2", "4"],
      correctIndex: 2,
      explanation: "Vertex at −b/(2a)=−(−4)/(2·1)=2.",
    },
    {
      subject: "Mathematical Methods",
      topic: "Calculus",
      difficulty: 3,
      question: "If f(x)=3x^2−6x, what x maximises/minimises f?",
      options: ["x=−1", "x=0", "x=1", "x=2"],
      correctIndex: 2,
      explanation: "f’(x)=6x−6=0 ⇒ x=1 (turning point).",
    },
  ],
  Chemistry: [
    {
      subject: "Chemistry",
      topic: "Stoichiometry",
      difficulty: 3,
      question: "0.25 mol Na2CO3 reacts with excess HCl. Moles of CO2 produced?",
      options: ["0.125", "0.25", "0.50", "1.00"],
      correctIndex: 1,
      explanation: "1:1 stoichiometry Na2CO3→CO2.",
    },
    {
      subject: "Chemistry",
      topic: "Acids and bases",
      difficulty: 2,
      question: "Which solution has the **lowest pH**?",
      options: ["0.10 M HCl", "0.10 M CH3COOH", "0.10 M NH3", "Pure water"],
      correctIndex: 0,
      explanation: "Strong acid at same molarity yields lowest pH.",
    },
  ],
};

const TOPICS: Record<string, string[]> = {
  English: ["Language analysis", "Argument analysis", "Comparative"],
  "Mathematical Methods": ["Functions", "Calculus", "Probability", "Algebra"],
  Chemistry: ["Stoichiometry", "Acids and bases", "Redox", "Organic"],
};

function demoFor(subj: string): MCQ {
  const arr = DEMO[subj] ?? DEMO["English"];
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function POST(req: Request) {
  const { subject = "English", difficulty = 2 } = await req.json().catch(() => ({}));

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return noStore({ source: "demo", reason: "no_key", question: demoFor(subject) });
  }

  try {
    // randomise topic + add a seed so each call differs
    const pool = TOPICS[subject] ?? ["Core"];
    const topic = pool[Math.floor(Math.random() * pool.length)];
    const seed = Math.random().toString(36).slice(2);
    const diff = Math.max(1, Math.min(5, Number(difficulty) || 2));

    const prompt = `Return ONLY JSON with keys:
subject, topic, difficulty (1-5), question, options (array of 4 strings), correctIndex (0..3), explanation.
Write a fresh VCE ${subject} MCQ on "${topic}" at difficulty ${diff}. Use Australian/VCAA terminology.
Vary numbers/wording. Seed: ${seed}.`;

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.3,
        messages: [
          { role: "system", content: "Output ONLY compact JSON. No markdown or commentary." },
          { role: "user", content: prompt },
        ],
      }),
      cache: "no-store",
    });

    if (!r.ok) {
      const txt = await r.text();
      console.error("OPENAI_HTTP", r.status, txt);
      return noStore({ source: "demo", reason: `openai_http_${r.status}`, question: demoFor(subject) });
    }

    const j = await r.json();
    const text = j.choices?.[0]?.message?.content?.trim() || "{}";

    let parsed: MCQ;
    try {
      parsed = JSON.parse(text);
    } catch {
      console.error("PARSE_ERROR_TEXT", text.slice(0, 300));
      return noStore({ source: "demo", reason: "parse_error", question: demoFor(subject) });
    }

    const valid =
      parsed &&
      typeof parsed.question === "string" &&
      Array.isArray(parsed.options) &&
      parsed.options.length === 4 &&
      typeof parsed.correctIndex === "number";

    if (!valid) {
      console.error("SCHEMA_FAIL", parsed);
      return noStore({ source: "demo", reason: "schema_fail", question: demoFor(subject) });
    }

    return noStore({ source: "ai", question: parsed });
  } catch (err) {
    console.error("OPENAI_RUNTIME", err);
    return noStore({ source: "demo", reason: "runtime_error", question: demoFor(subject) });
  }
}
