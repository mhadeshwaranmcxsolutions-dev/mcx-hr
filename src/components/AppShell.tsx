"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { usePermissions } from "@/lib/permissions";
import type { Notification } from "@/types";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" },
  { href: "/employees", label: "Employees", icon: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm13 14v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" },
  { href: "/org-chart", label: "Org Chart", icon: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M19 3.13a4 4 0 0 1 0 7.75" },
  { href: "/attendance", label: "Attendance", icon: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 6v6l4 2" },
  { href: "/leave", label: "Leave", icon: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" },
  { href: "/holidays", label: "Holidays", icon: "M8 2v4M16 2v4M3 10h18M21 16v-4a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v4M3 20h18M8 16v4M16 16v4" },
  { href: "/shifts", label: "Shifts", icon: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 6v6l4 2" },
  { href: "/payroll", label: "Payroll", icon: "M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" },
  { href: "/expenses", label: "Expenses", icon: "M3 3h18v18H3zM3 9h18M9 21V9" },
  { href: "/performance", label: "Performance", icon: "M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z" },
  { href: "/training", label: "Training", icon: "M22 10v6M2 10l10-5 10 5-10 5zM6 12v5c3 3 9 3 12 0v-5" },
  { href: "/assets", label: "Assets", icon: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16zM3.27 6.96 12 12.01l8.73-5.05M12 22.08V12" },
  { href: "/recruitment", label: "Recruitment", icon: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM19 8v6M22 11h-6" },
  { href: "/onboarding", label: "Onboarding", icon: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8" },
  { href: "/reports", label: "Reports", icon: "M3 3v18h18M7 16V9M12 16V5M17 16v-3" },
  { href: "/audit-log", label: "Audit Log", icon: "M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" },
  { href: "/settings", label: "Settings", icon: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.3l2-1.6-2-3.4-2.4 1a7.4 7.4 0 0 0-2.2-1.3l-.4-2.5h-4l-.4 2.5A7.4 7.4 0 0 0 5.7 5.7l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.6l-2 1.6 2 3.4 2.4-1a7.4 7.4 0 0 0 2.2 1.3l.4 2.5h4l.4-2.5a7.4 7.4 0 0 0 2.2-1.3l2.4 1 2-3.4-2-1.6c.1-.4.1-.9.1-1.3Z" },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, role, signOut } = useAuth();
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotif, setShowNotif] = useState(false);

  useEffect(() => {
    if (!user?.email) return;
    let active = true;
    const fetchEmployee = async () => {
      const { data } = await supabase
        .from("employees")
        .select("id")
        .eq("email", user.email)
        .maybeSingle();
      if (active && data) setEmployeeId((data as { id: string }).id);
    };
    fetchEmployee();
    return () => { active = false; };
  }, [user?.email]);

  const { canAccess } = usePermissions(role, employeeId);

  const visibleNavItems = navItems.filter((item) => canAccess(item.href));

  useEffect(() => {
    if (!user?.id) return;
    const fetchNotifs = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      setNotifications(data || []);
    };
    fetchNotifs();
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => setNotifications((prev) => [payload.new as Notification, ...prev])
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const unread = notifications.filter((n) => !n.is_read).length;

  const markAllRead = async () => {
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user?.id).eq("is_read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  const initials = (user?.email || "U").split("@")[0].slice(0, 2).toUpperCase();

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <aside className="gradient-navy hidden w-64 flex-col overflow-y-auto scrollbar-thin lg:flex">
        <div className="flex h-16 items-center gap-3 px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-orange text-lg font-black text-white">M</div>
          <div>
            <div className="text-lg font-black tracking-tight text-white">MCX <span className="text-brand-orange">HR</span></div>
            <div className="text-[9px] font-semibold uppercase tracking-[0.15em] text-slate-400">HR System</div>
          </div>
        </div>

        <nav className="mt-4 flex-1 space-y-1 px-3 pb-4">
          {visibleNavItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                  active ? "bg-amber-700/80 text-white" : "text-slate-400 hover:bg-white/10 hover:text-white"
                }`}>
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={item.icon} />
                </svg>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-orange text-sm font-bold text-white">{initials}</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{user?.email}</p>
              <p className="text-xs capitalize text-slate-400">{role}</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
          <div className="flex items-center gap-3 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-orange text-sm font-black text-white">M</div>
            <span className="font-bold text-brand-navy">MCX HR</span>
          </div>
          <div className="hidden lg:block">
            <h1 className="text-lg font-bold text-brand-navy">{navItems.find((n) => n.href === pathname)?.label || "MCX HR"}</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <button onClick={() => setShowNotif(!showNotif)} className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                </svg>
                {unread > 0 && <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-orange text-[10px] font-bold text-white">{unread}</span>}
              </button>
              {showNotif && (
                <div className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                    <p className="font-semibold text-brand-navy">Notifications</p>
                    <button onClick={markAllRead} className="text-xs text-brand-orange hover:underline">Mark all read</button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 && <p className="p-4 text-center text-sm text-slate-400">No notifications</p>}
                    {notifications.map((n) => (
                      <Link key={n.id} href={n.link || "#"} onClick={() => setShowNotif(false)}
                        className={`block border-b border-slate-50 px-4 py-3 hover:bg-slate-50 ${!n.is_read ? "bg-orange-50/40" : ""}`}>
                        <p className="text-sm text-slate-700">{n.message}</p>
                        <p className="mt-1 text-xs text-slate-400">{new Date(n.created_at).toLocaleString()}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button onClick={handleSignOut} className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
              Sign Out
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto scrollbar-thin p-6">{children}</main>
      </div>
    </div>
  );
}
