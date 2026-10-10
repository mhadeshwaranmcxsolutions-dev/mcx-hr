"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import type { Announcement, Employee } from "@/types";

const quickLinks = [
  { href: "/attendance", label: "Clock In", icon: "M12 8v4l3 3M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z", color: "bg-emerald-500" },
  { href: "/leave", label: "Apply Leave", icon: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z", color: "bg-brand-orange" },
  { href: "/payroll", label: "My Payslip", icon: "M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6", color: "bg-brand-navy" },
  { href: "/employees", label: "Directory", icon: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75", color: "bg-blue-500" },
];

export default function LandingPage() {
  const { user, role } = useAuth();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    if (!user?.email) return;
    let active = true;
    const load = async () => {
      const { data: emp } = await supabase
        .from("employees")
        .select("*")
        .eq("email", user.email)
        .maybeSingle();
      if (active) setEmployee((emp as Employee) || null);

      const { data: ann } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      if (active) setAnnouncements((ann as Announcement[]) || []);
    };
    load();
    return () => { active = false; };
  }, [user?.email]);

  const firstName = employee?.first_name || user?.email?.split("@")[0] || "there";

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-brand-navy to-[#13315C] p-8 text-white shadow-card">
        <h1 className="text-3xl font-bold">Welcome back, {firstName} 👋</h1>
        <p className="mt-2 text-slate-300">
          {new Date().toLocaleDateString("en-MY", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
        <div className="mt-6 flex flex-wrap gap-4">
          <div className="rounded-xl bg-white/10 px-5 py-3 backdrop-blur">
            <p className="text-xs text-slate-300">Your Role</p>
            <p className="text-lg font-bold capitalize">{role}</p>
          </div>
          {employee?.department_id && (
            <div className="rounded-xl bg-white/10 px-5 py-3 backdrop-blur">
              <p className="text-xs text-slate-300">Department</p>
              <p className="text-lg font-bold">{employee.position_id ? "—" : "—"}</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="group flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-card transition hover:-translate-y-1 hover:shadow-lg"
          >
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${link.color} text-white`}>
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={link.icon} />
              </svg>
            </div>
            <span className="text-sm font-semibold text-brand-navy group-hover:text-brand-orange">{link.label}</span>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-2xl bg-white p-6 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-brand-navy">Announcements</h2>
            {role === "admin" && (
              <Link href="/dashboard" className="text-xs font-semibold text-brand-orange hover:underline">
                Post new
              </Link>
            )}
          </div>
          <div className="mt-4 space-y-3">
            {announcements.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">No announcements yet.</p>
            ) : (
              announcements.map((a) => (
                <div key={a.id} className="rounded-xl border border-slate-100 p-4">
                  <p className="text-sm font-semibold text-brand-navy">{a.title}</p>
                  <p className="mt-1 text-sm text-slate-500">{a.content}</p>
                  <p className="mt-2 text-xs text-slate-400">
                    {new Date(a.created_at).toLocaleDateString("en-MY")}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-card">
          <h2 className="text-lg font-bold text-brand-navy">Quick Actions</h2>
          <div className="mt-4 space-y-2">
            <Link href="/attendance" className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3 transition hover:border-brand-orange/40 hover:bg-brand-orange/5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                </div>
                <span className="text-sm font-medium text-brand-navy">Clock In / Out</span>
              </div>
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
            </Link>
            <Link href="/leave" className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3 transition hover:border-brand-orange/40 hover:bg-brand-orange/5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-orange/10 text-brand-orange">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" /></svg>
                </div>
                <span className="text-sm font-medium text-brand-navy">Request Leave</span>
              </div>
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
            </Link>
            <Link href="/expenses" className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3 transition hover:border-brand-orange/40 hover:bg-brand-orange/5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" /></svg>
                </div>
                <span className="text-sm font-medium text-brand-navy">Submit Expense</span>
              </div>
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
            </Link>
            <Link href="/performance" className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3 transition hover:border-brand-orange/40 hover:bg-brand-orange/5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20V10M18 20V4M6 20v-4" /></svg>
                </div>
                <span className="text-sm font-medium text-brand-navy">My Performance</span>
              </div>
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
