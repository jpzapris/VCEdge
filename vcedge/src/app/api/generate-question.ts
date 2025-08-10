export const dynamic = "force-dynamic";
export const revalidate = 0;


import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { subject, difficulty } = req.body;

    const prompt = `
    You are a VCE tutor. Create one multiple choice question in ${subject} at difficulty level ${difficulty} (1-5).
    Format it as:
    Question:
    A)
    B)
    C)
    D)
    Correct Answer:
    `;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // small + fast model
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    });

    const text = completion.choices[0].message.content;
    res.status(200).json({ question: text });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}
import { NextResponse } from "next/server";

function noStore(json: any) {
  const res = NextResponse.json(json);
  res.headers.set("Cache-Control", "no-store");
  return res;
}
