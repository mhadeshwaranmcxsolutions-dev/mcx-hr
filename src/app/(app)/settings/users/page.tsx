"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import type { Department, Employee, Permission, Position, Role } from "@/types";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-brand-navy outline-none transition focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20";

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block">
    <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
    {children}
  </label>
);

const BackButton = () => (
  <Link href="/settings" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-brand-navy">
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
    Back to Settings
  </Link>
);

const ROLES: Role[] = ["admin", "hr", "manager", "employee"];

const PAGES = [
  { path: "/landing", label: "Landing Page" },
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

interface FormState {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: Role;
  department_id: string;
  position_id: string;
  salary: string;
  landing_page: string;
}

const LANDING_PAGE_OPTIONS = [
  { path: "/landing", label: "Landing Page" },
  { path: "/dashboard", label: "Dashboard" },
  { path: "/employees", label: "Employees" },
  { path: "/attendance", label: "Attendance" },
  { path: "/leave", label: "Leave" },
  { path: "/payroll", label: "Payroll" },
  { path: "/reports", label: "Reports" },
];

const emptyForm: FormState = {
  email: "",
  password: "",
  first_name: "",
  last_name: "",
  phone: "",
  role: "employee",
  department_id: "",
  position_id: "",
  salary: "0",
  landing_page: "/dashboard",
};

export default function UserManagementPage() {
  const { role } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [permUserId, setPermUserId] = useState<string | null>(null);
  const [showPermModal, setShowPermModal] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const [empRes, deptRes, posRes, permRes] = await Promise.all([
        supabase.from("employees").select("*").order("first_name"),
        supabase.from("departments").select("*").order("name"),
        supabase.from("positions").select("*").order("title"),
        supabase.from("permissions").select("*"),
      ]);
      if (!active) return;
      setEmployees((empRes.data as Employee[]) || []);
      setDepartments((deptRes.data as Department[]) || []);
      setPositions((posRes.data as Position[]) || []);
      setAllPermissions((permRes.data as Permission[]) || []);
      setLoading(false);
    };
    load();
    return () => { active = false; };
  }, []);

  const deptMap = useMemo(() => new Map(departments.map((d) => [d.id, d.name])), [departments]);
  const posMap = useMemo(() => new Map(positions.map((p) => [p.id, p.title])), [positions]);

  const openCreate = () => {
    setEditingEmployee(null);
    setForm(emptyForm);
    setError(null);
    setShowForm(true);
  };

  const openEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setForm({
      email: emp.email,
      password: "",
      first_name: emp.first_name,
      last_name: emp.last_name,
      phone: emp.phone || "",
      role: emp.role,
      department_id: emp.department_id || "",
      position_id: emp.position_id || "",
      salary: String(emp.salary || 0),
      landing_page: emp.landing_page || "/dashboard",
    });
    setError(null);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    if (editingEmployee) {
      const payload: any = {
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone,
        role: form.role,
        department_id: form.department_id || null,
        position_id: form.position_id || null,
        salary: Number(form.salary) || 0,
        landing_page: form.landing_page || "/dashboard",
      };
      if (form.password) payload.password = form.password;

      const res = await fetch(`/api/users/${editingEmployee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update user");
        setSubmitting(false);
        return;
      }
      setEmployees((prev) => prev.map((e) => e.id === editingEmployee.id ? { ...e, ...payload } : e));
    } else {
      if (!form.password) {
        setError("Password is required for new users");
        setSubmitting(false);
        return;
      }
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          first_name: form.first_name,
          last_name: form.last_name,
          phone: form.phone,
          role: form.role,
          department_id: form.department_id || null,
          position_id: form.position_id || null,
          salary: Number(form.salary) || 0,
          landing_page: form.landing_page || "/dashboard",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create user");
        setSubmitting(false);
        return;
      }
      const { data: newEmp } = await supabase.from("employees").select("*").eq("email", form.email).single();
      if (newEmp) setEmployees((prev) => [...prev, newEmp as Employee]);
    }

    setSubmitting(false);
    setShowForm(false);
  };

  const handleDelete = async (emp: Employee) => {
    if (!confirm(`Delete user ${emp.first_name} ${emp.last_name}? This cannot be undone.`)) return;
    const res = await fetch(`/api/users/${emp.id}`, { method: "DELETE" });
    if (res.ok) {
      setEmployees((prev) => prev.filter((e) => e.id !== emp.id));
    } else {
      const data = await res.json();
      setError(data.error || "Failed to delete user");
    }
  };

  const userPerms = useMemo(() => {
    if (!permUserId) return new Map<string, boolean>();
    const m = new Map<string, boolean>();
    allPermissions.filter((p) => p.user_id === permUserId).forEach((p) => m.set(p.page, p.can_access));
    return m;
  }, [allPermissions, permUserId]);

  const toggleUserPerm = async (page: string) => {
    if (!permUserId) return;
    const emp = employees.find((e) => e.id === permUserId);
    if (!emp) return;
    const current = userPerms.get(page);
    const next = current === undefined ? !getDefaultAccess(emp.role, page) : !current;

    const existing = allPermissions.find((p) => p.user_id === permUserId && p.page === page);
    if (existing) {
      await supabase.from("permissions").update({ can_access: next }).eq("id", existing.id);
      setAllPermissions((prev) => prev.map((p) => p.id === existing.id ? { ...p, can_access: next } : p));
    } else {
      const { data } = await supabase.from("permissions").insert({ role: emp.role, page, user_id: permUserId, can_access: next }).select().single();
      if (data) setAllPermissions((prev) => [...prev, data as Permission]);
    }
  };

  const getDefaultAccess = (userRole: Role, page: string): boolean => {
    if (userRole === "admin") return true;
    const perm = allPermissions.find((p) => p.role === userRole && p.page === page && !p.user_id);
    return perm ? perm.can_access : true;
  };

  if (role !== "admin") {
    return (
      <div className="space-y-6">
        <BackButton />
        <div className="rounded-2xl bg-white p-10 text-center shadow-card">
          <svg viewBox="0 0 24 24" className="mx-auto h-12 w-12 text-slate-300" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
          </svg>
          <h2 className="mt-4 text-lg font-bold text-brand-navy">Access Restricted</h2>
          <p className="mt-1 text-sm text-slate-500">Only admins can manage users.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BackButton />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">User Management</h1>
          <p className="text-sm text-slate-500">Create users, set roles, departments, and page permissions</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-xl bg-brand-orange px-4 py-2.5 text-sm font-semibold text-white shadow-glow hover:bg-brand-orangeDark">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
          New User
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>
      )}

      <section className="overflow-hidden rounded-2xl bg-white shadow-card">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-brand-orange" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3 font-semibold">User</th>
                  <th className="px-5 py-3 font-semibold">Role</th>
                  <th className="px-5 py-3 font-semibold">Department</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-orange text-sm font-bold text-white">
                          {emp.first_name[0]}{emp.last_name[0]}
                        </div>
                        <div>
                          <p className="font-medium text-brand-navy">{emp.first_name} {emp.last_name}</p>
                          <p className="text-xs text-slate-500">{emp.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ${
                        emp.role === "admin" ? "bg-red-100 text-red-700" :
                        emp.role === "hr" ? "bg-purple-100 text-purple-700" :
                        emp.role === "manager" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-700"
                      }`}>{emp.role}</span>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{emp.department_id ? deptMap.get(emp.department_id) || "—" : "—"}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                        emp.status === "active" ? "bg-emerald-100 text-emerald-700" :
                        emp.status === "on_leave" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"
                      }`}>{emp.status.replace("_", " ")}</span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(emp)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-brand-navy" title="Edit">
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                        </button>
                        <button onClick={() => { setPermUserId(emp.id); setShowPermModal(true); }} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-brand-navy" title="Permissions">
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /></svg>
                        </button>
                        <button onClick={() => handleDelete(emp)} className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600" title="Delete">
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-navy/40 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-card">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-bold text-brand-navy">{editingEmployee ? "Edit User" : "Create New User"}</h2>
              <button onClick={() => setShowForm(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
              <div className="grid grid-cols-2 gap-4">
                <Field label="First name">
                  <input type="text" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className={inputClass} required />
                </Field>
                <Field label="Last name">
                  <input type="text" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className={inputClass} required />
                </Field>
              </div>
              <Field label="Email">
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} required disabled={!!editingEmployee} />
              </Field>
              <Field label={editingEmployee ? "New password (leave blank to keep current)" : "Password"}>
                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={inputClass} placeholder={editingEmployee ? "••••••••" : "At least 6 characters"} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Role">
                  <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })} className={inputClass}>
                    {ROLES.map((r) => <option key={r} value={r} className="capitalize">{r}</option>)}
                  </select>
                </Field>
                <Field label="Phone">
                  <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} placeholder="+60..." />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Department">
                  <select value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })} className={inputClass}>
                    <option value="">None</option>
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </Field>
                <Field label="Position">
                  <select value={form.position_id} onChange={(e) => setForm({ ...form, position_id: e.target.value })} className={inputClass}>
                    <option value="">None</option>
                    {positions.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Salary (RM)">
                <input type="number" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} className={inputClass} />
              </Field>
              <Field label="Default Landing Page">
                <select value={form.landing_page} onChange={(e) => setForm({ ...form, landing_page: e.target.value })} className={inputClass}>
                  {LANDING_PAGE_OPTIONS.map((p) => <option key={p.path} value={p.path}>{p.label}</option>)}
                </select>
              </Field>
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={submitting} className="rounded-xl bg-brand-orange px-5 py-2.5 text-sm font-semibold text-white shadow-glow hover:bg-brand-orangeDark disabled:opacity-60">
                  {submitting ? "Saving..." : editingEmployee ? "Update User" : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPermModal && permUserId && (() => {
        const emp = employees.find((e) => e.id === permUserId);
        if (!emp) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-navy/40 p-4 backdrop-blur-sm">
            <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-card">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <div>
                  <h2 className="text-lg font-bold text-brand-navy">Page Permissions</h2>
                  <p className="text-sm text-slate-500">{emp.first_name} {emp.last_name} · overrides role defaults</p>
                </div>
                <button onClick={() => setShowPermModal(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="p-6">
                <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {PAGES.map((page) => {
                    const override = userPerms.get(page.path);
                    const isDefault = override === undefined;
                    const allowed = isDefault ? getDefaultAccess(emp.role, page.path) : override;
                    return (
                      <div key={page.path} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-brand-navy">{page.label}</p>
                          {!isDefault && <p className="text-[10px] text-amber-600">Overridden</p>}
                        </div>
                        <button onClick={() => toggleUserPerm(page.path)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${allowed ? "bg-brand-orange" : "bg-slate-300"}`}>
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${allowed ? "translate-x-6" : "translate-x-1"}`} />
                        </button>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-end border-t border-slate-100 pt-4">
                  <button onClick={() => setShowPermModal(false)} className="rounded-xl bg-brand-orange px-5 py-2.5 text-sm font-semibold text-white shadow-glow hover:bg-brand-orangeDark">Done</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
