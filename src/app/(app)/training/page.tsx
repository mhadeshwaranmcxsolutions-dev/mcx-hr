"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import type { Employee, TrainingCourse } from "@/types";

type TrainingStatus = TrainingCourse["status"];

interface TrainingCourseWithEmployee extends TrainingCourse {
  employees: { first_name: string; last_name: string } | null;
}

interface FormState {
  title: string;
  description: string;
  provider: string;
  duration_hours: string;
  assigned_to: string;
  status: TrainingStatus;
  completion_date: string;
  certificate_url: string;
}

const statusOptions: TrainingStatus[] = [
  "not_started",
  "in_progress",
  "completed",
];

const statusStyles: Record<TrainingStatus, string> = {
  not_started: "bg-slate-100 text-slate-600",
  in_progress: "bg-amber-50 text-amber-700",
  completed: "bg-emerald-50 text-emerald-700",
};

const statusLabels: Record<TrainingStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  completed: "Completed",
};

const emptyForm: FormState = {
  title: "",
  description: "",
  provider: "",
  duration_hours: "",
  assigned_to: "",
  status: "not_started",
  completion_date: "",
  certificate_url: "",
};

const formatDate = (iso: string | null) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const calcProgress = (course: TrainingCourseWithEmployee): number => {
  if (course.status === "completed") return 100;
  if (course.status === "not_started") return 0;
  const created = new Date(course.created_at).getTime();
  const now = Date.now();
  if (course.completion_date) {
    const completion = new Date(course.completion_date).getTime();
    const total = completion - created;
    if (total <= 0) return 50;
    const elapsed = now - created;
    return Math.min(95, Math.max(5, Math.round((elapsed / total) * 100)));
  }
  const days = Math.max(1, Math.floor((now - created) / 86400000));
  return Math.min(90, Math.max(10, days * 10));
};

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

const StatusBadge = ({ status }: { status: TrainingStatus }) => (
  <span
    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusStyles[status]}`}
  >
    {statusLabels[status]}
  </span>
);

const ProgressBar = ({ value }: { value: number }) => (
  <div className="flex items-center gap-2">
    <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
      <div
        className="h-full rounded-full bg-brand-orange transition-all"
        style={{ width: `${value}%` }}
      />
    </div>
    <span className="text-xs font-medium text-slate-500">{value}%</span>
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
  onAction,
}: {
  title: string;
  message: string;
  onAction: () => void;
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
        <path d="M22 10v6M2 10l10-5 10 5-10 5zM6 12v5c3 3 9 3 12 0v-5" />
      </svg>
    </div>
    <p className="mt-3 text-sm font-medium text-slate-700">{title}</p>
    <p className="mt-1 text-sm text-slate-500">{message}</p>
    <button
      onClick={onAction}
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
      Assign Training
    </button>
  </div>
);

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: string;
  iconBg: string;
  trend: string;
  trendNeutral?: boolean;
}

const KpiCard = ({ title, value, icon, iconBg, trend, trendNeutral }: KpiCardProps) => (
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
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
          trendNeutral ? "text-slate-500 bg-slate-100" : "text-emerald-700 bg-emerald-50"
        }`}
      >
        {trend}
      </span>
    </div>
    <p className="mt-4 text-sm font-medium text-slate-500">{title}</p>
    <p className="mt-1 text-3xl font-bold text-brand-navy">{value}</p>
  </div>
);

