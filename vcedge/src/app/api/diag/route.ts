import { NextResponse } from "next/server";

export async function GET() {
  const hasKey = !!process.env.OPENAI_API_KEY;
  return NextResponse.json({
    OPENAI_KEY_PRESENT: hasKey,
    note: hasKey
      ? "Key is present in the server environment."
      : "Key missing. Add OPENAI_API_KEY in Vercel → Env Vars and redeploy.",
  });
}
