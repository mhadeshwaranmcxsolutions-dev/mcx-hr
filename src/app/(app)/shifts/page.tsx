"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import type { Shift, Employee } from "@/types";

const DAY_OPTIONS = [
  { value: "monday", label: "Mon" },
  { value: "tuesday", label: "Tue" },
  { value: "wednesday", label: "Wed" },
  { value: "thursday", label: "Thu" },
  { value: "friday", label: "Fri" },
] as const;

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-brand-navy outline-none transition focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20";

const formatTime = (time: string) => {
  const parts = time.split(":");
  const hour = parseInt(parts[0] ?? "0", 10);
  const minute = parseInt(parts[1] ?? "0", 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minute.toString().padStart(2, "0")} ${ampm}`;
};

const toTimeInputValue = (time: string) => time.slice(0, 5);

const dayLabel = (day: string) =>
  DAY_OPTIONS.find((d) => d.value === day)?.label ?? day.slice(0, 3);

interface ShiftRow extends Shift {
  employees?: { first_name: string; last_name: string } | null;
}

interface FormState {
  name: string;
  start_time: string;
  end_time: string;
  days: string[];
  assigned_to: string;
}

const emptyForm: FormState = {
  name: "",
  start_time: "09:00",
  end_time: "17:00",
  days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
  assigned_to: "",
};

const Field = ({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) => (
  <label className="block">
    <span className="mb-1.5 block text-sm font-medium text-slate-700">
      {label}
      {required && <span className="text-brand-orange"> *</span>}
    </span>
    {children}
  </label>
);

const Modal = ({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-navy/40 p-4 backdrop-blur-sm">
    <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-card">
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <h2 className="text-lg font-bold text-brand-navy">{title}</h2>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      {children}
    </div>
  </div>
);

const KpiCard = ({
  title,
  value,
  icon,
  iconBg,
}: {
  title: string;
  value: string | number;
  icon: string;
  iconBg: string;
}) => (
  <div className="rounded-2xl bg-white p-5 shadow-card">
    <div className="flex items-start justify-between">
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconBg}`}
      >
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6 text-white"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={icon} />
        </svg>
      </div>
    </div>
    <p className="mt-4 text-sm font-medium text-slate-500">{title}</p>
    <p className="mt-1 text-3xl font-bold text-brand-navy">{value}</p>
  </div>
);

