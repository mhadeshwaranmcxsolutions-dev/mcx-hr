"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import type { Permission, Role } from "@/types";

const ROLES: { key: Role; label: string; color: string }[] = [
  { key: "admin", label: "Admin", color: "bg-red-100 text-red-700" },
  { key: "hr", label: "HR", color: "bg-purple-100 text-purple-700" },
  { key: "manager", label: "Manager", color: "bg-blue-100 text-blue-700" },
  { key: "employee", label: "Employee", color: "bg-slate-100 text-slate-700" },
];

const PAGES = [
  { path: "/dashboard", label: "Dashboard" },
  { path: "/employees", label: "Employees" },
  { path: "/org-chart", label: "Org Chart" },
  { path: "/recruitment", label: "Recruitment" },
  { path: "/onboarding", label: "Onboarding" },
  { path: "/attendance", label: "Attendance" },
  { path: "/leave", label: "Leave" },
  { path: "/holidays", label: "Holidays" },
  { path: "/shifts", label: "Shifts" },
  { path: "/payroll", label: "Payroll" },
  { path: "/expenses", label: "Expenses" },
  { path: "/performance", label: "Performance" },
  { path: "/training", label: "Training" },
  { path: "/assets", label: "Assets" },
  { path: "/reports", label: "Reports" },
  { path: "/audit-log", label: "Audit Log" },
  { path: "/settings", label: "Settings" },
];

const BackButton = () => (
  <Link
    href="/settings"
    className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-brand-navy"
  >
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
    Back to Settings
  </Link>
);

export default function PermissionsPage() {
  const { role } = useAuth();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data } = await supabase.from("permissions").select("*");
      if (!active) return;
      setPermissions((data as Permission[]) || []);
      setLoading(false);
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  const permMap = useMemo(() => {
    const m = new Map<string, boolean>();
    permissions.filter((p) => !p.user_id).forEach((p) => m.set(`${p.role}:${p.page}`, p.can_access));
    return m;
  }, [permissions]);

  const getAccess = (r: Role, page: string) => {
    const val = permMap.get(`${r}:${page}`);
    return val === undefined ? true : val;
  };

  const toggle = async (r: Role, page: string) => {
    const current = getAccess(r, page);
    const next = !current;
    setPermissions((prev) => {
      const existing = prev.find((p) => p.role === r && p.page === page);
      if (existing) {
        return prev.map((p) =>
          p.id === existing.id ? { ...p, can_access: next } : p
        );
      }
      return [
        ...prev,
        {
          id: `temp-${Date.now()}`,
          role: r,
          page,
          user_id: null,
          can_access: next,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];
    });

    const existing = permissions.find((p) => p.role === r && p.page === page && !p.user_id);
    if (existing) {
      await supabase
        .from("permissions")
        .update({ can_access: next, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await supabase.from("permissions").insert({
        role: r,
        page,
        can_access: next,
      });
    }
  };

  const toggleRole = async (r: Role, value: boolean) => {
    setSaving(true);
    const updates = PAGES.map(async (p) => {
      const existing = permissions.find(
        (perm) => perm.role === r && perm.page === p.path && !perm.user_id
      );
      if (existing) {
        return supabase
          .from("permissions")
          .update({ can_access: value, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
      }
      return supabase
        .from("permissions")
        .insert({ role: r, page: p.path, can_access: value });
    });
    await Promise.all(updates);
    const { data } = await supabase.from("permissions").select("*");
    setPermissions((data as Permission[]) || []);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const togglePage = async (page: string, value: boolean) => {
    setSaving(true);
    const updates = ROLES.map(async (r) => {
      const existing = permissions.find(
        (perm) => perm.role === r.key && perm.page === page && !perm.user_id
      );
      if (existing) {
        return supabase
          .from("permissions")
          .update({ can_access: value, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
      }
      return supabase
        .from("permissions")
        .insert({ role: r.key, page, can_access: value });
    });
    await Promise.all(updates);
    const { data } = await supabase.from("permissions").select("*");
    setPermissions((data as Permission[]) || []);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (role !== "admin") {
    return (
      <div className="space-y-6">
        <BackButton />
        <div className="rounded-2xl bg-white p-10 text-center shadow-card">
          <svg
            viewBox="0 0 24 24"
            className="mx-auto h-12 w-12 text-slate-300"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
          </svg>
          <h2 className="mt-4 text-lg font-bold text-brand-navy">
            Access Restricted
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Only admins can manage permissions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BackButton />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">Permissions</h1>
          <p className="text-sm text-slate-500">
            Control which roles can access each page
          </p>
        </div>
        {saved && (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600">
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
            Saved
          </span>
        )}
      </div>

      <section className="overflow-hidden rounded-2xl bg-white shadow-card">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-brand-orange" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="sticky left-0 z-10 bg-slate-50 px-4 py-3 font-semibold text-slate-600">
                    Page
                  </th>
                  {ROLES.map((r) => (
                    <th key={r.key} className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${r.color}`}
                        >
                          {r.label}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => toggleRole(r.key, true)}
                            disabled={saving}
                            className="rounded px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 hover:bg-emerald-50"
                          >
                            All
                          </button>
                          <button
                            onClick={() => toggleRole(r.key, false)}
                            disabled={saving}
                            className="rounded px-1.5 py-0.5 text-[10px] font-medium text-red-600 hover:bg-red-50"
                          >
                            None
                          </button>
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {PAGES.map((page) => (
                  <tr key={page.path} className="hover:bg-slate-50/50">
                    <td className="sticky left-0 z-10 bg-white px-4 py-3 font-medium text-brand-navy">
                      <div className="flex items-center justify-between gap-2">
                        {page.label}
                        <div className="flex items-center gap-1 sm:hidden">
                          <button
                            onClick={() => togglePage(page.path, true)}
                            className="rounded px-1 py-0.5 text-[10px] text-emerald-600 hover:bg-emerald-50"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => togglePage(page.path, false)}
                            className="rounded px-1 py-0.5 text-[10px] text-red-600 hover:bg-red-50"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </td>
                    {ROLES.map((r) => {
                      const allowed = getAccess(r.key, page.path);
                      return (
                        <td key={r.key} className="px-4 py-3 text-center">
                          <button
                            onClick={() => toggle(r.key, page.path)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                              allowed ? "bg-brand-orange" : "bg-slate-300"
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                                allowed ? "translate-x-6" : "translate-x-1"
                              }`}
                            />
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-xs text-slate-400">
        Changes are saved instantly. Admin always has full access regardless of
        toggles.
      </p>
    </div>
  );
}
