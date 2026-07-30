"use client";

import { useState } from "react";
import { Copy, Megaphone, Network, ShoppingBag, Sparkles, Trophy } from "lucide-react";
import { Card, Pill } from "./ui";
import { LogoutButton } from "./logout-button";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const actions = [
  { label: "Copiar Link", icon: Copy },
  { label: "Registrar Venda", icon: ShoppingBag },
  { label: "Minha Rede", icon: Network },
  { label: "Materiais", icon: Megaphone }
];

type Props={username:string;points:number;rank:string;reward:{id:number;name:string;points_required:number}|null;riskMonths:number;gamification:boolean};
export function AffiliateDashboard({username,points,rank,reward,riskMonths,gamification}:Props) {
  const [copied, setCopied] = useState(false);
  const [requested, setRequested] = useState(false);
  const target = reward?.points_required ?? Math.max(points,1);

  async function copyLink() {
    await navigator.clipboard.writeText(`${location.origin}/convite/${username}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }
  async function requestReward(){if(!reward)return;const {data:{user}}=await createClient().auth.getUser();if(!user)return;const {error}=await createClient().from("reward_requests").insert({user_id:user.id,reward_id:reward.id});if(!error)setRequested(true)}

  return (
    <main className="mx-auto min-h-screen max-w-lg px-4 pb-12 pt-6">
      <header className="mb-7 flex items-center gap-3">
        <div className="grid h-14 w-14 place-items-center rounded-full border-2 border-[#D4AF37] bg-amber-50 text-lg font-bold uppercase text-amber-700">{username.slice(0,2)}</div>
        <div className="min-w-0 flex-1"><p className="text-sm text-gray-500">Olá, @{username}</p><h1 className="truncate text-xl font-extrabold">Seu painel</h1></div>
        {gamification && <Pill>{rank}</Pill>}<LogoutButton/>
      </header>

      {gamification && <Card className="relative mb-4 overflow-hidden bg-gray-950 text-white">
        <Sparkles className="absolute -right-4 -top-4 h-24 w-24 text-amber-500/20" />
        <p className="text-sm text-gray-400">Pontos vitalícios</p>
        <p className="mt-1 text-4xl font-black">{points.toLocaleString("pt-BR")}</p>
        <div className="mt-5 flex justify-between text-xs"><span>{reward?.name ?? "Meta atingida"}</span><span>{Math.max(target - points,0)} pontos restantes</span></div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-amber-600" style={{ width: `${Math.min(points / target * 100, 100)}%` }} /></div>
        {reward&&points >= target && <button disabled={requested} onClick={requestReward} className="gold-button mt-4 w-full rounded-xl py-3 font-bold disabled:opacity-70"><Trophy className="mr-2 inline h-4 w-4" />{requested ? "Solicitação enviada" : "Solicitar Prêmio"}</button>}
      </Card>}

      {riskMonths>=2 && <Card className="mb-6 border-amber-200 bg-amber-50">
        <div className="flex gap-3"><div className="mt-1 h-3 w-3 shrink-0 rounded-full bg-amber-500 ring-4 ring-amber-200" /><div><h2 className="font-bold text-amber-950">Atenção à sua ativação</h2><p className="mt-1 text-sm leading-5 text-amber-800">Você está há 2 meses abaixo do mínimo. Ative-se neste mês para manter sua posição na rede.</p></div></div>
      </Card>}

      <h2 className="mb-3 font-bold">Ações rápidas</h2>
      <div className="grid grid-cols-2 gap-3">
        {actions.map(({ label, icon: Icon }, index) => index===0?<button key={label} onClick={copyLink} className="group rounded-2xl border border-gray-100 bg-white p-5 text-left font-semibold shadow-sm hover:scale-105 hover:shadow-gold"><Icon className="mb-4 h-6 w-6 text-[#D4AF37]" />{copied?"Link copiado!":label}</button>:<Link key={label} href={index===1?"/vendas":index===2?"/rede":"/materiais"} className="group rounded-2xl border border-gray-100 bg-white p-5 text-left font-semibold shadow-sm hover:scale-105 hover:shadow-gold"><Icon className="mb-4 h-6 w-6 text-[#D4AF37]"/>{label}</Link>)}
      </div>
    </main>
  );
}
