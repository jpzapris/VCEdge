import { NextResponse } from "next/server";

type MCQ = {
  subject: string; topic?: string; difficulty: number;
  question: string; options: string[]; correctIndex: number; explanation: string;
};

const DEMO: Record<string, MCQ> = {
  English: {
    subject: "English",
    topic: "Language analysis",
    difficulty: 2,
    question: "Which statement best describes the author’s tone?",
    options: ["Dismissive","Cautiously optimistic","Ironic","Indifferent"],
    correctIndex: 1,
    explanation: "Phrases like “promising, provided” indicate cautious optimism."
  },
  "Mathematical Methods": {
    subject: "Mathematical Methods",
    topic: "Functions",
    difficulty: 2,
    question: "For f(x)=x^2−4x, the x-coordinate of the vertex is:",
    options: ["−4","−2","2","4"],
    correctIndex: 2,
    explanation: "Vertex at −b/(2a)=−(−4)/(2·1)=2."
  },
  Chemistry: {
    subject: "Chemistry",
    topic: "Stoichiometry",
    difficulty: 3,
    question: "0.25 mol Na2CO3 reacts with excess HCl. Moles of CO2 produced?",
    options: ["0.125","0.25","0.50","1.00"],
    correctIndex: 1,
    explanation: "1:1 ratio Na2CO3→CO2, so 0.25 mol."
  }
};

export async function POST(req: Request) {
  const { subject = "English", difficulty = 2 } = await req.json().catch(()=>({}));

  // Optional: real AI if you add OPENAI_API_KEY in Vercel env
  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    try {
      const prompt = `Write a VCE ${subject} multiple-choice question (difficulty ${difficulty}, 4 options) and return JSON with keys: subject, topic, difficulty, question, options[4], correctIndex (0..3), explanation. Use Australian/VCAA terminology.`;
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.2,
          messages: [
            { role: "system", content: "Output only compact JSON." },
            { role: "user", content: prompt }
          ]
        })
      });
      const j = await r.json();
      const text = j.choices?.[0]?.message?.content?.trim();
      const parsed = JSON.parse(text) as MCQ;
      if (parsed?.options?.length === 4) return NextResponse.json({ question: parsed });
    } catch {/* fall back to demo */}
  }

  const q = DEMO[subject] ?? DEMO["English"];
  return NextResponse.json({ question: q });
}
