"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import type { PublicHoliday } from "@/types";

interface FormState {
  name: string;
  date: string;
}

const emptyForm: FormState = {
  name: "",
  date: "",
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-brand-navy outline-none transition focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20";

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatDay = (dateStr: string) => {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { weekday: "long" });
};

const formatDayNumber = (dateStr: string) => {
  const d = new Date(dateStr + "T00:00:00");
  return d.getDate();
};

const formatMonthShort = (dateStr: string) => {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { month: "short" });
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

export default function HolidaysPage() {
  const { role } = useAuth();
  const canManage = role === "admin" || role === "hr";

  const currentYear = new Date().getFullYear();

  const [holidays, setHolidays] = useState<PublicHoliday[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [year, setYear] = useState<number>(currentYear);
  const [years] = useState<number[]>(() => {
    const base = new Date().getFullYear();
    return Array.from({ length: 8 }, (_, i) => base - 2 + i);
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<PublicHoliday | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const loadHolidays = async (selectedYear: number) => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("public_holidays")
      .select("*")
      .eq("year", selectedYear)
      .order("date", { ascending: true });
    if (err) {
      setError("Failed to load holidays. Please try again.");
      setLoading(false);
      return;
    }
    setHolidays((data as PublicHoliday[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    loadHolidays(year);
  }, [year]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const openCreate = () => {
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.date) {
      setFormError("Holiday name and date are required.");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    const holidayYear = new Date(form.date + "T00:00:00").getFullYear();
    const payload = {
      name: form.name.trim(),
      date: form.date,
      year: holidayYear,
    };
    const { data, error: err } = await supabase
      .from("public_holidays")
      .insert(payload)
      .select("*")
      .single();
    if (err) {
      setFormError(err.message);
      setSubmitting(false);
      return;
    }
    const newHoliday = data as PublicHoliday;
    setHolidays((prev) =>
      [...prev, newHoliday].sort((a, b) => a.date.localeCompare(b.date))
    );
    setSubmitting(false);
    setModalOpen(false);
    setToast({ message: `${payload.name} added successfully.`, type: "success" });
    if (holidayYear !== year) {
      setYear(holidayYear);
    }
  };

  const handleDelete = async (holiday: PublicHoliday) => {
    const snapshot = holidays;
    setDeleteTarget(null);
    setHolidays((prev) => prev.filter((h) => h.id !== holiday.id));
    const { error: err } = await supabase
      .from("public_holidays")
      .delete()
      .eq("id", holiday.id);
    if (err) {
      setHolidays(snapshot);
      setToast({ message: `Failed to delete ${holiday.name}.`, type: "error" });
      return;
    }
    setToast({ message: `${holiday.name} deleted.`, type: "success" });
  };

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
          <h1 className="text-2xl font-bold text-brand-navy">Holidays</h1>
          <p className="text-sm text-slate-500">
            Manage public holidays for your organization.
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
            Add Holiday
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

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <label
              htmlFor="year-filter"
              className="text-sm font-medium text-slate-700"
            >
              Year
            </label>
            <select
              id="year-filter"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-brand-navy outline-none transition focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <span className="text-sm text-slate-500">
            {holidays.length} holiday{holidays.length !== 1 ? "s" : ""} in {year}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-brand-orange" />
        </div>
      ) : holidays.length === 0 ? (
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
              <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
            </svg>
          </div>
          <p className="mt-3 text-sm font-medium text-slate-700">
            No holidays added yet
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {canManage
              ? "Add your first holiday to get started."
              : "Holidays for this year will appear here."}
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
              Add Holiday
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {holidays.map((holiday) => (
            <div
              key={holiday.id}
              className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-card transition hover:shadow-lg"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange">
                  <span className="text-lg font-bold leading-none">
                    {formatDayNumber(holiday.date)}
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-wide">
                    {formatMonthShort(holiday.date)}
                  </span>
                </div>
                {canManage && (
                  <button
                    onClick={() => setDeleteTarget(holiday)}
                    className="rounded-lg p-1.5 text-slate-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                    title="Delete holiday"
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
                )}
              </div>
              <h3 className="mt-4 text-base font-bold text-brand-navy">
                {holiday.name}
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                {formatDate(holiday.date)}
              </p>
              <span className="mt-3 inline-flex w-fit rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                {formatDay(holiday.date)}
              </span>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <Modal title="Add Holiday" onClose={closeModal}>
          <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
            {formError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                {formError}
              </div>
            )}
            <Field label="Holiday name" required>
              <input
                type="text"
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g. New Year's Day"
                className={inputClass}
                autoFocus
              />
            </Field>
            <Field label="Date" required>
              <input
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, date: e.target.value }))
                }
                className={inputClass}
              />
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
                {submitting ? "Saving..." : "Add Holiday"}
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
              Delete holiday?
            </h3>
            <p className="mt-2 text-center text-sm text-slate-500">
              This will permanently remove{" "}
              <span className="font-medium text-slate-700">
                {deleteTarget.name}
              </span>{" "}
              ({formatDate(deleteTarget.date)}). This action cannot be undone.
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
