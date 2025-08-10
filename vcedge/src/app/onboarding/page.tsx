"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";

const SUBJECTS = [
  "English","Mathematical Methods","Specialist Mathematics",
  "Chemistry","Physics","Biology","Economics","Psychology"
];

export default function Onboarding() {
  const [year, setYear] = useState<11|12>(12);
  const [minutes, setMinutes] = useState(45);
  const [chosen, setChosen] = useState<string[]>([]);
  const [msg, setMsg] = useState("");

  function toggle(s: string) {
    setChosen(prev => prev.includes(s) ? prev.filter(x=>x!==s) : [...prev, s]);
  }

  async function save() {
    setMsg("Saving…");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setMsg("Please log in first (/login)."); return; }
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      year_level: year,
      dream_atar: 95,
      minutes_per_day: minutes,
      subjects_per_day: Math.max(1, Math.min(3, chosen.length || 1)),
      subjects: chosen
    });
    setMsg(error ? `Error: ${error.message}` : "Saved! Go to /practice");
  }

  return (
    <main style={{maxWidth:640,margin:"40px auto",padding:16}}>
      <h1>Onboarding</h1>
      <label>Year:&nbsp;
        <select value={year} onChange={e=>setYear(Number(e.target.value) as 11|12)}>
          <option value={11}>Year 11</option>
          <option value={12}>Year 12</option>
        </select>
      </label>
      <br/><br/>
      <label>Minutes per day:&nbsp;
        <input type="number" min={10} max={180} value={minutes}
               onChange={e=>setMinutes(Number(e.target.value))}/>
      </label>
      <br/><br/>
      <p><b>Pick subjects</b></p>
      <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
        {SUBJECTS.map(s=>(
          <button key={s} onClick={()=>toggle(s)}
            style={{padding:"6px 10px",border:"1px solid #ccc",borderRadius:12,
              background: chosen.includes(s)?"#000":"#fff",
              color: chosen.includes(s)?"#fff":"#000"}}>
            {s}
          </button>
        ))}
      </div>
      <br/>
      <button onClick={save} style={{padding:"10px 16px",borderRadius:12,border:"1px solid #000"}}>
        Save preferences
      </button>
      {msg && <p style={{marginTop:10}}>{msg}</p>}
    </main>
  );
}
