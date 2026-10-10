"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import type { Employee, ExpenseClaim } from "@/types";

interface ExpenseClaimWithEmployee extends ExpenseClaim {
  employees: { first_name: string; last_name: string } | null;
}

interface FormState {
  category: ExpenseClaim["category"];
  amount: string;
  description: string;
  receipt_url: string;
}

const emptyForm: FormState = {
  category: "travel",
  amount: "",
  description: "",
  receipt_url: "",
};

const categories: ExpenseClaim["category"][] = [
  "travel",
  "meals",
  "office",
  "equipment",
  "other",
];

const statusStyles: Record<ExpenseClaim["status"], string> = {
  pending: "bg-amber-50 text-amber-700",
  approved: "bg-blue-50 text-blue-700",
  paid: "bg-emerald-50 text-emerald-700",
  rejected: "bg-red-50 text-red-700",
};

const categoryStyles: Record<ExpenseClaim["category"], string> = {
  travel: "bg-blue-50 text-blue-700",
  meals: "bg-orange-50 text-orange-700",
  office: "bg-purple-50 text-purple-700",
  equipment: "bg-slate-100 text-slate-700",
  other: "bg-slate-100 text-slate-600",
};

const formatRM = (value: number) =>
  new Intl.NumberFormat("ms-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 2,
  }).format(value);

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const StatusBadge = ({ status }: { status: ExpenseClaim["status"] }) => (
  <span
    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusStyles[status]}`}
  >
    {status}
  </span>
);

const CategoryBadge = ({ category }: { category: ExpenseClaim["category"] }) => (
  <span
    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${categoryStyles[category]}`}
  >
    {category}
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
        <path d="M3 3h18v18H3zM3 9h18M9 21V9" />
      </svg>
    </div>
    <p className="mt-3 text-sm font-medium text-slate-700">{title}</p>
    <p className="mt-1 text-sm text-slate-500">{message}</p>
  </div>
);

interface SummaryCardProps {
  title: string;
  value: string;
  icon: string;
  iconBg: string;
  accent?: string;
}

