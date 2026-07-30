"use client";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
export function LogoutButton(){return <button title="Sair" onClick={async()=>{await createClient().auth.signOut();location.assign("/login")}} className="rounded-xl p-2 text-gray-500 hover:bg-white"><LogOut className="h-5 w-5"/></button>}
