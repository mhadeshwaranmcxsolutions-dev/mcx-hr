"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Department, Position } from "@/types";

interface CompanySettings {
  name: string;
  email: string;
  phone: string;
  address: string;
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-brand-navy outline-none transition focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20";

const Field = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <label className="block">
    <span className="mb-1.5 block text-sm font-medium text-slate-700">
      {label}
    </span>
    {children}
  </label>
);

const LoadingSpinner = ({ size = "md" }: { size?: "sm" | "md" }) => {
  const dims = size === "sm" ? "h-5 w-5 border-2" : "h-10 w-10 border-4";
  return (
    <div className="flex items-center justify-center py-10">
      <div
        className={`${dims} animate-spin rounded-full border-slate-200 border-t-brand-orange`}
      />
    </div>
  );
};

const SectionHeader = ({
  icon,
  title,
  subtitle,
}: {
  icon: string;
  title: string;
  subtitle: string;
}) => (
  <div className="mb-5 flex items-center gap-3">
    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange">
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={icon} />
      </svg>
    </div>
    <div>
      <h2 className="text-lg font-bold text-brand-navy">{title}</h2>
      <p className="text-sm text-slate-500">{subtitle}</p>
    </div>
  </div>
);

export default function SettingsPage() {
  const [company, setCompany] = useState<CompanySettings>({
    name: "",
    email: "",
    phone: "",
    address: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [deptLoading, setDeptLoading] = useState(true);
  const [newDeptName, setNewDeptName] = useState("");
  const [addingDept, setAddingDept] = useState(false);
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
  const [editingDeptName, setEditingDeptName] = useState("");
  const [deptError, setDeptError] = useState<string | null>(null);

  const [positions, setPositions] = useState<Position[]>([]);
  const [posLoading, setPosLoading] = useState(true);
  const [newPosTitle, setNewPosTitle] = useState("");
  const [newPosDept, setNewPosDept] = useState("");
  const [addingPos, setAddingPos] = useState(false);
  const [posError, setPosError] = useState<string | null>(null);

  const deptMap = new Map(departments.map((d) => [d.id, d.name]));

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      const [deptRes, posRes] = await Promise.all([
        supabase.from("departments").select("*").order("name"),
        supabase.from("positions").select("*").order("title"),
      ]);

      if (!active) return;

      if (deptRes.error) {
        setDeptError(deptRes.error.message);
      } else {
        setDepartments((deptRes.data as Department[]) || []);
      }
      setDeptLoading(false);

      if (posRes.error) {
        setPosError(posRes.error.message);
      } else {
        setPositions((posRes.data as Position[]) || []);
      }
      setPosLoading(false);
    };

    loadData();
    return () => {
      active = false;
    };
  }, []);

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    await new Promise((r) => setTimeout(r, 600));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleAddDept = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newDeptName.trim();
    if (!name) return;
    setAddingDept(true);
    setDeptError(null);

    const tempId = `temp-${Date.now()}`;
    const tempDept: Department = {
      id: tempId,
      name,
      created_at: new Date().toISOString(),
    };
    setDepartments((prev) => [...prev, tempDept]);
    setNewDeptName("");

    const { data, error } = await supabase
      .from("departments")
      .insert({ name })
      .select()
      .single();

    if (error) {
      setDepartments((prev) => prev.filter((d) => d.id !== tempId));
      setDeptError(error.message);
      setAddingDept(false);
      return;
    }

    setDepartments((prev) =>
      prev.map((d) => (d.id === tempId ? (data as Department) : d))
    );
    setAddingDept(false);
  };

  const startEditDept = (dept: Department) => {
    setEditingDeptId(dept.id);
    setEditingDeptName(dept.name);
  };

  const cancelEditDept = () => {
    setEditingDeptId(null);
    setEditingDeptName("");
  };

  const handleUpdateDept = async (id: string) => {
    const name = editingDeptName.trim();
    if (!name) return;
    const original = departments.find((d) => d.id === id);
    if (!original) return;

    setDepartments((prev) =>
      prev.map((d) => (d.id === id ? { ...d, name } : d))
    );
    setEditingDeptId(null);

    const { error } = await supabase
      .from("departments")
      .update({ name })
      .eq("id", id);

    if (error) {
      setDepartments((prev) =>
        prev.map((d) => (d.id === id ? original : d))
      );
      setDeptError(error.message);
    }
  };

  const handleDeleteDept = async (dept: Department) => {
    const snapshot = departments;
    setDepartments((prev) => prev.filter((d) => d.id !== dept.id));
    setPositions((prev) =>
      prev.map((p) =>
        p.department_id === dept.id ? { ...p, department_id: "" } : p
      )
    );

    const { error } = await supabase
      .from("departments")
      .delete()
      .eq("id", dept.id);

    if (error) {
      setDepartments(snapshot);
      setDeptError(error.message);
    }
  };

  const handleAddPos = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = newPosTitle.trim();
    if (!title || !newPosDept) return;
    setAddingPos(true);
    setPosError(null);

    const tempId = `temp-${Date.now()}`;
    const tempPos: Position = {
      id: tempId,
      title,
      department_id: newPosDept,
      created_at: new Date().toISOString(),
    };
    setPositions((prev) => [...prev, tempPos]);
    setNewPosTitle("");
    setNewPosDept("");

    const { data, error } = await supabase
      .from("positions")
      .insert({ title, department_id: newPosDept })
      .select()
      .single();

    if (error) {
      setPositions((prev) => prev.filter((p) => p.id !== tempId));
      setPosError(error.message);
      setAddingPos(false);
      return;
    }

    setPositions((prev) =>
      prev.map((p) => (p.id === tempId ? (data as Position) : p))
    );
    setAddingPos(false);
  };

  const handleDeletePos = async (pos: Position) => {
    const snapshot = positions;
    setPositions((prev) => prev.filter((p) => p.id !== pos.id));

    const { error } = await supabase
      .from("positions")
      .delete()
      .eq("id", pos.id);

    if (error) {
      setPositions(snapshot);
      setPosError(error.message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-navy">Settings</h1>
        <p className="text-sm text-slate-500">
          Manage company information, departments, and positions.
        </p>
      </div>

      <section className="rounded-2xl bg-white p-6 shadow-card">
        <SectionHeader
          icon="M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M9 13h.01M9 17h.01M15 9h.01M15 13h.01M15 17h.01"
          title="Company Settings"
          subtitle="Your organization's contact details"
        />
        <form onSubmit={handleSaveCompany} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Company name">
              <input
                type="text"
                value={company.name}
                onChange={(e) =>
                  setCompany((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="MCX Solution Sdn Bhd"
                className={inputClass}
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={company.email}
                onChange={(e) =>
                  setCompany((p) => ({ ...p, email: e.target.value }))
                }
                placeholder="contact@mcxsolution.com"
                className={inputClass}
              />
            </Field>
            <Field label="Phone">
              <input
                type="tel"
                value={company.phone}
                onChange={(e) =>
                  setCompany((p) => ({ ...p, phone: e.target.value }))
                }
                placeholder="+60 3-1234 5678"
                className={inputClass}
              />
            </Field>
            <Field label="Address">
              <input
                type="text"
                value={company.address}
                onChange={(e) =>
                  setCompany((p) => ({ ...p, address: e.target.value }))
                }
                placeholder="Kuala Lumpur, Malaysia"
                className={inputClass}
              />
            </Field>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-orange px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:bg-brand-orangeDark disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
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
                Saved successfully
              </span>
            )}
          </div>
        </form>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-card">
        <SectionHeader
          icon="M3 21h18M5 21V7l7-4 7 4v14M9 9h6M9 13h6M9 17h6"
          title="Departments"
          subtitle="Organize teams and their structure"
        />

        {deptError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
            {deptError}
          </div>
        )}

        <form
          onSubmit={handleAddDept}
          className="mb-5 flex flex-col gap-2 sm:flex-row"
        >
          <input
            type="text"
            value={newDeptName}
            onChange={(e) => setNewDeptName(e.target.value)}
            placeholder="New department name..."
            className={inputClass}
          />
          <button
            type="submit"
            disabled={addingDept || !newDeptName.trim()}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-orange px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:bg-brand-orangeDark disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            {addingDept ? "Adding..." : "Add"}
          </button>
        </form>

        {deptLoading ? (
          <LoadingSpinner />
        ) : departments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <p className="text-sm font-medium text-slate-500">
              No departments yet
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Add your first department above.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {departments.map((dept) => (
              <li
                key={dept.id}
                className="flex items-center justify-between gap-3 py-3"
              >
                {editingDeptId === dept.id ? (
                  <div className="flex flex-1 items-center gap-2">
                    <input
                      type="text"
                      value={editingDeptName}
                      onChange={(e) => setEditingDeptName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleUpdateDept(dept.id);
                        if (e.key === "Escape") cancelEditDept();
                      }}
                      autoFocus
                      className={inputClass}
                    />
                    <button
                      onClick={() => handleUpdateDept(dept.id)}
                      className="rounded-xl bg-brand-orange px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-orangeDark"
                    >
                      Save
                    </button>
                    <button
                      onClick={cancelEditDept}
                      className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-orange/10 text-brand-orange">
                        <svg
                          viewBox="0 0 24 24"
                          className="h-5 w-5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M3 21h18M5 21V7l7-4 7 4v14" />
                        </svg>
                      </div>
                      <span className="font-medium text-brand-navy">
                        {dept.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEditDept(dept)}
                        className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-brand-navy"
                        title="Rename"
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
                          <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteDept(dept)}
                        className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                        title="Delete"
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
                          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6" />
                        </svg>
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-card">
        <SectionHeader
          icon="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm13 14v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
          title="Positions"
          subtitle="Job titles mapped to departments"
        />

        {posError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
            {posError}
          </div>
        )}

        <form
          onSubmit={handleAddPos}
          className="mb-5 flex flex-col gap-2 sm:flex-row"
        >
          <input
            type="text"
            value={newPosTitle}
            onChange={(e) => setNewPosTitle(e.target.value)}
            placeholder="Position title..."
            className={inputClass}
          />
          <select
            value={newPosDept}
            onChange={(e) => setNewPosDept(e.target.value)}
            className={inputClass}
          >
            <option value="">Select department</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={addingPos || !newPosTitle.trim() || !newPosDept}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-orange px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:bg-brand-orangeDark disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            {addingPos ? "Adding..." : "Add"}
          </button>
        </form>

        {posLoading ? (
          <LoadingSpinner />
        ) : positions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <p className="text-sm font-medium text-slate-500">
              No positions yet
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Add your first position above.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {positions.map((pos) => (
              <li
                key={pos.id}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-navy/10 text-brand-navy">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 7h-9M14 17H5M17 17a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM7 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-brand-navy">{pos.title}</p>
                    <p className="text-xs text-slate-500">
                      {pos.department_id && deptMap.get(pos.department_id)
                        ? deptMap.get(pos.department_id)
                        : "Unassigned"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeletePos(pos)}
                  className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                  title="Delete"
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
                    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