export default function TrainingPage() {
  const { user } = useAuth();

  const [courses, setCourses] = useState<TrainingCourseWithEmployee[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | TrainingStatus>("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [actioningId, setActioningId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<TrainingCourseWithEmployee | null>(null);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    const [coursesRes, employeesRes] = await Promise.all([
      supabase
        .from("training_courses")
        .select(
          "*, employees!training_courses_assigned_to_fkey(first_name, last_name)"
        )
        .order("created_at", { ascending: false }),
      supabase.from("employees").select("id, first_name, last_name").order("first_name"),
    ]);

    if (coursesRes.error || employeesRes.error) {
      setError("Failed to load training courses.");
      setLoading(false);
      return;
    }

    setCourses((coursesRes.data as TrainingCourseWithEmployee[]) || []);
    setEmployees((employeesRes.data as Employee[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const filteredCourses = useMemo(() => {
    if (statusFilter === "all") return courses;
    return courses.filter((c) => c.status === statusFilter);
  }, [courses, statusFilter]);

  const kpis = useMemo(() => {
    const total = courses.length;
    const inProgress = courses.filter((c) => c.status === "in_progress").length;
    const completed = courses.filter((c) => c.status === "completed").length;
    const withHours = courses.filter((c) => c.duration_hours != null);
    const avgHours =
      withHours.length > 0
        ? withHours.reduce((sum, c) => sum + Number(c.duration_hours), 0) /
          withHours.length
        : 0;
    return { total, inProgress, completed, avgHours };
  }, [courses]);

  const openModal = () => {
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setModalOpen(false);
  };

  const updateField = <K extends keyof FormState>(
    key: K,
    value: FormState[K]
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setFormError("Title is required.");
      return;
    }
    if (!form.assigned_to) {
      setFormError("Please select an employee to assign.");
      return;
    }
    if (form.duration_hours && Number(form.duration_hours) < 0) {
      setFormError("Duration hours cannot be negative.");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      provider: form.provider.trim() || null,
      duration_hours: form.duration_hours ? Number(form.duration_hours) : null,
      assigned_to: form.assigned_to,
      status: form.status,
      completion_date: form.completion_date || null,
      certificate_url: form.certificate_url.trim() || null,
    };

    const { data, error: err } = await supabase
      .from("training_courses")
      .insert(payload)
      .select("*, employees!training_courses_assigned_to_fkey(first_name, last_name)")
      .single();

    if (err) {
      setFormError(err.message);
      setSubmitting(false);
      return;
    }

    setCourses((prev) => [data as TrainingCourseWithEmployee, ...prev]);
    setSubmitting(false);
    setModalOpen(false);
  };

  const updateStatus = async (
    course: TrainingCourseWithEmployee,
    status: TrainingStatus
  ) => {
    setActioningId(course.id);
    setActionError(null);

    const payload: Partial<TrainingCourse> = { status };
    if (status === "completed" && !course.completion_date) {
      payload.completion_date = new Date().toISOString().slice(0, 10);
    }

    const { error: err } = await supabase
      .from("training_courses")
      .update(payload)
      .eq("id", course.id);

    if (err) {
      setActionError(err.message);
      setActioningId(null);
      return;
    }

    setCourses((prev) =>
      prev.map((c) =>
        c.id === course.id
          ? {
              ...c,
              status,
              completion_date: payload.completion_date ?? c.completion_date,
            }
          : c
      )
    );
    setActioningId(null);
  };

  const confirmDelete = async (course: TrainingCourseWithEmployee) => {
    const snapshot = courses;
    setDeleteTarget(null);
    setCourses((prev) => prev.filter((c) => c.id !== course.id));
    const { error: err } = await supabase
      .from("training_courses")
      .delete()
      .eq("id", course.id);
    if (err) {
      setCourses(snapshot);
      setActionError(`Failed to delete "${course.title}".`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">Training</h1>
          <p className="text-sm text-slate-500">
            Assign and track employee training courses.
          </p>
        </div>
        <button
          onClick={openModal}
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
          Assign Training
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Total Courses"
          value={kpis.total}
          icon="M22 10v6M2 10l10-5 10 5-10 5zM6 12v5c3 3 9 3 12 0v-5"
          iconBg="bg-brand-orange"
          trend={`${kpis.completed} completed`}
          trendNeutral
        />
        <KpiCard
          title="In Progress"
          value={kpis.inProgress}
          icon="M12 6v6l4 2M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z"
          iconBg="bg-amber-500"
          trend={`${kpis.total > 0 ? Math.round((kpis.inProgress / kpis.total) * 100) : 0}% of total`}
          trendNeutral
        />
        <KpiCard
          title="Completed"
          value={kpis.completed}
          icon="M9 12l2 2 4-4M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z"
          iconBg="bg-emerald-500"
          trend={`${kpis.total > 0 ? Math.round((kpis.completed / kpis.total) * 100) : 0}% completion`}
          trendNeutral
        />
        <KpiCard
          title="Avg Hours"
          value={kpis.avgHours.toFixed(1)}
          icon="M12 6v6l4 2M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z"
          iconBg="bg-brand-navy"
          trend="per course"
          trendNeutral
        />
      </div>

      {actionError && (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{actionError}</span>
          <button
            onClick={() => setActionError(null)}
            className="text-red-500 hover:text-red-700"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="rounded-2xl bg-white p-4 shadow-card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-brand-navy">Course Assignments</h2>
            <p className="text-sm text-slate-500">
              Review and manage all training courses.
            </p>
          </div>
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as "all" | TrainingStatus)
            }
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-brand-navy outline-none transition focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
          >
            <option value="all">All statuses</option>
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {statusLabels[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-card">
        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : filteredCourses.length === 0 ? (
          <EmptyState
            title={courses.length === 0 ? "No training courses yet" : "No courses match this filter"}
            message={
              courses.length === 0
                ? "Assign your first training course to get started."
                : "Try selecting a different status filter."
            }
            onAction={openModal}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-4 font-semibold">Course</th>
                  <th className="px-5 py-4 font-semibold">Provider</th>
                  <th className="px-5 py-4 font-semibold">Employee</th>
                  <th className="px-5 py-4 font-semibold">Duration</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 font-semibold">Progress</th>
                  <th className="px-5 py-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCourses.map((course) => {
                  const name = `${course.employees?.first_name ?? ""} ${
                    course.employees?.last_name ?? ""
                  }`.trim();
                  const initials = `${course.employees?.first_name?.[0] ?? ""}${
                    course.employees?.last_name?.[0] ?? ""
                  }`.toUpperCase();
                  const isActioning = actioningId === course.id;
                  const progress = calcProgress(course);
                  return (
                    <tr
                      key={course.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-brand-navy">
                          {course.title}
                        </div>
                        {course.description && (
                          <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                            {course.description}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        {course.provider || "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-orange/10 text-xs font-bold text-brand-orange">
                            {initials || "?"}
                          </div>
                          <span className="font-medium text-brand-navy">
                            {name || "Unknown"}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        {course.duration_hours != null
                          ? `${course.duration_hours}h`
                          : "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={course.status} />
                        {course.completion_date && (
                          <p className="mt-1 text-xs text-slate-400">
                            {formatDate(course.completion_date)}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {course.status === "in_progress" ? (
                          <ProgressBar value={progress} />
                        ) : (
                          <span className="text-xs text-slate-400">
                            {course.status === "completed"
                              ? "100%"
                              : "0%"}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          {course.status === "not_started" && (
                            <button
                              onClick={() =>
                                updateStatus(course, "in_progress")
                              }
                              disabled={isActioning}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {isActioning ? "..." : "Start"}
                            </button>
                          )}
                          {course.status === "in_progress" && (
                            <button
                              onClick={() =>
                                updateStatus(course, "completed")
                              }
                              disabled={isActioning}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
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
                                <path d="M20 6 9 17l-5-5" />
                              </svg>
                              {isActioning ? "..." : "Complete"}
                            </button>
                          )}
                          {course.certificate_url && (
                            <a
                              href={course.certificate_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-brand-navy"
                              title="View certificate"
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
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8" />
                              </svg>
                            </a>
                          )}
                          <button
                            onClick={() => setDeleteTarget(course)}
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
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-card">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-bold text-brand-navy">Assign Training</h2>
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
              <Field label="Course title" required>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  placeholder="e.g. Occupational Safety Training"
                  className={inputClass}
                />
              </Field>
              <Field label="Description">
                <textarea
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  rows={3}
                  placeholder="Brief description of the training..."
                  className={`${inputClass} resize-none`}
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Provider">
                  <input
                    type="text"
                    value={form.provider}
                    onChange={(e) => updateField("provider", e.target.value)}
                    placeholder="e.g. AWS"
                    className={inputClass}
                  />
                </Field>
                <Field label="Duration (hours)">
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={form.duration_hours}
                    onChange={(e) =>
                      updateField("duration_hours", e.target.value)
                    }
                    placeholder="8"
                    className={inputClass}
                  />
                </Field>
              </div>
              <Field label="Assign to" required>
                <select
                  value={form.assigned_to}
                  onChange={(e) =>
                    updateField("assigned_to", e.target.value)
                  }
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
              <div className="grid grid-cols-2 gap-4">
                <Field label="Status">
                  <select
                    value={form.status}
                    onChange={(e) =>
                      updateField("status", e.target.value as TrainingStatus)
                    }
                    className={inputClass}
                  >
                    {statusOptions.map((s) => (
                      <option key={s} value={s}>
                        {statusLabels[s]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Completion date">
                  <input
                    type="date"
                    value={form.completion_date}
                    onChange={(e) =>
                      updateField("completion_date", e.target.value)
                    }
                    className={inputClass}
                  />
                </Field>
              </div>
              <Field label="Certificate URL">
                <input
                  type="url"
                  value={form.certificate_url}
                  onChange={(e) =>
                    updateField("certificate_url", e.target.value)
                  }
                  placeholder="https://..."
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
                  {submitting ? "Assigning..." : "Assign Training"}
                </button>
              </div>
            </form>
          </div>
        </div>
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
              Delete training course?
            </h3>
            <p className="mt-2 text-center text-sm text-slate-500">
              This will permanently remove{" "}
              <span className="font-medium text-slate-700">
                {deleteTarget.title}
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
                onClick={() => confirmDelete(deleteTarget)}
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
