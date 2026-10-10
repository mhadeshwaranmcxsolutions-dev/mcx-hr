"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import type { Employee, PerformanceReview } from "@/types";

interface ReviewWithEmployee extends PerformanceReview {
  employees: { first_name: string; last_name: string } | null;
}

type ReviewStatus = PerformanceReview["status"];

interface FormState {
  employee_id: string;
  period: string;
  rating: number;
  self_review: string;
  manager_review: string;
  status: ReviewStatus;
  goals: string;
}

const emptyForm: FormState = {
  employee_id: "",
  period: "",
  rating: 3,
  self_review: "",
  manager_review: "",
  status: "pending",
  goals: "",
};

const statusOptions: ReviewStatus[] = ["pending", "submitted", "completed"];

const statusStyles: Record<ReviewStatus, string> = {
  pending: "bg-amber-50 text-amber-700",
  submitted: "bg-blue-50 text-blue-700",
  completed: "bg-emerald-50 text-emerald-700",
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const StatusBadge = ({ status }: { status: ReviewStatus }) => (
  <span
    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusStyles[status]}`}
  >
    {status}
  </span>
);

const StarRating = ({ rating }: { rating: number }) => {
  const r = Math.max(0, Math.min(5, Number(rating) || 0));
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg
          key={s}
          viewBox="0 0 24 24"
          className={`h-4 w-4 ${
            s <= r ? "text-amber-400" : "text-slate-200"
          }`}
          fill="currentColor"
        >
          <path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z" />
        </svg>
      ))}
      <span className="ml-1 text-sm font-medium text-slate-600">
        {r.toFixed(1)}
      </span>
    </div>
  );
};

const StatCard = ({
  label,
  value,
  iconBg,
  icon,
}: {
  label: string;
  value: string | number;
  iconBg: string;
  icon: string;
}) => (
  <div className="rounded-2xl bg-white p-5 shadow-card">
    <div className="flex items-center gap-3">
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
      <div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-brand-navy">{value}</p>
      </div>
    </div>
  </div>
);

const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-20">
    <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-brand-orange" />
  </div>
);

const EmptyState = ({
  title,
  message,
}: {
  title: string;
  message: string;
}) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
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
        <path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    </div>
    <p className="mt-3 text-sm font-medium text-slate-700">{title}</p>
    <p className="mt-1 text-sm text-slate-500">{message}</p>
  </div>
);

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-brand-navy outline-none transition focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20";

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

const goalsToArray = (goalsText: string): string[] =>
  goalsText
    .split("\n")
    .map((g) => g.trim())
    .filter((g) => g.length > 0);

const goalsToText = (goals: unknown): string => {
  if (Array.isArray(goals)) {
    return goals
      .map((g) => (typeof g === "string" ? g : JSON.stringify(g)))
      .join("\n");
  }
  if (goals == null) return "";
  return String(goals);
};

export default function PerformancePage() {
  const { user } = useAuth();

  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [reviews, setReviews] = useState<ReviewWithEmployee[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [detailReview, setDetailReview] = useState<ReviewWithEmployee | null>(
    null
  );

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    const [empRes, allEmpRes, reviewsRes] = await Promise.all([
      supabase
        .from("employees")
        .select("*")
        .eq("email", user.email)
        .maybeSingle(),
      supabase
        .from("employees")
        .select("*")
        .eq("status", "active")
        .order("first_name"),
      supabase
        .from("performance_reviews")
        .select(
          "*, employees!performance_reviews_employee_id_fkey(first_name, last_name)"
        )
        .order("created_at", { ascending: false }),
    ]);

    if (empRes.error) {
      setError("Failed to load your employee record.");
      setLoading(false);
      return;
    }

    if (allEmpRes.error || reviewsRes.error) {
      setError("Failed to load performance reviews.");
      setLoading(false);
      return;
    }

    setCurrentEmployee((empRes.data as Employee | null) || null);
    setEmployees((allEmpRes.data as Employee[]) || []);
    setReviews((reviewsRes.data as ReviewWithEmployee[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const kpis = useMemo(() => {
    const total = reviews.length;
    const completed = reviews.filter((r) => r.status === "completed").length;
    const pending = reviews.filter((r) => r.status === "pending").length;
    const rated = reviews.filter((r) => Number(r.rating) > 0);
    const avg =
      rated.length > 0
        ? rated.reduce((sum, r) => sum + Number(r.rating), 0) / rated.length
        : 0;
    return { total, completed, pending, avg };
  }, [reviews]);

  const openCreateModal = () => {
    setForm({ ...emptyForm, employee_id: employees[0]?.id ?? "" });
    setFormError(null);
    setEditingId(null);
    setModalOpen(true);
  };

  const openEditModal = (review: ReviewWithEmployee) => {
    setForm({
      employee_id: review.employee_id,
      period: review.period,
      rating: Number(review.rating) || 0,
      self_review: review.self_review ?? "",
      manager_review: review.manager_review ?? "",
      status: review.status,
      goals: goalsToText(review.goals),
    });
    setFormError(null);
    setEditingId(review.id);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setModalOpen(false);
    setEditingId(null);
  };

  const updateField = <K extends keyof FormState>(
    key: K,
    value: FormState[K]
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.employee_id) {
      setFormError("Please select an employee.");
      return;
    }
    if (!form.period.trim()) {
      setFormError("Period is required.");
      return;
    }
    if (form.rating < 1 || form.rating > 5) {
      setFormError("Rating must be between 1 and 5.");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    const payload = {
      employee_id: form.employee_id,
      reviewer_id: currentEmployee?.id ?? null,
      period: form.period.trim(),
      rating: form.rating,
      self_review: form.self_review.trim() || null,
      manager_review: form.manager_review.trim() || null,
      status: form.status,
      goals: goalsToArray(form.goals),
    };

    if (editingId) {
      const { error: err } = await supabase
        .from("performance_reviews")
        .update(payload)
        .eq("id", editingId);

      if (err) {
        setFormError(err.message);
        setSubmitting(false);
        return;
      }
    } else {
      const { error: err } = await supabase
        .from("performance_reviews")
        .insert(payload);

      if (err) {
        setFormError(err.message);
        setSubmitting(false);
        return;
      }
    }

    setSubmitting(false);
    setModalOpen(false);
    setEditingId(null);
    loadData();
  };

  const handleDelete = async (review: ReviewWithEmployee) => {
    setDeletingId(review.id);
    setDeleteError(null);

    const { error: err } = await supabase
      .from("performance_reviews")
      .delete()
      .eq("id", review.id);

    if (err) {
      setDeleteError(err.message);
      setDeletingId(null);
      return;
    }

    setReviews((prev) => prev.filter((r) => r.id !== review.id));
    setDeletingId(null);
  };

  const employeeName = (r: ReviewWithEmployee) =>
    `${r.employees?.first_name ?? ""} ${r.employees?.last_name ?? ""}`.trim() ||
    "Unknown";

  const detailGoals = Array.isArray(detailReview?.goals)
    ? (detailReview!.goals as unknown[])
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">
            Performance Reviews
          </h1>
          <p className="text-sm text-slate-500">
            Manage employee performance reviews, ratings, and goals.
          </p>
        </div>
        <button
          onClick={openCreateModal}
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
          New Review
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Reviews"
          value={kpis.total}
          iconBg="bg-brand-orange"
          icon="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"
        />
        <StatCard
          label="Completed"
          value={kpis.completed}
          iconBg="bg-emerald-500"
          icon="M20 6 9 17l-5-5"
        />
        <StatCard
          label="Pending"
          value={kpis.pending}
          iconBg="bg-amber-500"
          icon="M12 8v4l3 3M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z"
        />
        <StatCard
          label="Avg Rating"
          value={kpis.avg.toFixed(1)}
          iconBg="bg-brand-navy"
          icon="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z"
        />
      </div>

      {deleteError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {deleteError}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl bg-white shadow-card">
        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : reviews.length === 0 ? (
          <EmptyState
            title="No performance reviews"
            message="Create your first performance review to get started."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-4 font-semibold">Employee</th>
                  <th className="px-5 py-4 font-semibold">Period</th>
                  <th className="px-5 py-4 font-semibold">Rating</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 text-right font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reviews.map((review) => {
                  const initials = `${review.employees?.first_name?.[0] ?? ""}${
                    review.employees?.last_name?.[0] ?? ""
                  }`.toUpperCase();
                  const isDeleting = deletingId === review.id;
                  return (
                    <tr
                      key={review.id}
                      onClick={() => setDetailReview(review)}
                      className="cursor-pointer transition hover:bg-slate-50"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-orange/10 text-xs font-bold text-brand-orange">
                            {initials || "?"}
                          </div>
                          <span className="font-medium text-brand-navy">
                            {employeeName(review)}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        {review.period}
                      </td>
                      <td className="px-5 py-3.5">
                        <StarRating rating={Number(review.rating) || 0} />
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={review.status} />
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(review);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              className="h-3.5 w-3.5"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                            </svg>
                            Edit
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(review);
                            }}
                            disabled={isDeleting}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              className="h-3.5 w-3.5"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
                            </svg>
                            {isDeleting ? "..." : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-navy/40 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-card">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-bold text-brand-navy">
                {editingId ? "Edit Review" : "New Review"}
              </h2>
              <button
                onClick={closeModal}
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
            <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
              {formError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                  {formError}
                </div>
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Employee" required>
                  <select
                    value={form.employee_id}
                    onChange={(e) => updateField("employee_id", e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select employee</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Period" required>
                  <input
                    type="text"
                    value={form.period}
                    onChange={(e) => updateField("period", e.target.value)}
                    placeholder="e.g. Q4 2026"
                    className={inputClass}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Rating (1-5)" required>
                  <select
                    value={form.rating}
                    onChange={(e) =>
                      updateField("rating", Number(e.target.value))
                    }
                    className={inputClass}
                  >
                    {[1, 2, 3, 4, 5].map((r) => (
                      <option key={r} value={r}>
                        {r} - {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][r]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Status" required>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      updateField("status", e.target.value as ReviewStatus)
                    }
                    className={inputClass}
                  >
                    {statusOptions.map((s) => (
                      <option key={s} value={s} className="capitalize">
                        {s}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Self Review">
                <textarea
                  value={form.self_review}
                  onChange={(e) => updateField("self_review", e.target.value)}
                  rows={3}
                  placeholder="Employee's self-assessment..."
                  className={`${inputClass} resize-none`}
                />
              </Field>
              <Field label="Manager Review">
                <textarea
                  value={form.manager_review}
                  onChange={(e) => updateField("manager_review", e.target.value)}
                  rows={3}
                  placeholder="Manager's assessment and feedback..."
                  className={`${inputClass} resize-none`}
                />
              </Field>
              <Field label="Goals (one per line)">
                <textarea
                  value={form.goals}
                  onChange={(e) => updateField("goals", e.target.value)}
                  rows={3}
                  placeholder="e.g.&#10;Complete leadership training&#10;Improve team NPS"
                  className={`${inputClass} resize-none`}
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
                  {submitting
                    ? "Saving..."
                    : editingId
                      ? "Save Changes"
                      : "Create Review"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {detailReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-navy/40 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-card">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-brand-navy">
                  {employeeName(detailReview)}
                </h2>
                <p className="text-sm text-slate-500">
                  {detailReview.period} ·{" "}
                  {formatDate(detailReview.created_at)}
                </p>
              </div>
              <button
                onClick={() => setDetailReview(null)}
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
            <div className="space-y-5 px-6 py-5">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Rating
                  </p>
                  <div className="mt-1">
                    <StarRating rating={Number(detailReview.rating) || 0} />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Status
                  </p>
                  <div className="mt-1.5">
                    <StatusBadge status={detailReview.status} />
                  </div>
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-sm font-semibold text-slate-700">
                  Self Review
                </p>
                <p className="whitespace-pre-wrap rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  {detailReview.self_review || "—"}
                </p>
              </div>

              <div>
                <p className="mb-1.5 text-sm font-semibold text-slate-700">
                  Manager Review
                </p>
                <p className="whitespace-pre-wrap rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  {detailReview.manager_review || "—"}
                </p>
              </div>

              <div>
                <p className="mb-1.5 text-sm font-semibold text-slate-700">
                  Goals
                </p>
                {detailGoals.length === 0 ? (
                  <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-400">
                    No goals set.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {detailGoals.map((g, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 rounded-xl bg-slate-50 px-4 py-2.5 text-sm text-slate-600"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <circle cx="12" cy="12" r="6" />
                          <circle cx="12" cy="12" r="2" />
                        </svg>
                        <span>
                          {typeof g === "string" ? g : JSON.stringify(g)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex justify-end border-t border-slate-100 pt-4">
                <button
                  onClick={() => setDetailReview(null)}
                  className="rounded-xl bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-navyDeep"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
