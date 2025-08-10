"use client";

import { useState } from "react";
import { supabase } from "../../supabaseClient"; // stays two-levels up from /app/login/

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("Signing in...");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMsg(`Error: ${error.message}`);
    else {
      setMsg("Logged in! Redirecting…");
      window.location.href = "/onboarding";
    }
  };

  return (
    <main style={{ maxWidth: 420, margin: "40px auto", padding: 16 }}>
      <h1>Log in</h1>
      <form onSubmit={handleLogin}>
        <input type="email" placeholder="Email" value={email}
               onChange={(e) => setEmail(e.target.value)} required />
        <br /><br />
        <input type="password" placeholder="Password" value={password}
               onChange={(e) => setPassword(e.target.value)} required />
        <br /><br />
        <button type="submit">Log in</button>
      </form>
      {msg && <p style={{ marginTop: 8 }}>{msg}</p>}
    </main>
  );
}
