"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Department } from "@/types";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-brand-navy outline-none transition focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20";

const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-10">
    <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-brand-orange" />
  </div>
);

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

export default function DepartmentsSettingsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("*")
        .order("name");
      if (!active) return;
      if (error) setError(error.message);
      else setDepartments((data as Department[]) || []);
      setLoading(false);
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    setError(null);
    const tempId = `temp-${Date.now()}`;
    setDepartments((prev) => [
      ...prev,
      { id: tempId, name, created_at: new Date().toISOString() },
    ]);
    setNewName("");
    const { data, error } = await supabase
      .from("departments")
      .insert({ name })
      .select()
      .single();
    if (error) {
      setDepartments((prev) => prev.filter((d) => d.id !== tempId));
      setError(error.message);
      setAdding(false);
      return;
    }
    setDepartments((prev) =>
      prev.map((d) => (d.id === tempId ? (data as Department) : d))
    );
    setAdding(false);
  };

  const handleUpdate = async (id: string) => {
    const name = editingName.trim();
    if (!name) return;
    const original = departments.find((d) => d.id === id);
    if (!original) return;
    setDepartments((prev) => prev.map((d) => (d.id === id ? { ...d, name } : d)));
    setEditingId(null);
    const { error } = await supabase
      .from("departments")
      .update({ name })
      .eq("id", id);
    if (error) {
      setDepartments((prev) => prev.map((d) => (d.id === id ? original : d)));
      setError(error.message);
    }
  };

  const handleDelete = async (dept: Department) => {
    const snapshot = departments;
    setDepartments((prev) => prev.filter((d) => d.id !== dept.id));
    const { error } = await supabase
      .from("departments")
      .delete()
      .eq("id", dept.id);
    if (error) {
      setDepartments(snapshot);
      setError(error.message);
    }
  };

  return (
    <div className="space-y-6">
      <BackButton />

      <div>
        <h1 className="text-2xl font-bold text-brand-navy">Departments</h1>
        <p className="text-sm text-slate-500">
          Organize teams and their structure
        </p>
      </div>

      <section className="rounded-2xl bg-white p-6 shadow-card">
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
            {error}
          </div>
        )}

        <form
          onSubmit={handleAdd}
          className="mb-5 flex flex-col gap-2 sm:flex-row"
        >
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New department name..."
            className={inputClass}
          />
          <button
            type="submit"
            disabled={adding || !newName.trim()}
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
            {adding ? "Adding..." : "Add"}
          </button>
        </form>

        {loading ? (
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
                {editingId === dept.id ? (
                  <div className="flex flex-1 items-center gap-2">
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleUpdate(dept.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      autoFocus
                      className={inputClass}
                    />
                    <button
                      onClick={() => handleUpdate(dept.id)}
                      className="rounded-xl bg-brand-orange px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-orangeDark"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
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
                        onClick={() => {
                          setEditingId(dept.id);
                          setEditingName(dept.name);
                        }}
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
                        onClick={() => handleDelete(dept)}
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
    </div>
  );
}
