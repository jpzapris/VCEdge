"use client";

import { useEffect, useRef, useState } from "react";
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

const DEFAULT_SUBJECTS = [
  "English",
  "Mathematical Methods",
  "Specialist Mathematics",
  "Chemistry",
  "Physics",
  "Biology",
  "Economics",
  "Psychology",
];

export default function Practice() {
  const [subjects, setSubjects] = useState<string[]>(DEFAULT_SUBJECTS);
  const [subject, setSubject] = useState<string>("English");
  const [q, setQ] = useState<MCQ | null>(null);
  const [sel, setSel] = useState<number | null>(null);
  const [reveal, setReveal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"ai" | "demo" | "">("");
  const startedAt = useRef<number>(Date.now());

  // Load user subjects (if saved) then first question
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
            setSubjects(prof.subjects);
            setSubject(prof.subjects[0]);
          }
        }
      } catch {/* ignore */}
      await loadQ(subject);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadQ(subj: string) {
    setLoading(true);
    setReveal(false);
    setSel(null);
    setStatus("");
    startedAt.current = Date.now();

    const r = await fetch(`/api/generate?ts=${Date.now()}`, {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject: subj, difficulty: 2 }),
    });

    const j = await r.json();
    setStatus(j.source ?? "");
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
          difficulty: q.difficulty,
          selectedIndex: sel,
          correctIndex: q.correctIndex,
          timeSeconds,
        }),
      });
    } catch {/* ignore */}
  }

  if (loading && !q) return <p style={{ padding: 24 }}>Loading…</p>;

  return (
    <main style={{ maxWidth: 780, margin: "40px auto", padding: 16 }}>
      <header style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <h1 style={{ margin: 0 }}>Practice</h1>
          <small style={{ opacity: 0.6 }}>{status === "ai" ? "AI" : status === "demo" ? "Demo" : ""}</small>
        </div>
        <div>
          <label style={{ fontSize: 14, marginRight: 6 }}>Subject:</label>
          <select
            value={subject}
            onChange={async (e) => {
              const s = e.target.value;
              setSubject(s);
              await loadQ(s);
            }}
            style={{ padding: 6, borderRadius: 8 }}
          >
            {subjects.map((s) => (
              <option key={s} value={s}>{s}</option>
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
                  {correct
                    ? "Correct ✅"
                    : `Incorrect ❌ (Answer ${String.fromCharCode(65 + (q?.correctIndex ?? 0))})`}
                </b>
              </p>
              <p style={{ marginTop: 8 }}>{q.explanation}</p>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  onClick={async () => {
                    await recordAttempt();
                    await loadQ(subject);
                  }}
                  style={{ marginTop: 16, padding: "10px 16px", borderRadius: 12, border: "1px solid #000", cursor: "pointer" }}
                >
                  Next question
                </button>
                <button
                  onClick={async () => {
                    // skip logging; just regenerate
                    await loadQ(subject);
                  }}
                  style={{ marginTop: 16, padding: "10px 16px", borderRadius: 12, border: "1px solid #aaa", cursor: "pointer", background: "#fafafa" }}
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
