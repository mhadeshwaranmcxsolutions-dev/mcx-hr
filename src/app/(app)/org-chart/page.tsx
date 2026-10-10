"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import type { Employee, Department, Role } from "@/types";

type EmployeeStatus = "active" | "inactive" | "on_leave";

interface EmployeeRow extends Employee {
  departments?: { name: string } | null;
  positions?: { title: string } | null;
}

const roleStyles: Record<Role, string> = {
  admin: "bg-rose-50 text-rose-700",
  hr: "bg-brand-orange/10 text-brand-orange",
  manager: "bg-brand-blue/10 text-brand-blue",
  employee: "bg-emerald-50 text-emerald-700",
};

const statusDot: Record<EmployeeStatus, string> = {
  active: "bg-emerald-500",
  inactive: "bg-slate-400",
  on_leave: "bg-amber-500",
};

const statusLabel: Record<EmployeeStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  on_leave: "On Leave",
};

const getInitials = (first: string, last: string) =>
  `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();

export default function OrgChartPage() {
  const { session } = useAuth();

  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deptFilter, setDeptFilter] = useState<string>("all");

  useEffect(() => {
    if (!session) return;

    const loadData = async () => {
      setLoading(true);
      setError(null);

      const [empRes, deptRes] = await Promise.all([
        supabase
          .from("employees")
          .select("*, departments(name), positions(title)")
          .order("first_name", { ascending: true }),
        supabase.from("departments").select("*").order("name"),
      ]);

      if (empRes.error || deptRes.error) {
        setError("Failed to load org chart. Please try again.");
        setLoading(false);
        return;
      }

      setEmployees((empRes.data as EmployeeRow[]) || []);
      setDepartments(deptRes.data || []);
      setLoading(false);
    };

    loadData();
  }, [session]);

  const grouped = useMemo(() => {
    const map = new Map<string, EmployeeRow[]>();

    for (const emp of employees) {
      const key = emp.department_id ?? "unassigned";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(emp);
    }

    return map;
  }, [employees]);

  const visibleDepartments = useMemo(() => {
    if (deptFilter === "all") return departments;
    return departments.filter((d) => d.id === deptFilter);
  }, [departments, deptFilter]);

  const totalEmployees = employees.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">Org Chart</h1>
          <p className="text-sm text-slate-500">
            {totalEmployees} employee{totalEmployees === 1 ? "" : "s"} across{" "}
            {departments.length} department{departments.length === 1 ? "" : "s"}.
          </p>
        </div>
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-brand-navy outline-none transition focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 sm:w-64"
        >
          <option value="all">All departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700"
          >
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center rounded-2xl bg-white py-20 shadow-card">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-brand-orange" />
        </div>
      ) : totalEmployees === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl bg-white py-20 text-center shadow-card">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
            <svg
              viewBox="0 0 24 24"
              className="h-7 w-7 text-slate-400"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />
            </svg>
          </div>
          <p className="mt-3 text-sm font-medium text-slate-700">
            No employees yet
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Add employees to see the org chart.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {visibleDepartments.map((dept) => {
            const members = grouped.get(dept.id) ?? [];
            if (deptFilter !== "all" && members.length === 0) return null;

            return (
              <section
                key={dept.id}
                className="overflow-hidden rounded-2xl bg-white shadow-card"
              >
                <header className="flex items-center justify-between bg-brand-navy px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-orange text-white">
                      <svg
                        viewBox="0 0 24 24"
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white">
                        {dept.name}
                      </h2>
                      <p className="text-xs text-slate-300">Department</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-white">
                    {members.length}
                    <span className="hidden text-xs font-normal text-slate-300 sm:inline">
                      member{members.length === 1 ? "" : "s"}
                    </span>
                  </span>
                </header>

                {members.length === 0 ? (
                  <div className="px-5 py-10 text-center text-sm text-slate-400">
                    No employees in this department.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-4 p-5">
                    {members.map((emp) => (
                      <div
                        key={emp.id}
                        className="group w-full max-w-[220px] rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-card"
                      >
                        <div className="flex items-start gap-3">
                          <div className="relative">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-orange text-sm font-bold text-white">
                              {getInitials(emp.first_name, emp.last_name)}
                            </div>
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-white ${statusDot[emp.status]}`}
                              title={statusLabel[emp.status]}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-brand-navy">
                              {emp.first_name} {emp.last_name}
                            </p>
                            <p className="truncate text-xs text-slate-500">
                              {emp.positions?.title || emp.role}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-2">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${roleStyles[emp.role]}`}
                          >
                            {emp.role}
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                            <span
                              className={`h-2 w-2 rounded-full ${statusDot[emp.status]}`}
                            />
                            {statusLabel[emp.status]}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}

          {deptFilter === "all" && grouped.has("unassigned") && (
            <section className="overflow-hidden rounded-2xl bg-white shadow-card">
              <header className="flex items-center justify-between bg-slate-700 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-500 text-white">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">
                      Unassigned
                    </h2>
                    <p className="text-xs text-slate-300">No department</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-white">
                  {grouped.get("unassigned")!.length}
                </span>
              </header>
              <div className="flex flex-wrap gap-4 p-5">
                {grouped.get("unassigned")!.map((emp) => (
                  <div
                    key={emp.id}
                    className="group w-full max-w-[220px] rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-card"
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-orange text-sm font-bold text-white">
                          {getInitials(emp.first_name, emp.last_name)}
                        </div>
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-white ${statusDot[emp.status]}`}
                          title={statusLabel[emp.status]}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-brand-navy">
                          {emp.first_name} {emp.last_name}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {emp.positions?.title || emp.role}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${roleStyles[emp.role]}`}
                      >
                        {emp.role}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                        <span
                          className={`h-2 w-2 rounded-full ${statusDot[emp.status]}`}
                        />
                        {statusLabel[emp.status]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
