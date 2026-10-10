"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import type { Employee, OnboardingTask } from "@/types";

type TaskStatus = OnboardingTask["status"];

interface OnboardingTaskWithEmployee extends OnboardingTask {
  employees: { first_name: string; last_name: string } | null;
}

interface FormState {
  employee_id: string;
  title: string;
  description: string;
  status: TaskStatus;
  due_date: string;
  assigned_to: string;
}

interface EmployeeGroup {
  employeeId: string;
  firstName: string;
  lastName: string;
  tasks: OnboardingTaskWithEmployee[];
  total: number;
  completed: number;
}

const statusOptions: TaskStatus[] = ["pending", "in_progress", "completed"];

const statusStyles: Record<TaskStatus, string> = {
  pending: "bg-amber-50 text-amber-700",
  in_progress: "bg-blue-50 text-blue-700",
  completed: "bg-emerald-50 text-emerald-700",
};

const statusLabels: Record<TaskStatus, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
};

const emptyForm: FormState = {
  employee_id: "",
  title: "",
  description: "",
  status: "pending",
  due_date: "",
  assigned_to: "",
};

const formatDate = (iso: string | null) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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

const StatusBadge = ({ status }: { status: TaskStatus }) => (
  <span
    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusStyles[status]}`}
  >
    {statusLabels[status]}
  </span>
);

const KpiCard = ({
  title,
  value,
  icon,
  iconBg,
  trend,
}: {
  title: string;
  value: number;
  icon: string;
  iconBg: string;
  trend: string;
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
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
        {trend}
      </span>
    </div>
    <p className="mt-4 text-sm font-medium text-slate-500">{title}</p>
    <p className="mt-1 text-3xl font-bold text-brand-navy">{value}</p>
  </div>
);

const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-20">
    <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-brand-orange" />
  </div>
);

const EmployeeProgress = ({
  completed,
  total,
}: {
  completed: number;
  total: number;
}) => {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-brand-orange transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-medium text-slate-500">
        {completed}/{total} ({pct}%)
      </span>
    </div>
  );
};

const initials = (first: string, last: string) =>
  `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();

