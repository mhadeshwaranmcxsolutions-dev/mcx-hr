"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Department, Position } from "@/types";

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

export default function PositionsSettingsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [newDept, setNewDept] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deptMap = new Map(departments.map((d) => [d.id, d.name]));

  useEffect(() => {
    let active = true;
    const load = async () => {
      const [deptRes, posRes] = await Promise.all([
        supabase.from("departments").select("*").order("name"),
        supabase.from("positions").select("*").order("title"),
      ]);
      if (!active) return;
      if (deptRes.error) setError(deptRes.error.message);
      else setDepartments((deptRes.data as Department[]) || []);
      if (posRes.error) setError(posRes.error.message);
      else setPositions((posRes.data as Position[]) || []);
      setLoading(false);
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title || !newDept) return;
    setAdding(true);
    setError(null);
    const tempId = `temp-${Date.now()}`;
    setPositions((prev) => [
      ...prev,
      {
        id: tempId,
        title,
        department_id: newDept,
        created_at: new Date().toISOString(),
      },
    ]);
    setNewTitle("");
    setNewDept("");
    const { data, error } = await supabase
      .from("positions")
      .insert({ title, department_id: newDept })
      .select()
      .single();
    if (error) {
      setPositions((prev) => prev.filter((p) => p.id !== tempId));
      setError(error.message);
      setAdding(false);
      return;
    }
    setPositions((prev) =>
      prev.map((p) => (p.id === tempId ? (data as Position) : p))
    );
    setAdding(false);
  };

  const handleDelete = async (pos: Position) => {
    const snapshot = positions;
    setPositions((prev) => prev.filter((p) => p.id !== pos.id));
    const { error } = await supabase
      .from("positions")
      .delete()
      .eq("id", pos.id);
    if (error) {
      setPositions(snapshot);
      setError(error.message);
    }
  };

  return (
    <div className="space-y-6">
      <BackButton />

      <div>
        <h1 className="text-2xl font-bold text-brand-navy">Positions</h1>
        <p className="text-sm text-slate-500">
          Job titles mapped to departments
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
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Position title..."
            className={inputClass}
          />
          <select
            value={newDept}
            onChange={(e) => setNewDept(e.target.value)}
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
            disabled={adding || !newTitle.trim() || !newDept}
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
                  onClick={() => handleDelete(pos)}
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
