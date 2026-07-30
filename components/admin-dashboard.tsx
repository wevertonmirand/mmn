"use client";
import { useState } from "react";
import { AlertTriangle, Gift, Palette, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, Pill } from "./ui";

type Cancellation={id:string;product:string;base_points:number;users:{username:string}|null};
type Risk={user_id:string;users:{username:string}|null};
type Request={id:string;users:{username:string}|null;rewards:{name:string;points_required:number}|null};
type Reward={id:number;name:string;points_required:number;description:string};
type Props={initialGamification:boolean;initialTheme:string;cancellations:Cancellation[];risks:Risk[];requests:Request[];rewards:Reward[]};

export function AdminDashboard(props:Props) {
  const [gamification,setGamification]=useState(props.initialGamification);
  const [cancellations,setCancellations]=useState(props.cancellations);
  const [requests,setRequests]=useState(props.requests);
  const [rewards,setRewards]=useState(props.rewards);
  const supabase=createClient();
  async function updateSetting(values:{gamification_enabled?:boolean;theme?:string}){await supabase.from("settings").update({...values,updated_at:new Date().toISOString()}).eq("singleton",true)}
  async function review(id:string,approve:boolean){const {error}=await supabase.rpc(approve?"approve_sale_cancellation":"reject_sale_cancellation",{p_sale_id:id});if(!error)setCancellations(all=>all.filter(x=>x.id!==id))}
  async function deliver(id:string){const {error}=await supabase.from("reward_requests").update({status:"delivered",delivered_at:new Date().toISOString()}).eq("id",id);if(!error)setRequests(all=>all.filter(x=>x.id!==id))}
  async function addReward(formData:FormData){const payload={name:String(formData.get("name")),points_required:Number(formData.get("points")),description:String(formData.get("description"))};const {data}=await supabase.from("rewards").insert(payload).select("id,name,points_required,description").single();if(data)setRewards(all=>[...all,data])}
  return <main className="mx-auto max-w-5xl px-4 py-7"><header className="mb-7 flex items-center justify-between"><div><p className="text-sm text-gray-500">Acesso único</p><h1 className="text-2xl font-black">Central do Admin</h1></div><Pill>SUPER ADMIN</Pill></header>
    <div className="mb-5 grid gap-4 md:grid-cols-2"><Card><div className="flex items-center gap-3"><ShieldCheck className="text-[#D4AF37]"/><div className="flex-1"><b>Gamificação</b><p className="text-xs text-gray-500">Exibe badges e progresso aos afiliados</p></div><button role="switch" aria-checked={gamification} onClick={()=>{setGamification(!gamification);updateSetting({gamification_enabled:!gamification})}} className={`h-7 w-12 rounded-full p-1 ${gamification?"bg-amber-500":"bg-gray-300"}`}><span className={`block h-5 w-5 rounded-full bg-white transition ${gamification?"translate-x-5":""}`}/></button></div></Card><Card><div className="flex items-center gap-3"><Palette className="text-[#D4AF37]"/><div className="flex-1"><b>Paleta</b><p className="text-xs text-gray-500">Preferência global</p></div>{["graphite","gold"].map(t=><button key={t} onClick={()=>updateSetting({theme:t})} className={`ml-2 rounded-lg px-3 py-2 text-xs text-white ${t==="gold"?"bg-amber-500":"bg-gray-950"}`}>{t==="gold"?"Dourado":"Grafite"}</button>)}</div></Card></div>
    <div className="grid gap-5 lg:grid-cols-2"><section><h2 className="mb-3 font-extrabold">Cancelamentos pendentes</h2><div className="space-y-3">{cancellations.map(c=><Card key={c.id}><b>@{c.users?.username} · {c.product}</b><p className="mb-4 text-sm">Impacto: {c.base_points} pontos-base</p><div className="flex gap-2"><button onClick={()=>review(c.id,true)} className="gold-button flex-1 rounded-xl p-2 font-bold">Aprovar</button><button onClick={()=>review(c.id,false)} className="flex-1 rounded-xl border p-2 font-bold">Recusar</button></div></Card>)}{!cancellations.length&&<p className="text-sm text-gray-500">Nenhum cancelamento pendente.</p>}</div></section>
    <section><h2 className="mb-3 font-extrabold">Risco de inatividade</h2><Card>{props.risks.map(r=><div key={r.user_id} className="flex items-center gap-3 border-b py-3 last:border-0"><AlertTriangle className="h-5 w-5 text-amber-500"/><div><b>@{r.users?.username}</b><p className="text-xs text-gray-500">2 meses abaixo do mínimo</p></div></div>)}{!props.risks.length&&<p className="text-sm text-gray-500">Nenhum alerta atual.</p>}</Card></section>
    <section><h2 className="mb-3 font-extrabold">Solicitações de prêmio</h2><div className="space-y-3">{requests.map(r=><Card key={r.id} className="flex items-center gap-3"><Gift className="text-[#D4AF37]"/><div className="flex-1"><b>@{r.users?.username}</b><p className="text-xs text-gray-500">{r.rewards?.name} · {r.rewards?.points_required} pts</p></div><button onClick={()=>deliver(r.id)} className="rounded-xl border px-3 py-2 text-sm font-bold">Marcar entregue</button></Card>)}</div></section>
    <section><h2 className="mb-3 font-extrabold">Catálogo de prêmios</h2><Card><form action={addReward} className="space-y-2"><input name="name" required className="w-full rounded-xl border p-3" placeholder="Nome do prêmio"/><input name="points" required min="1" className="w-full rounded-xl border p-3" type="number" placeholder="Pontos necessários"/><textarea name="description" className="w-full rounded-xl border p-3" placeholder="Descrição"/><button className="gold-button w-full rounded-xl p-3 font-bold">Adicionar prêmio</button></form><ul className="mt-4 space-y-2">{rewards.map(r=><li key={r.id} className="text-sm"><b>{r.name}</b> · {r.points_required} pts</li>)}</ul></Card></section></div></main>;
}