export default function OnboardingPage() {
  const { user } = useAuth();

  const [tasks, setTasks] = useState<OnboardingTaskWithEmployee[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [actioningId, setActioningId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    const [tasksRes, employeesRes] = await Promise.all([
      supabase
        .from("onboarding_tasks")
        .select(
          "*, employees!onboarding_tasks_employee_id_fkey(first_name, last_name)"
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("employees")
        .select("id, first_name, last_name")
        .order("first_name"),
    ]);

    if (tasksRes.error || employeesRes.error) {
      setError("Failed to load onboarding tasks.");
      setLoading(false);
      return;
    }

    setTasks((tasksRes.data as OnboardingTaskWithEmployee[]) || []);
    setEmployees((employeesRes.data as Employee[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const kpis = useMemo(() => {
    const total = tasks.length;
    const pending = tasks.filter((t) => t.status === "pending").length;
    const inProgress = tasks.filter((t) => t.status === "in_progress").length;
    const completed = tasks.filter((t) => t.status === "completed").length;
    return { total, pending, inProgress, completed };
  }, [tasks]);

  const grouped = useMemo<EmployeeGroup[]>(() => {
    const map = new Map<string, EmployeeGroup>();
    for (const task of tasks) {
      const emp = task.employees;
      const firstName = emp?.first_name ?? "Unknown";
      const lastName = emp?.last_name ?? "Employee";
      let group = map.get(task.employee_id);
      if (!group) {
        group = {
          employeeId: task.employee_id,
          firstName,
          lastName,
          tasks: [],
          total: 0,
          completed: 0,
        };
        map.set(task.employee_id, group);
      }
      group.tasks.push(task);
      group.total += 1;
      if (task.status === "completed") group.completed += 1;
    }
    return Array.from(map.values()).sort((a, b) =>
      `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
    );
  }, [tasks]);

  const assigneeName = (id: string | null) => {
    if (!id) return null;
    const emp = employees.find((e) => e.id === id);
    return emp ? `${emp.first_name} ${emp.last_name}` : null;
  };

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
    if (!form.employee_id) {
      setFormError("Please select an employee.");
      return;
    }
    if (!form.title.trim()) {
      setFormError("Title is required.");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    const payload = {
      employee_id: form.employee_id,
      title: form.title.trim(),
      description: form.description.trim() || null,
      status: form.status,
      due_date: form.due_date || null,
      assigned_to: form.assigned_to || null,
    };

    const { data, error: err } = await supabase
      .from("onboarding_tasks")
      .insert(payload)
      .select(
        "*, employees!onboarding_tasks_employee_id_fkey(first_name, last_name)"
      )
      .single();

    if (err) {
      setFormError(err.message);
      setSubmitting(false);
      return;
    }

    setTasks((prev) => [data as OnboardingTaskWithEmployee, ...prev]);
    setSubmitting(false);
    setModalOpen(false);
  };

  const updateStatus = async (
    task: OnboardingTaskWithEmployee,
    status: TaskStatus
  ) => {
    setActioningId(task.id);
    setActionError(null);

    const { error: err } = await supabase
      .from("onboarding_tasks")
      .update({ status })
      .eq("id", task.id);

    if (err) {
      setActionError(err.message);
      setActioningId(null);
      return;
    }

    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status } : t))
    );
    setActioningId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">Onboarding</h1>
          <p className="text-sm text-slate-500">
            Manage and track employee onboarding tasks.
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
          New Task
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Total Tasks"
          value={kpis.total}
          icon="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"
          iconBg="bg-brand-orange"
          trend="all tasks"
        />
        <KpiCard
          title="Pending"
          value={kpis.pending}
          icon="M12 6v6l4 2M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z"
          iconBg="bg-amber-500"
          trend={`${kpis.total > 0 ? Math.round((kpis.pending / kpis.total) * 100) : 0}% of total`}
        />
        <KpiCard
          title="In Progress"
          value={kpis.inProgress}
          icon="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
          iconBg="bg-blue-500"
          trend={`${kpis.total > 0 ? Math.round((kpis.inProgress / kpis.total) * 100) : 0}% of total`}
        />
        <KpiCard
          title="Completed"
          value={kpis.completed}
          icon="M20 6 9 17l-5-5"
          iconBg="bg-emerald-500"
          trend={`${kpis.total > 0 ? Math.round((kpis.completed / kpis.total) * 100) : 0}% completion`}
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

      <div className="space-y-6">
        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : grouped.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl bg-white py-16 text-center shadow-card">
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
            <p className="mt-3 text-sm font-medium text-slate-700">
              No onboarding tasks yet
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Create your first task to get started.
            </p>
            <button
              onClick={openModal}
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
              New Task
            </button>
          </div>
        ) : (
          grouped.map((group) => (
            <section
              key={group.employeeId}
              className="overflow-hidden rounded-2xl bg-white shadow-card"
            >
              <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-orange/10 text-sm font-bold text-brand-orange">
                    {initials(group.firstName, group.lastName) || "?"}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-brand-navy">
                      {group.firstName} {group.lastName}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {group.total} task{group.total === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
                <EmployeeProgress
                  completed={group.completed}
                  total={group.total}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
                {group.tasks.map((task) => {
                  const isActioning = actioningId === task.id;
                  const owner = assigneeName(task.assigned_to);
                  return (
                    <div
                      key={task.id}
                      className="flex flex-col rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:shadow-card"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-semibold text-brand-navy">
                          {task.title}
                        </h3>
                        <StatusBadge status={task.status} />
                      </div>

                      {task.description && (
                        <p className="mt-2 line-clamp-2 text-sm text-slate-500">
                          {task.description}
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1.5">
                          <svg
                            viewBox="0 0 24 24"
                            className="h-3.5 w-3.5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
                          </svg>
                          {formatDate(task.due_date)}
                        </span>
                        {owner && (
                          <span className="inline-flex items-center gap-1.5">
                            <svg
                              viewBox="0 0 24 24"
                              className="h-3.5 w-3.5"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
                            </svg>
                            {owner}
                          </span>
                        )}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                        {task.status === "pending" && (
                          <button
                            onClick={() => updateStatus(task, "in_progress")}
                            disabled={isActioning}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {isActioning ? "..." : "Mark In Progress"}
                          </button>
                        )}
                        {task.status === "in_progress" && (
                          <button
                            onClick={() => updateStatus(task, "completed")}
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
                            {isActioning ? "..." : "Mark Complete"}
                          </button>
                        )}
                        {task.status === "completed" && (
                          <button
                            onClick={() => updateStatus(task, "in_progress")}
                            disabled={isActioning}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {isActioning ? "..." : "Reopen"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-navy/40 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-card">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-bold text-brand-navy">New Onboarding Task</h2>
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
              <Field label="Title" required>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  placeholder="e.g. Complete company orientation"
                  className={inputClass}
                />
              </Field>
              <Field label="Description">
                <textarea
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  rows={3}
                  placeholder="Brief description of the task..."
                  className={`${inputClass} resize-none`}
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Status">
                  <select
                    value={form.status}
                    onChange={(e) =>
                      updateField("status", e.target.value as TaskStatus)
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
                <Field label="Due date">
                  <input
                    type="date"
                    value={form.due_date}
                    onChange={(e) => updateField("due_date", e.target.value)}
                    className={inputClass}
                  />
                </Field>
              </div>
              <Field label="Assigned to">
                <select
                  value={form.assigned_to}
                  onChange={(e) => updateField("assigned_to", e.target.value)}
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
                  {submitting ? "Creating..." : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