export default function ShiftsPage() {
  const { role } = useAuth();
  const canManage = role === "admin" || role === "hr";

  const [shifts, setShifts] = useState<ShiftRow[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ShiftRow | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<ShiftRow | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    const [shiftRes, empRes] = await Promise.all([
      supabase
        .from("shifts")
        .select("*, employees!shifts_assigned_to_fkey(first_name, last_name)")
        .order("created_at", { ascending: false }),
      supabase
        .from("employees")
        .select("id, first_name, last_name, status")
        .order("first_name"),
    ]);
    if (shiftRes.error || empRes.error) {
      setError("Failed to load shifts. Please try again.");
      setLoading(false);
      return;
    }
    setShifts((shiftRes.data as ShiftRow[]) || []);
    setEmployees((empRes.data as Employee[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const stats = useMemo(() => {
    const total = shifts.length;
    const assigned = shifts.filter((s) => s.assigned_to).length;
    const unassigned = total - assigned;

    const assignedIds = new Set(
      shifts.map((s) => s.assigned_to).filter((id): id is string => !!id)
    );
    const activeOnShift = employees.filter(
      (e) => assignedIds.has(e.id) && e.status === "active"
    ).length;

    return { total, assigned, unassigned, activeOnShift };
  }, [shifts, employees]);

  const toggleDay = (day: string) => {
    setForm((prev) => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter((d) => d !== day)
        : [...prev.days, day],
    }));
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (shift: ShiftRow) => {
    setEditing(shift);
    setForm({
      name: shift.name,
      start_time: toTimeInputValue(shift.start_time),
      end_time: toTimeInputValue(shift.end_time),
      days: [...shift.days],
      assigned_to: shift.assigned_to ?? "",
    });
    setFormError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setModalOpen(false);
    setEditing(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.start_time || !form.end_time) {
      setFormError("Shift name, start time and end time are required.");
      return;
    }
    if (form.days.length === 0) {
      setFormError("Please select at least one day.");
      return;
    }
    setSubmitting(true);
    setFormError(null);

    const payload = {
      name: form.name.trim(),
      start_time: form.start_time,
      end_time: form.end_time,
      days: form.days,
      assigned_to: form.assigned_to || null,
    };

    if (editing) {
      const { data, error: err } = await supabase
        .from("shifts")
        .update(payload)
        .eq("id", editing.id)
        .select("*, employees!shifts_assigned_to_fkey(first_name, last_name)")
        .single();
      if (err) {
        setFormError(err.message);
        setSubmitting(false);
        return;
      }
      setShifts((prev) =>
        prev.map((s) => (s.id === editing.id ? (data as ShiftRow) : s))
      );
      setToast({ message: `${payload.name} updated.`, type: "success" });
    } else {
      const { data, error: err } = await supabase
        .from("shifts")
        .insert(payload)
        .select("*, employees!shifts_assigned_to_fkey(first_name, last_name)")
        .single();
      if (err) {
        setFormError(err.message);
        setSubmitting(false);
        return;
      }
      setShifts((prev) => [data as ShiftRow, ...prev]);
      setToast({ message: `${payload.name} added.`, type: "success" });
    }

    setSubmitting(false);
    setModalOpen(false);
    setEditing(null);
  };

  const handleDelete = async (shift: ShiftRow) => {
    const snapshot = shifts;
    setDeleteTarget(null);
    setShifts((prev) => prev.filter((s) => s.id !== shift.id));
    const { error: err } = await supabase
      .from("shifts")
      .delete()
      .eq("id", shift.id);
    if (err) {
      setShifts(snapshot);
      setToast({ message: `Failed to delete ${shift.name}.`, type: "error" });
      return;
    }
    setToast({ message: `${shift.name} deleted.`, type: "success" });
  };

  const assigneeName = (shift: ShiftRow) =>
    shift.employees
      ? `${shift.employees.first_name} ${shift.employees.last_name}`
      : null;

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed right-4 top-4 z-[60]">
          <div
            className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium shadow-card ${
              toast.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4 shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {toast.type === "success" ? (
                <path d="M20 6 9 17l-5-5" />
              ) : (
                <path d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
              )}
            </svg>
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">Shifts</h1>
          <p className="text-sm text-slate-500">
            Manage work shifts and employee assignments.
          </p>
        </div>
        {canManage && (
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-orange px-4 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:bg-brand-orangeDark"
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
            Add Shift
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-500 transition hover:text-red-700"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Total Shifts"
          value={stats.total}
          icon="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM12 6v6l4 2"
          iconBg="bg-brand-orange"
        />
        <KpiCard
          title="Assigned"
          value={stats.assigned}
          icon="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"
          iconBg="bg-emerald-500"
        />
        <KpiCard
          title="Unassigned"
          value={stats.unassigned}
          icon="M12 6v6l4 2M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z"
          iconBg="bg-slate-400"
        />
        <KpiCard
          title="Active on Shift"
          value={stats.activeOnShift}
          icon="M9 12l2 2 4-4M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z"
          iconBg="bg-brand-navy"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-brand-orange" />
        </div>
      ) : shifts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-20 text-center">
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
              <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM12 6v6l4 2" />
            </svg>
          </div>
          <p className="mt-3 text-sm font-medium text-slate-700">
            No shifts added yet
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {canManage
              ? "Add your first shift to get started."
              : "Shifts will appear here once created."}
          </p>
          {canManage && (
            <button
              onClick={openCreate}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-orange px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-orangeDark"
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
              Add Shift
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {shifts.map((shift) => {
            const name = assigneeName(shift);
            const initials = name
              ? `${name.split(" ")[0]?.[0] ?? ""}${
                  name.split(" ")[1]?.[0] ?? ""
                }`.toUpperCase()
              : "";
            return (
              <div
                key={shift.id}
                className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-card transition hover:shadow-lg"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-base font-bold text-brand-navy">
                      {shift.name}
                    </h3>
                    <p className="mt-1 text-sm font-medium text-brand-orange">
                      {formatTime(shift.start_time)} –{" "}
                      {formatTime(shift.end_time)}
                    </p>
                  </div>
                  {canManage && (
                    <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100">
                      <button
                        onClick={() => openEdit(shift)}
                        className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-brand-navy"
                        title="Edit shift"
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
                        onClick={() => setDeleteTarget(shift)}
                        className="rounded-lg p-1.5 text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                        title="Delete shift"
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
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {DAY_OPTIONS.map((d) => {
                    const active = shift.days.includes(d.value);
                    return (
                      <span
                        key={d.value}
                        className={`inline-flex h-7 w-9 items-center justify-center rounded-md text-xs font-semibold ${
                          active
                            ? "bg-brand-orange text-white"
                            : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        {d.label}
                      </span>
                    );
                  })}
                </div>

                <div className="mt-4 border-t border-slate-100 pt-3">
                  {name ? (
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-orange/10 text-[11px] font-bold text-brand-orange">
                        {initials}
                      </div>
                      <span className="truncate text-sm font-medium text-slate-700">
                        {name}
                      </span>
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-sm text-slate-400">
                      <svg
                        viewBox="0 0 24 24"
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />
                      </svg>
                      Unassigned
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <Modal
          title={editing ? "Edit Shift" : "Add Shift"}
          onClose={closeModal}
        >
          <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
            {formError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                {formError}
              </div>
            )}

            <Field label="Shift name" required>
              <input
                type="text"
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g. Morning Shift"
                className={inputClass}
                autoFocus
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Start time" required>
                <input
                  type="time"
                  value={form.start_time}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, start_time: e.target.value }))
                  }
                  className={inputClass}
                />
              </Field>
              <Field label="End time" required>
                <input
                  type="time"
                  value={form.end_time}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, end_time: e.target.value }))
                  }
                  className={inputClass}
                />
              </Field>
            </div>

            <Field label="Days" required>
              <div className="flex flex-wrap gap-2">
                {DAY_OPTIONS.map((d) => {
                  const checked = form.days.includes(d.value);
                  return (
                    <label
                      key={d.value}
                      className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-medium transition ${
                        checked
                          ? "border-brand-orange bg-brand-orange/10 text-brand-navy"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleDay(d.value)}
                        className="h-4 w-4 rounded border-slate-300 text-brand-orange focus:ring-brand-orange"
                      />
                      {d.label}
                    </label>
                  );
                })}
              </div>
            </Field>

            <Field label="Assign to employee (optional)">
              <select
                value={form.assigned_to}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, assigned_to: e.target.value }))
                }
                className={inputClass}
              >
                <option value="">Unassigned</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name}
                  </option>
                ))}
              </select>
            </Field>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-brand-orange px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:bg-brand-orangeDark disabled:opacity-60"
              >
                {submitting
                  ? "Saving..."
                  : editing
                    ? "Save changes"
                    : "Add Shift"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-navy/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-card">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
              <svg
                viewBox="0 0 24 24"
                className="h-6 w-6 text-red-600"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
              </svg>
            </div>
            <h3 className="mt-4 text-center text-lg font-bold text-brand-navy">
              Delete shift?
            </h3>
            <p className="mt-2 text-center text-sm text-slate-500">
              This will permanently remove{" "}
              <span className="font-medium text-slate-700">
                {deleteTarget.name}
              </span>
              . This action cannot be undone.
            </p>
            <div className="mt-6 flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteTarget)}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
