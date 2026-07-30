import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-gray-100 bg-white p-5 shadow-sm ${className}`}>{children}</section>;
}

export function Pill({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-gradient-to-r from-yellow-500 to-amber-600 px-3 py-1 text-xs font-bold text-white">{children}</span>;
}
