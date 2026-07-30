import { AffiliateDashboard } from "@/components/affiliate-dashboard";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
export default async function Home() {
  const supabase=createServerSupabaseClient();
  const {data:{user}}=await supabase.auth.getUser(); if(!user) redirect("/login");
  const [{data:profile},{data:settings},{data:rewards},{data:activity}]=await Promise.all([
    supabase.from("users").select("username,lifetime_points,current_rank_id,ranks(name)").eq("id",user.id).single(),
    supabase.from("settings").select("gamification_enabled").single(),
    supabase.from("rewards").select("id,name,points_required").eq("active",true).order("points_required"),
    supabase.from("monthly_activity").select("met_activation").eq("user_id",user.id).order("month",{ascending:false}).limit(2)
  ]);
  if(!profile) redirect("/login");
  const nextReward=rewards?.find((r:{points_required:number})=>r.points_required>profile.lifetime_points) ?? rewards?.at(-1);
  return <AffiliateDashboard username={profile.username} points={profile.lifetime_points} rank={(profile.ranks as unknown as {name:string}|null)?.name ?? "INICIANTE"} reward={nextReward ?? null} riskMonths={activity?.filter((a:{met_activation:boolean})=>!a.met_activation).length ?? 0} gamification={settings?.gamification_enabled ?? true}/>;
}
