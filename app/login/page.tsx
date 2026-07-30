"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function login(formData: FormData) {
    setLoading(true); setError("");
    const { error } = await createClient().auth.signInWithPassword({ email: String(formData.get("email")), password: String(formData.get("password")) });
    if (error) { setError("E-mail ou senha inválidos."); setLoading(false); return; }
    location.assign("/");
  }
  return <main className="grid min-h-screen place-items-center bg-slate-50 p-4"><div className="w-full max-w-sm rounded-3xl bg-white p-7 shadow-sm"><div className="mb-7 text-center"><div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-yellow-500 to-amber-600 text-2xl font-black text-white">A</div><h1 className="text-2xl font-black">Bem-vindo à Aurum</h1><p className="mt-1 text-sm text-gray-500">Entre para acessar sua rede.</p></div><form action={login} className="space-y-3"><label className="block text-sm font-semibold">E-mail<input name="email" required type="email" autoComplete="email" className="mt-1 w-full rounded-xl border p-3 font-normal" /></label><label className="block text-sm font-semibold">Senha<input name="password" required type="password" autoComplete="current-password" className="mt-1 w-full rounded-xl border p-3 font-normal" /></label>{error && <p role="alert" className="text-sm text-red-600">{error}</p>}<button disabled={loading} className="gold-button w-full rounded-xl p-3 font-bold disabled:opacity-60">{loading ? "Entrando..." : "Entrar"}</button></form></div></main>;
}
