"use client";
import { useState } from "react";
import { Card } from "./ui";
import { createClient } from "@/lib/supabase/client";

type Sale = { id: string; product: string; base_points: number; status: "confirmed" | "pending_cancellation" | "cancelled";created_at:string };
export function SalesCrm({initialSales}:{initialSales:Sale[]}) {
  const [sales, setSales] = useState(initialSales); const [message,setMessage]=useState("");
  async function submit(formData: FormData) {
    const supabase=createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user)return;
    const {data,error}=await supabase.from("sales").insert({user_id:user.id,product:String(formData.get("product")),base_points:Number(formData.get("points")),product_quantity:1}).select("id,product,base_points,status,created_at").single();
    if(error){setMessage("Não foi possível registrar a venda.");return} setSales(current => [data,...current]);setMessage("Venda registrada e pontuada.");
  }
  async function cancel(id:string){const {error}=await createClient().rpc("request_sale_cancellation",{p_sale_id:id});if(error){setMessage("Não foi possível solicitar o cancelamento.");return}setSales(all=>all.map(x=>x.id===id?{...x,status:"pending_cancellation"}:x));setMessage("Cancelamento enviado para análise.")}
  return <div className="mx-auto max-w-2xl space-y-4 p-4"><h1 className="text-2xl font-black">Registrar venda</h1><Card><form action={submit} className="space-y-3"><input name="product" required placeholder="Produto" className="w-full rounded-xl border p-3" /><input name="points" required min="1" max="100000" type="number" placeholder="Pontos" className="w-full rounded-xl border p-3" /><button className="gold-button w-full rounded-xl p-3 font-bold">Registrar</button>{message&&<p aria-live="polite" className="text-sm text-gray-600">{message}</p>}</form></Card>{sales.map(s => <Card key={s.id} className="flex items-center justify-between"><div><b>{s.product}</b><p className="text-sm text-gray-500">{s.base_points} pts · {s.status.replaceAll("_", " ")}</p></div><button disabled={s.status !== "confirmed"} onClick={() => cancel(s.id)} className="text-sm font-bold text-amber-700 disabled:opacity-40">Cancelar</button></Card>)}</div>;
}
