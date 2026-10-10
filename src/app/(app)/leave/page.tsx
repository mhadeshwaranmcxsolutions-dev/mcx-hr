"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import type { Employee, LeaveBalance, LeaveRequest, LeaveStatus, LeaveType } from "@/types";

interface LeaveWithEmployee extends LeaveRequest {
  employees: { first_name: string; last_name: string } | null;
}

interface FormState {
  type: LeaveType;
  start_date: string;
  end_date: string;
  reason: string;
}

const emptyForm: FormState = {
  type: "annual",
  start_date: new Date().toISOString().slice(0, 10),
  end_date: new Date().toISOString().slice(0, 10),
  reason: "",
};

const leaveTypes: LeaveType[] = ["annual", "sick", "personal", "unpaid"];
const statusOptions: LeaveStatus[] = ["pending", "approved", "rejected"];

const statusStyles: Record<LeaveStatus, string> = {
  pending: "bg-amber-50 text-amber-700",
  approved: "bg-emerald-50 text-emerald-700",
  rejected: "bg-red-50 text-red-700",
};

const typeStyles: Record<LeaveType, string> = {
  annual: "bg-blue-50 text-blue-700",
  sick: "bg-rose-50 text-rose-700",
  personal: "bg-purple-50 text-purple-700",
  unpaid: "bg-slate-100 text-slate-700",
};

const daysBetween = (start: string, end: string) => {
  const s = new Date(start);
  const e = new Date(end);
  const ms = e.getTime() - s.getTime();
  return Math.max(1, Math.floor(ms / 86400000) + 1);
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const StatusBadge = ({ status }: { status: LeaveStatus }) => (
  <span
    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusStyles[status]}`}
  >
    {status}
  </span>
);

const TypeBadge = ({ type }: { type: LeaveType }) => (
  <span
    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${typeStyles[type]}`}
  >
    {type}
  </span>
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
        <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
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

