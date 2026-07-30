import { AdminDashboard } from "@/components/admin-dashboard";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AdminPage(){
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const { data: profile } = await supabase.from("users").select("is_super_admin").eq("id", user.id).single();
  if (!profile?.is_super_admin) redirect("/");
  const [{data:settings},{data:cancellations},{data:risks},{data:requests},{data:rewards}]=await Promise.all([
    supabase.from("settings").select("gamification_enabled,theme").single(),
    supabase.from("sales").select("id,product,base_points,users(username)").eq("status","pending_cancellation"),
    supabase.from("monthly_activity").select("user_id,users(username)").eq("met_activation",false).order("month",{ascending:false}).limit(50),
    supabase.from("reward_requests").select("id,users(username),rewards(name,points_required)").eq("status","requested"),
    supabase.from("rewards").select("id,name,points_required,description").order("points_required")
  ]);
  const riskMap=new Map<string,unknown>();for(const row of risks??[]){if(!riskMap.has(row.user_id))riskMap.set(row.user_id,row);else riskMap.delete(row.user_id)}
  return <AdminDashboard initialGamification={settings?.gamification_enabled??true} initialTheme={settings?.theme??"gold"} cancellations={(cancellations??[]) as never} risks={[...riskMap.values()] as never} requests={(requests??[]) as never} rewards={(rewards??[]) as never}/>;
}
