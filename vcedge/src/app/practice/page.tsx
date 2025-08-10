"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";

type MCQ = {
  subject: string; topic?: string; difficulty: number;
  question: string; options: string[]; correctIndex: number; explanation: string;
};

export default function Practice() {
  const [q, setQ] = useState<MCQ | null>(null);
  const [sel, setSel] = useState<number | null>(null);
  const [reveal, setReveal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadQ(); }, []);

  async function loadQ() {
    setLoading(true);
    let subject = "English";
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: prof } = await supabase.from("profiles").select("subjects").eq("id", user.id).maybeSingle();
      if (prof?.subjects?.length) subject = prof.subjects[0];
    }
    const r = await fetch("/api/generate", { method: "POST", body: JSON.stringify({ subject, difficulty: 2 }) });
    const j = await r.json();
    setQ(j.question); setSel(null); setReveal(false); setLoading(false);
  }

  if (loading) return <p style={{padding:24}}>Loading…</p>;
  if (!q) return <p style={{padding:24}}>No question available.</p>;

  const correct = sel === q.correctIndex;

  return (
    <main style={{maxWidth:720,margin:"40px auto",padding:16}}>
      <h1>Practice</h1>
      <p style={{opacity:.7}}>{q.subject}{q.topic ? ` • ${q.topic}` : ""} • D{q.difficulty}</p>
      <h3 style={{marginTop:12}}>{q.question}</h3>
      <div style={{display:"grid",gap:10,marginTop:12}}>
        {q.options.map((opt, i)=>(
          <button key={i} onClick={()=>setSel(i)}
            style={{textAlign:"left",padding:"10px 12px",borderRadius:12,border:"1px solid #ccc",
                    background: sel===i ? "#eef" : "#fff"}}>
            {String.fromCharCode(65+i)}. {opt}
          </button>
        ))}
      </div>

      {!reveal ? (
        <button disabled={sel===null}
          onClick={()=>setReveal(true)}
          style={{marginTop:16,padding:"10px 16px",borderRadius:12,border:"1px solid #000"}}>
          Check
        </button>
      ) : (
        <div style={{marginTop:16}}>
          <p><b>{correct ? "Correct ✅" : `Incorrect ❌ (Answer ${String.fromCharCode(65 + q.correctIndex)})`}</b></p>
          <p style={{marginTop:8}}>{q.explanation}</p>
          <button onClick={loadQ} style={{marginTop:16,padding:"10px 16px",borderRadius:12,border:"1px solid #000"}}>
            Next question
          </button>
        </div>
      )}
    </main>
  );
}