export default function LeavePage() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<"my" | "all">("my");
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [myRequests, setMyRequests] = useState<LeaveRequest[]>([]);
  const [allRequests, setAllRequests] = useState<LeaveWithEmployee[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | LeaveStatus>("all");
  const [myBalance, setMyBalance] = useState<LeaveBalance | null>(null);

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

    const empRes = await supabase
      .from("employees")
      .select("*")
      .eq("email", user.email)
      .maybeSingle();

    if (empRes.error) {
      setError("Failed to load your employee record.");
      setLoading(false);
      return;
    }

    const employee = empRes.data as Employee | null;
    setCurrentEmployee(employee);

    const requestsQuery = supabase
      .from("leave_requests")
      .select(
        "*, employees!leave_requests_employee_id_fkey(first_name, last_name)"
      )
      .order("created_at", { ascending: false });

    const myReq = employee
      ? requestsQuery.eq("employee_id", employee.id)
      : Promise.resolve({ data: [], error: null });

    const allReq = supabase
      .from("leave_requests")
      .select(
        "*, employees!leave_requests_employee_id_fkey(first_name, last_name)"
      )
      .order("created_at", { ascending: false });

    const [myRes, allRes] = await Promise.all([myReq, allReq]);

    if (myRes.error || allRes.error) {
      setError("Failed to load leave requests.");
      setLoading(false);
      return;
    }

    setMyRequests((myRes.data as LeaveRequest[]) || []);
    setAllRequests((allRes.data as LeaveWithEmployee[]) || []);

    if (employee) {
      const year = new Date().getFullYear();
      const balRes = await supabase
        .from("leave_balances")
        .select("*")
        .eq("employee_id", employee.id)
        .eq("year", year)
        .maybeSingle();
      if (!balRes.error && balRes.data) {
        setMyBalance(balRes.data as LeaveBalance);
      } else if (!balRes.data) {
        const createRes = await supabase
          .from("leave_balances")
          .insert({ employee_id: employee.id, year })
          .select()
          .single();
        if (!createRes.error && createRes.data) {
          setMyBalance(createRes.data as LeaveBalance);
        }
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user]);

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
    if (!currentEmployee) return;

    if (!form.start_date || !form.end_date || !form.reason.trim()) {
      setFormError("All fields are required.");
      return;
    }
    if (new Date(form.end_date) < new Date(form.start_date)) {
      setFormError("End date must be on or after the start date.");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    const { error: err } = await supabase.from("leave_requests").insert({
      employee_id: currentEmployee.id,
      type: form.type,
      start_date: form.start_date,
      end_date: form.end_date,
      reason: form.reason.trim(),
    });

    if (err) {
      setFormError(err.message);
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    setModalOpen(false);
    loadData();
  };

  const handleApprove = async (request: LeaveWithEmployee) => {
    if (!currentEmployee) return;
    setActioningId(request.id);
    setActionError(null);

    const days = daysBetween(request.start_date, request.end_date);
    const field = request.type === "sick" ? "sick_used" : request.type === "personal" ? "personal_used" : request.type === "annual" ? "annual_used" : null;

    const { error: err } = await supabase
      .from("leave_requests")
      .update({ status: "approved", approved_by: currentEmployee.id })
      .eq("id", request.id);

    if (err) {
      setActionError(err.message);
      setActioningId(null);
      return;
    }

    if (field) {
      const balRes = await supabase
        .from("leave_balances")
        .select("*")
        .eq("employee_id", request.employee_id)
        .eq("year", new Date().getFullYear())
        .maybeSingle();
      if (balRes.data) {
        const current = (balRes.data as Record<string, number>)[field] || 0;
        await supabase
          .from("leave_balances")
          .update({ [field]: current + days })
          .eq("id", balRes.data.id);
      }
    }

    setAllRequests((prev) =>
      prev.map((r) =>
        r.id === request.id
          ? { ...r, status: "approved", approved_by: currentEmployee.id }
          : r
      )
    );
    setActioningId(null);
  };

  const handleReject = async (request: LeaveWithEmployee) => {
    if (!currentEmployee) return;
    setActioningId(request.id);
    setActionError(null);

    const { error: err } = await supabase
      .from("leave_requests")
      .update({ status: "rejected", approved_by: currentEmployee.id })
      .eq("id", request.id);

    if (err) {
      setActionError(err.message);
      setActioningId(null);
      return;
    }

    setAllRequests((prev) =>
      prev.map((r) =>
        r.id === request.id
          ? { ...r, status: "rejected", approved_by: currentEmployee.id }
          : r
      )
    );
    setActioningId(null);
  };

  const filteredAll = useMemo(() => {
    if (statusFilter === "all") return allRequests;
    return allRequests.filter((r) => r.status === statusFilter);
  }, [allRequests, statusFilter]);

  const tabs: { id: "my" | "all"; label: string }[] = [
    { id: "my", label: "My Leave" },
    { id: "all", label: "All Requests" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">Leave Management</h1>
          <p className="text-sm text-slate-500">
            Request leave and manage team leave approvals.
          </p>
        </div>
        {activeTab === "my" && (
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
            Request Leave
          </button>
        )}
      </div>

      <div className="rounded-2xl bg-white p-1.5 shadow-card">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                activeTab === tab.id
                  ? "bg-brand-orange text-white shadow-glow"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {actionError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      )}

      {activeTab === "my" && myBalance && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { label: "Annual Leave", total: myBalance.annual_total, used: myBalance.annual_used, color: "blue" },
            { label: "Sick Leave", total: myBalance.sick_total, used: myBalance.sick_used, color: "rose" },
            { label: "Personal Leave", total: myBalance.personal_total, used: myBalance.personal_used, color: "purple" },
          ].map((b) => {
            const remaining = b.total - b.used;
            const pct = b.total > 0 ? Math.min(100, Math.round((b.used / b.total) * 100)) : 0;
            return (
              <div key={b.label} className="rounded-2xl bg-white p-5 shadow-card">
                <p className="text-sm font-medium text-slate-500">{b.label}</p>
                <p className="mt-1 text-3xl font-bold text-brand-navy">{remaining}<span className="text-base font-normal text-slate-400"> / {b.total} days</span></p>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${pct > 80 ? "bg-red-400" : pct > 50 ? "bg-amber-400" : "bg-brand-orange"}`} style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-2 text-xs text-slate-400">{b.used} used · {remaining} remaining</p>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === "my" ? (
        <div className="overflow-hidden rounded-2xl bg-white shadow-card">
          {loading ? (
            <LoadingSpinner />
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : myRequests.length === 0 ? (
            <EmptyState
              title="No leave requests yet"
              message="Submit your first leave request to get started."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-4 font-semibold">Type</th>
                    <th className="px-5 py-4 font-semibold">Dates</th>
                    <th className="px-5 py-4 font-semibold">Days</th>
                    <th className="px-5 py-4 font-semibold">Reason</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {myRequests.map((req) => (
                    <tr key={req.id} className="transition hover:bg-slate-50">
                      <td className="px-5 py-3.5">
                        <TypeBadge type={req.type} />
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        {formatDate(req.start_date)} — {formatDate(req.end_date)}
                      </td>
                      <td className="px-5 py-3.5 font-medium text-slate-700">
                        {daysBetween(req.start_date, req.end_date)}
                      </td>
                      <td className="max-w-xs px-5 py-3.5 text-slate-600">
                        <span className="line-clamp-2">{req.reason}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={req.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl bg-white p-4 shadow-card">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-brand-navy">
                  All Leave Requests
                </h2>
                <p className="text-sm text-slate-500">
                  Review and approve or reject leave requests.
                </p>
              </div>
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as "all" | LeaveStatus)
                }
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-brand-navy outline-none transition focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
              >
                <option value="all">All statuses</option>
                {statusOptions.map((s) => (
                  <option key={s} value={s} className="capitalize">
                    {s}
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
            ) : filteredAll.length === 0 ? (
              <EmptyState
                title={
                  allRequests.length === 0
                    ? "No leave requests"
                    : "No requests match this filter"
                }
                message={
                  allRequests.length === 0
                    ? "Leave requests will appear here once submitted."
                    : "Try selecting a different status filter."
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-4 font-semibold">Employee</th>
                      <th className="px-5 py-4 font-semibold">Type</th>
                      <th className="px-5 py-4 font-semibold">Dates</th>
                      <th className="px-5 py-4 font-semibold">Days</th>
                      <th className="px-5 py-4 font-semibold">Reason</th>
                      <th className="px-5 py-4 font-semibold">Status</th>
                      <th className="px-5 py-4 text-right font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAll.map((req) => {
                      const name = `${req.employees?.first_name ?? ""} ${
                        req.employees?.last_name ?? ""
                      }`.trim();
                      const initials = `${req.employees?.first_name?.[0] ?? ""}${
                        req.employees?.last_name?.[0] ?? ""
                      }`.toUpperCase();
                      const isActioning = actioningId === req.id;
                      return (
                        <tr
                          key={req.id}
                          className="transition hover:bg-slate-50"
                        >
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
                          <td className="px-5 py-3.5">
                            <TypeBadge type={req.type} />
                          </td>
                          <td className="px-5 py-3.5 text-slate-600">
                            {formatDate(req.start_date)} —{" "}
                            {formatDate(req.end_date)}
                          </td>
                          <td className="px-5 py-3.5 font-medium text-slate-700">
                            {daysBetween(req.start_date, req.end_date)}
                          </td>
                          <td className="max-w-xs px-5 py-3.5 text-slate-600">
                            <span className="line-clamp-2">{req.reason}</span>
                          </td>
                          <td className="px-5 py-3.5">
                            <StatusBadge status={req.status} />
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleApprove(req)}
                                disabled={
                                  isActioning || req.status !== "pending"
                                }
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
                                {isActioning ? "..." : "Approve"}
                              </button>
                              <button
                                onClick={() => handleReject(req)}
                                disabled={
                                  isActioning || req.status !== "pending"
                                }
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
                                  <path d="M18 6 6 18M6 6l12 12" />
                                </svg>
                                {isActioning ? "..." : "Reject"}
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
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-navy/40 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-card">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-bold text-brand-navy">
                Request Leave
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
              <Field label="Leave type" required>
                <select
                  value={form.type}
                  onChange={(e) =>
                    updateField("type", e.target.value as LeaveType)
                  }
                  className={inputClass}
                >
                  {leaveTypes.map((t) => (
                    <option key={t} value={t} className="capitalize">
                      {t}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Start date" required>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => updateField("start_date", e.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label="End date" required>
                  <input
                    type="date"
                    value={form.end_date}
                    onChange={(e) => updateField("end_date", e.target.value)}
                    className={inputClass}
                  />
                </Field>
              </div>
              <Field label="Reason" required>
                <textarea
                  value={form.reason}
                  onChange={(e) => updateField("reason", e.target.value)}
                  rows={4}
                  placeholder="Provide a reason for your leave..."
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
                  {submitting ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