const SummaryCard = ({ title, value, icon, iconBg, accent }: SummaryCardProps) => (
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
    <p className={`mt-1 text-2xl font-bold ${accent || "text-brand-navy"}`}>
      {value}
    </p>
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

export default function ExpensesPage() {
  const { user, role } = useAuth();

  const [claims, setClaims] = useState<ExpenseClaimWithEmployee[]>([]);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [actioningId, setActioningId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const canManage = role === "admin" || role === "manager";

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

    setCurrentEmployee((empRes.data as Employee) || null);

    const { data, error: claimsErr } = await supabase
      .from("expense_claims")
      .select(
        "*, employees!expense_claims_employee_id_fkey(first_name, last_name)"
      )
      .order("created_at", { ascending: false });

    if (claimsErr) {
      setError("Failed to load expense claims.");
      setLoading(false);
      return;
    }

    setClaims((data as ExpenseClaimWithEmployee[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const summary = useMemo(() => {
    const total = claims.length;
    const pending = claims.filter((c) => c.status === "pending").length;
    const approved = claims.filter((c) => c.status === "approved").length;
    const totalAmount = claims.reduce(
      (sum, c) => sum + Number(c.amount || 0),
      0
    );
    return { total, pending, approved, totalAmount };
  }, [claims]);

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

    const amount = Number(form.amount);
    if (!form.amount || isNaN(amount) || amount <= 0) {
      setFormError("Please enter a valid amount greater than 0.");
      return;
    }
    if (!form.description.trim()) {
      setFormError("Description is required.");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    const { error: err } = await supabase.from("expense_claims").insert({
      employee_id: currentEmployee.id,
      category: form.category,
      amount,
      description: form.description.trim(),
      receipt_url: form.receipt_url.trim() || null,
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

  const updateStatus = async (
    claim: ExpenseClaimWithEmployee,
    status: ExpenseClaim["status"]
  ) => {
    if (!currentEmployee) return;
    setActioningId(claim.id);
    setActionError(null);

    const updatePayload: Partial<ExpenseClaim> = { status };
    if (status !== "paid") {
      updatePayload.approved_by = currentEmployee.id;
    }

    const { error: err } = await supabase
      .from("expense_claims")
      .update(updatePayload)
      .eq("id", claim.id);

    if (err) {
      setActionError(err.message);
      setActioningId(null);
      return;
    }

    setClaims((prev) =>
      prev.map((c) =>
        c.id === claim.id
          ? { ...c, status, approved_by: updatePayload.approved_by ?? c.approved_by }
          : c
      )
    );
    setActioningId(null);
  };

  const handleApprove = (claim: ExpenseClaimWithEmployee) =>
    updateStatus(claim, "approved");

  const handleReject = (claim: ExpenseClaimWithEmployee) =>
    updateStatus(claim, "rejected");

  const handleMarkPaid = (claim: ExpenseClaimWithEmployee) =>
    updateStatus(claim, "paid");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">Expense Claims</h1>
          <p className="text-sm text-slate-500">
            Submit and review employee expense claims.
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
          New Claim
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Total Claims"
          value={String(summary.total)}
          icon="M3 3h18v18H3zM3 9h18M9 21V9"
          iconBg="bg-brand-orange"
        />
        <SummaryCard
          title="Pending"
          value={String(summary.pending)}
          icon="M12 6v6l4 2M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z"
          iconBg="bg-amber-500"
          accent="text-amber-600"
        />
        <SummaryCard
          title="Approved"
          value={String(summary.approved)}
          icon="M20 6 9 17l-5-5"
          iconBg="bg-blue-500"
          accent="text-blue-600"
        />
        <SummaryCard
          title="Total Amount"
          value={formatRM(summary.totalAmount)}
          icon="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"
          iconBg="bg-brand-navy"
        />
      </div>

      {(error || actionError) && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error || actionError}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl bg-white shadow-card">
        {loading ? (
          <LoadingSpinner />
        ) : claims.length === 0 ? (
          <EmptyState
            title="No expense claims yet"
            message="Click New Claim to submit your first expense claim."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-4 font-semibold">Employee</th>
                  <th className="px-5 py-4 font-semibold">Category</th>
                  <th className="px-5 py-4 text-right font-semibold">Amount</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 font-semibold">Date</th>
                  {canManage && (
                    <th className="px-5 py-4 text-right font-semibold">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {claims.map((claim) => {
                  const name = `${claim.employees?.first_name ?? ""} ${
                    claim.employees?.last_name ?? ""
                  }`.trim();
                  const initials = `${claim.employees?.first_name?.[0] ?? ""}${
                    claim.employees?.last_name?.[0] ?? ""
                  }`.toUpperCase();
                  const isActioning = actioningId === claim.id;
                  return (
                    <tr key={claim.id} className="transition hover:bg-slate-50">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-orange/10 text-xs font-bold text-brand-orange">
                            {initials || "?"}
                          </div>
                          <div>
                            <span className="font-medium text-brand-navy">
                              {name || "Unknown"}
                            </span>
                            {claim.description && (
                              <p className="max-w-xs text-xs text-slate-500 line-clamp-1">
                                {claim.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <CategoryBadge category={claim.category} />
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold text-brand-navy">
                        {formatRM(Number(claim.amount) || 0)}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={claim.status} />
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        {formatDate(claim.created_at)}
                      </td>
                      {canManage && (
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-2">
                            {claim.status === "pending" && (
                              <>
                                <button
                                  onClick={() => handleApprove(claim)}
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
                                  {isActioning ? "..." : "Approve"}
                                </button>
                                <button
                                  onClick={() => handleReject(claim)}
                                  disabled={isActioning}
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
                              </>
                            )}
                            {claim.status === "approved" && (
                              <button
                                onClick={() => handleMarkPaid(claim)}
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
                                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                                </svg>
                                {isActioning ? "..." : "Mark Paid"}
                              </button>
                            )}
                            {(claim.status === "rejected" ||
                              claim.status === "paid") && (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </div>
                        </td>
                      )}
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
              <h2 className="text-lg font-bold text-brand-navy">New Expense Claim</h2>
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
              <Field label="Category" required>
                <select
                  value={form.category}
                  onChange={(e) =>
                    updateField(
                      "category",
                      e.target.value as ExpenseClaim["category"]
                    )
                  }
                  className={inputClass}
                >
                  {categories.map((c) => (
                    <option key={c} value={c} className="capitalize">
                      {c}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Amount (RM)" required>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => updateField("amount", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Description" required>
                <textarea
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  rows={4}
                  placeholder="Describe the expense..."
                  className={`${inputClass} resize-none`}
                />
              </Field>
              <Field label="Receipt URL (optional)">
                <input
                  type="url"
                  placeholder="https://..."
                  value={form.receipt_url}
                  onChange={(e) => updateField("receipt_url", e.target.value)}
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
                  {submitting ? "Submitting..." : "Submit Claim"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
