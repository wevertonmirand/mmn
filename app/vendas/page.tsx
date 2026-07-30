import { SalesCrm } from "@/components/sales-crm";
import { createServerSupabaseClient } from "@/lib/supabase/server";
export default async function SalesPage() { const supabase=createServerSupabaseClient(); const {data}=await supabase.from("sales").select("id,product,base_points,status,created_at").order("created_at",{ascending:false}); return <SalesCrm initialSales={data ?? []} />; }
