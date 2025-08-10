"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../supabaseClient";

type MCQ = {
  subject: string;
  topic?: string;
  difficulty: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

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

const DEFAULT_SUBJECTS = Object.keys(TOPICS);

export default function Practice() {
  const [subjects, setSubjects] = useState<string[]>(DEFAULT_SUBJECTS);
  const [subject, setSubject] = useState<string>(DEFAULT_SUBJECTS[0]);
  const [topic, setTopic] = useState<string>("Any topic");
  const [difficulty, setDifficulty] = useState<number>(2); // adaptive
  const [q, setQ] = useState<MCQ | null>(null);
  const [sel, setSel] = useState<number | null>(null);
  const [reveal, setReveal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"ai" | "demo" | "">("");
  const startedAt = useRef<number>(Date.now());

  const topicOptions = useMemo(
    () => ["Any topic", ...(TOPICS[subject] ?? ["Core"])],
    [subject]
  );

  // Load saved subjects (if any), then pull the first question
  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: prof } = await supabase
            .from("profiles")
            .select("subjects")
            .eq("id", user.id)
            .maybeSingle();
          if (prof?.subjects?.length) {
            setSubjects(prof.subjects.filter((s: string) => TOPICS[s]) || DEFAULT_SUBJECTS);
            setSubject(prof.subjects[0]);
          }
        }
      } catch {/* ignore */}
      await loadQ(subject, topic, difficulty);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadQ(subj: string, top: string, diff: number) {
    setLoading(true);
    setReveal(false);
    setSel(null);
    setStatus("");
    startedAt.current = Date.now();

    const r = await fetch(`/api/generate?ts=${Date.now()}`, {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: subj,
        topic: top === "Any topic" ? undefined : top,
        difficulty: diff,
      }),
    });

    // If API is in strict AI-only mode and errors, show a friendly message
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      const msg = j?.error || `Generator error (${r.status})`;
      setQ({
        subject: subj,
        topic: top === "Any topic" ? undefined : top,
        difficulty: diff,
        question: `Generation failed: ${msg}. Check OPENAI_API_KEY and REQUIRE_AI env vars in Vercel.`,
        options: ["Retry", "Retry", "Retry", "Retry"],
        correctIndex: 0,
        explanation: "This is a placeholder only due to upstream error.",
      });
      setStatus("");
      setLoading(false);
      return;
    }

    const j = await r.json();
    setStatus(j.source ?? "ai");
    setQ(j.question as MCQ);
    setLoading(false);
  }

  const correct = sel !== null && q ? sel === q.correctIndex : false;

  async function recordAttempt() {
    if (!q || sel === null) return;
    const timeSeconds = Math.max(0, Math.round((Date.now() - startedAt.current) / 1000));
    try {
      await fetch("/api/attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: q.subject,
          topic: q.topic ?? null,
          difficulty,
          selectedIndex: sel,
          correctIndex: q.correctIndex,
          timeSeconds,
        }),
      });
    } catch {/* ignore */}
  }

  async function nextQuestion(adaptFromCorrect: boolean) {
    // Adaptive difficulty: +1 on correct, -1 on incorrect
    const newDiff = Math.max(1, Math.min(5, difficulty + (adaptFromCorrect ? 1 : -1)));
    setDifficulty(newDiff);
    await loadQ(subject, topic, newDiff);
  }

  if (loading && !q) return <p style={{ padding: 24 }}>Loading…</p>;

  return (
    <main style={{ maxWidth: 900, margin: "40px auto", padding: 16 }}>
      <header
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto auto auto",
          gap: 12,
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <h1 style={{ margin: 0 }}>Practice</h1>
          <small style={{ opacity: 0.6 }}>
            {status === "ai" ? "AI" : status === "demo" ? "Demo" : ""}
          </small>
        </div>

        {/* Subject selector */}
        <div>
          <label style={{ fontSize: 14, marginRight: 6 }}>Subject:</label>
          <select
            value={subject}
            onChange={async (e) => {
              const s = e.target.value;
              setSubject(s);
              setTopic("Any topic");
              await loadQ(s, "Any topic", difficulty);
            }}
            style={{ padding: 6, borderRadius: 8 }}
          >
            {subjects.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Topic selector (changes with subject) */}
        <div>
          <label style={{ fontSize: 14, marginRight: 6 }}>Topic:</label>
          <select
            value={topic}
            onChange={async (e) => {
              const t = e.target.value;
              setTopic(t);
              await loadQ(subject, t, difficulty);
            }}
            style={{ padding: 6, borderRadius: 8 }}
          >
            {topicOptions.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Difficulty (shows current adaptive level; editable too) */}
        <div>
          <label style={{ fontSize: 14, marginRight: 6 }}>Difficulty:</label>
          <select
            value={difficulty}
            onChange={async (e) => {
              const d = Number(e.target.value);
              setDifficulty(d);
              await loadQ(subject, topic, d);
            }}
            style={{ padding: 6, borderRadius: 8 }}
          >
            {[1,2,3,4,5].map((d)=>(
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </header>

      {q && (
        <>
          <p style={{ opacity: 0.7, marginTop: 8 }}>
            {q.subject}{q.topic ? ` • ${q.topic}` : ""} • D{q.difficulty}
          </p>

          <h3 style={{ marginTop: 12, lineHeight: 1.5 }}>{q.question}</h3>

          <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
            {q.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => setSel(i)}
                style={{
                  textAlign: "left",
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid #ccc",
                  background: sel === i ? "#eef" : "#fff",
                  cursor: "pointer",
                }}
              >
                {String.fromCharCode(65 + i)}. {opt}
              </button>
            ))}
          </div>

          {!reveal ? (
            <button
              disabled={sel === null}
              onClick={() => setReveal(true)}
              style={{ marginTop: 16, padding: "10px 16px", borderRadius: 12, border: "1px solid #000", cursor: "pointer" }}
            >
              Check
            </button>
          ) : (
            <div style={{ marginTop: 16 }}>
              <p>
                <b>
                  {sel !== null && sel === q.correctIndex
                    ? "Correct ✅"
                    : `Incorrect ❌ (Answer ${String.fromCharCode(65 + (q?.correctIndex ?? 0))})`}
                </b>
              </p>
              <p style={{ marginTop: 8 }}>{q.explanation}</p>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  onClick={async () => {
                    await recordAttempt();
                    await nextQuestion(sel !== null && sel === q.correctIndex);
                  }}
                  style={{ marginTop: 16, padding: "10px 16px", borderRadius: 12, border: "1px solid #000", cursor: "pointer" }}
                >
                  Next question (adaptive)
                </button>

                <button
                  onClick={async () => {
                    await loadQ(subject, topic, difficulty);
                  }}
                  style={{ marginTop: 16, padding: "10px 16px", borderRadius: 12, border: "1px solid #aaa", background: "#fafafa", cursor: "pointer" }}
                >
                  Regenerate
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}

