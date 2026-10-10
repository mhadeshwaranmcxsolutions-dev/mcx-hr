"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Payroll, Employee, BonusAllowance } from "@/types";

interface PayrollRow extends Payroll {
  employees: { first_name: string; last_name: string } | null;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const statusStyles: Record<Payroll["status"], string> = {
  pending: "bg-amber-50 text-amber-700",
  paid: "bg-emerald-50 text-emerald-700",
};

const formatRM = (value: number) =>
  new Intl.NumberFormat("ms-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 2,
  }).format(value);

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

const StatusBadge = ({ status }: { status: Payroll["status"] }) => (
  <span
    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusStyles[status]}`}
  >
    {status}
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
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
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

export default function PayrollPage() {
  const now = new Date();
  const [month, setMonth] = useState<string>(MONTHS[now.getMonth()]);
  const [year, setYear] = useState<number>(now.getFullYear());

  const [payroll, setPayroll] = useState<PayrollRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [runMessage, setRunMessage] = useState<string | null>(null);

  const [editing, setEditing] = useState<PayrollRow | null>(null);
  const [editOvertime, setEditOvertime] = useState<string>("0");
  const [editDeductions, setEditDeductions] = useState<string>("0");
  const [submitting, setSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [payslipTarget, setPayslipTarget] = useState<PayrollRow | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);

  const [bonuses, setBonuses] = useState<(BonusAllowance & { employees: { first_name: string; last_name: string } | null })[]>([]);
  const [showBonusModal, setShowBonusModal] = useState(false);
  const [bonusEmp, setBonusEmp] = useState("");
  const [bonusType, setBonusType] = useState<BonusAllowance["type"]>("bonus");
  const [bonusAmount, setBonusAmount] = useState("");
  const [bonusDesc, setBonusDesc] = useState("");
  const [bonusSubmitting, setBonusSubmitting] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const loadPayroll = async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("payroll")
      .select("*, employees(first_name, last_name)")
      .eq("month", month)
      .eq("year", year)
      .order("created_at", { ascending: false });

    if (err) {
      setError("Failed to load payroll records. Please try again.");
      setLoading(false);
      return;
    }
    setPayroll((data as PayrollRow[]) || []);
    setLoading(false);

    const monthNum = MONTHS.indexOf(month) + 1;
    const [bonusRes, empRes] = await Promise.all([
      supabase
        .from("bonuses_allowances")
        .select("*, employees!bonuses_allowances_employee_id_fkey(first_name, last_name)")
        .eq("month", monthNum)
        .eq("year", year)
        .order("created_at", { ascending: false }),
      supabase.from("employees").select("id, first_name, last_name").eq("status", "active"),
    ]);
    if (!bonusRes.error) setBonuses((bonusRes.data as any[]) || []);
    if (!empRes.error) setEmployees((empRes.data as Employee[]) || []);
  };

  useEffect(() => {
    loadPayroll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year]);

  const summary = useMemo(() => {
    const total = payroll.reduce(
      (sum, p) => sum + Number(p.net_salary || 0),
      0
    );
    const paid = payroll
      .filter((p) => p.status === "paid")
      .reduce((sum, p) => sum + Number(p.net_salary || 0), 0);
    const pending = payroll
      .filter((p) => p.status === "pending")
      .reduce((sum, p) => sum + Number(p.net_salary || 0), 0);
    const paidCount = payroll.filter((p) => p.status === "paid").length;
    return { total, paid, pending, paidCount };
  }, [payroll]);

  const bonusSummary = useMemo(() => {
    const addTypes: BonusAllowance["type"][] = ["bonus", "allowance"];
    const deductTypes: BonusAllowance["type"][] = ["deduction", "epf", "socso", "pcb"];
    const additions = bonuses.filter((b) => addTypes.includes(b.type)).reduce((s, b) => s + Number(b.amount || 0), 0);
    const deductions = bonuses.filter((b) => deductTypes.includes(b.type)).reduce((s, b) => s + Number(b.amount || 0), 0);
    return { additions, deductions, net: additions - deductions };
  }, [bonuses]);

  const addBonus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bonusEmp || !bonusAmount) return;
    setBonusSubmitting(true);
    const monthNum = MONTHS.indexOf(month) + 1;
    const { error } = await supabase.from("bonuses_allowances").insert({
      employee_id: bonusEmp,
      type: bonusType,
      amount: Number(bonusAmount),
      description: bonusDesc || null,
      month: monthNum,
      year,
    });
    setBonusSubmitting(false);
    if (!error) {
      setShowBonusModal(false);
      setBonusEmp("");
      setBonusAmount("");
      setBonusDesc("");
      loadPayroll();
    }
  };

  const handleRunPayroll = async () => {
    setRunning(true);
    setError(null);
    setRunMessage(null);

    const [empRes, existingRes] = await Promise.all([
      supabase
        .from("employees")
        .select("id, first_name, last_name, salary")
        .eq("status", "active"),
      supabase
        .from("payroll")
        .select("employee_id")
        .eq("month", month)
        .eq("year", year),
    ]);

    if (empRes.error || existingRes.error) {
      setError("Failed to run payroll. Please try again.");
      setRunning(false);
      return;
    }

    const employees = (empRes.data as Employee[]) || [];
    const existingIds = new Set(
      (existingRes.data as { employee_id: string }[]).map((r) => r.employee_id)
    );

    const toCreate = employees
      .filter((e) => !existingIds.has(e.id))
      .map((e) => {
        const basic = Number(e.salary) || 0;
        return {
          employee_id: e.id,
          month,
          year,
          basic_salary: basic,
          overtime: 0,
          deductions: 0,
          net_salary: basic,
          status: "pending" as const,
        };
      });

    if (toCreate.length === 0) {
      setRunMessage(
        "All active employees already have payroll records for this period."
      );
      setRunning(false);
      await loadPayroll();
      return;
    }

    const { error: insertErr } = await supabase.from("payroll").insert(toCreate);

    if (insertErr) {
      setError(insertErr.message);
      setRunning(false);
      return;
    }

    setRunMessage(
      `Created ${toCreate.length} payroll record${toCreate.length === 1 ? "" : "s"} for ${month} ${year}.`
    );
    setRunning(false);
    await loadPayroll();
  };

  const openEdit = (row: PayrollRow) => {
    setEditing(row);
    setEditOvertime(String(row.overtime));
    setEditDeductions(String(row.deductions));
    setEditError(null);
  };

  const closeEdit = () => {
    if (submitting) return;
    setEditing(null);
  };

  const liveNetSalary = useMemo(() => {
    if (!editing) return 0;
    const basic = Number(editing.basic_salary) || 0;
    const ot = Number(editOvertime) || 0;
    const ded = Number(editDeductions) || 0;
    return basic + ot - ded;
  }, [editing, editOvertime, editDeductions]);

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const ot = Number(editOvertime) || 0;
    const ded = Number(editDeductions) || 0;
    if (ot < 0 || ded < 0) {
      setEditError("Overtime and deductions cannot be negative.");
      return;
    }
    setSubmitting(true);
    setEditError(null);

    const net = Number(editing.basic_salary) + ot - ded;
    const { data, error: err } = await supabase
      .from("payroll")
      .update({ overtime: ot, deductions: ded, net_salary: net })
      .eq("id", editing.id)
      .select("*, employees(first_name, last_name)")
      .single();

    if (err) {
      setEditError(err.message);
      setSubmitting(false);
      return;
    }

    setPayroll((prev) =>
      prev.map((p) => (p.id === editing.id ? (data as PayrollRow) : p))
    );
    setSubmitting(false);
    setEditing(null);
  };

  const handleMarkPaid = async (row: PayrollRow) => {
    setPayingId(row.id);
    const { data, error: err } = await supabase
      .from("payroll")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", row.id)
      .select("*, employees(first_name, last_name)")
      .single();

    if (err) {
      setError(err.message);
      setPayingId(null);
      return;
    }
    setPayroll((prev) =>
      prev.map((p) => (p.id === row.id ? (data as PayrollRow) : p))
    );
    setPayingId(null);
  };

  const years = useMemo(() => {
    const current = now.getFullYear();
    const arr: number[] = [];
    for (let y = current - 2; y <= current + 1; y++) arr.push(y);
    return arr;
  }, [now.getFullYear()]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">Payroll</h1>
          <p className="text-sm text-slate-500">
            Run payroll, adjust overtime and deductions, and mark payments.
          </p>
        </div>
        <button
          onClick={handleRunPayroll}
          disabled={running}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-orange px-4 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:bg-brand-orangeDark disabled:opacity-60"
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
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
          {running ? "Running..." : "Run Payroll"}
        </button>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-card">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Month">
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className={inputClass}
            >
              {MONTHS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Year">
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className={inputClass}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </Field>
          <div className="flex items-end">
            <p className="text-sm text-slate-500">
              Showing payroll for{" "}
              <span className="font-semibold text-brand-navy">
                {month} {year}
              </span>
            </p>
          </div>
        </div>
      </div>

      {(error || runMessage) && (
        <div
          className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm ${
            error
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          <span>{error || runMessage}</span>
          <button
            onClick={() => {
              setError(null);
              setRunMessage(null);
            }}
            className="font-medium underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Total Payroll"
          value={formatRM(summary.total)}
          icon="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"
          iconBg="bg-brand-orange"
        />
        <SummaryCard
          title="Paid Amount"
          value={formatRM(summary.paid)}
          icon="M20 6 9 17l-5-5"
          iconBg="bg-emerald-500"
          accent="text-emerald-600"
        />
        <SummaryCard
          title="Pending Amount"
          value={formatRM(summary.pending)}
          icon="M12 6v6l4 2M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z"
          iconBg="bg-amber-500"
          accent="text-amber-600"
        />
        <SummaryCard
          title="Employees Paid"
          value={String(summary.paidCount)}
          icon="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"
          iconBg="bg-brand-navy"
        />
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-card">
        {loading ? (
          <LoadingSpinner />
        ) : payroll.length === 0 ? (
          <EmptyState
            title="No payroll records for this period"
            message="Click Run Payroll to generate records for all active employees."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-4 font-semibold">Employee</th>
                  <th className="px-5 py-4 text-right font-semibold">
                    Basic Salary
                  </th>
                  <th className="px-5 py-4 text-right font-semibold">
                    Overtime
                  </th>
                  <th className="px-5 py-4 text-right font-semibold">
                    Deductions
                  </th>
                  <th className="px-5 py-4 text-right font-semibold">
                    Net Salary
                  </th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payroll.map((row) => {
                  const name = `${row.employees?.first_name ?? ""} ${
                    row.employees?.last_name ?? ""
                  }`.trim();
                  const initials = `${row.employees?.first_name?.[0] ?? ""}${
                    row.employees?.last_name?.[0] ?? ""
                  }`.toUpperCase();
                  const isPaying = payingId === row.id;
                  return (
                    <tr
                      key={row.id}
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
                      <td className="px-5 py-3.5 text-right text-slate-600">
                        {formatRM(Number(row.basic_salary) || 0)}
                      </td>
                      <td className="px-5 py-3.5 text-right text-slate-600">
                        {formatRM(Number(row.overtime) || 0)}
                      </td>
                      <td className="px-5 py-3.5 text-right text-slate-600">
                        {formatRM(Number(row.deductions) || 0)}
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold text-brand-navy">
                        {formatRM(Number(row.net_salary) || 0)}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-2">
                          {row.status === "pending" ? (
                            <>
                              <button
                                onClick={() => openEdit(row)}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                              >
                                <svg
                                  viewBox="0 0 24 24"
                                  className="h-3.5 w-3.5"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                                </svg>
                                Edit
                              </button>
                              <button
                                onClick={() => handleMarkPaid(row)}
                                disabled={isPaying}
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
                                {isPaying ? "..." : "Mark as Paid"}
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => setPayslipTarget(row)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-navy/5 px-3 py-1.5 text-xs font-semibold text-brand-navy transition hover:bg-brand-navy/10"
                            >
                              <svg
                                viewBox="0 0 24 24"
                                className="h-3.5 w-3.5"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8ZM14 2v6h6M16 13H8M16 17H8M10 9H8" />
                              </svg>
                              View Payslip
                            </button>
                          )}
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

      <div className="overflow-hidden rounded-2xl bg-white shadow-card">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-brand-navy">Bonuses &amp; Allowances</h2>
            <p className="text-sm text-slate-500">{month} {year}</p>
          </div>
          <button onClick={() => setShowBonusModal(true)} className="inline-flex items-center gap-2 rounded-xl bg-brand-orange px-4 py-2 text-sm font-semibold text-white shadow-glow hover:bg-brand-orangeDark">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
            Add Item
          </button>
        </div>
        {bonuses.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">No bonuses or allowances for this period.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3 font-semibold">Employee</th>
                  <th className="px-5 py-3 font-semibold">Type</th>
                  <th className="px-5 py-3 font-semibold">Description</th>
                  <th className="px-5 py-3 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bonuses.map((b) => {
                  const name = `${b.employees?.first_name ?? ""} ${b.employees?.last_name ?? ""}`.trim();
                  const isDeduct = ["deduction", "epf", "socso", "pcb"].includes(b.type);
                  return (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 font-medium text-brand-navy">{name || "Unknown"}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${isDeduct ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
                          {b.type.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-600">{b.description || "—"}</td>
                      <td className={`px-5 py-3 text-right font-semibold ${isDeduct ? "text-red-600" : "text-emerald-600"}`}>
                        {isDeduct ? "-" : "+"}{formatRM(Number(b.amount) || 0)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50">
                  <td colSpan={3} className="px-5 py-3 text-right text-sm font-semibold text-slate-600">Total Additions:</td>
                  <td className="px-5 py-3 text-right font-bold text-emerald-600">{formatRM(bonusSummary.additions)}</td>
                </tr>
                <tr className="bg-slate-50">
                  <td colSpan={3} className="px-5 py-3 text-right text-sm font-semibold text-slate-600">Total Deductions:</td>
                  <td className="px-5 py-3 text-right font-bold text-red-600">-{formatRM(bonusSummary.deductions)}</td>
                </tr>
                <tr className="bg-slate-100">
                  <td colSpan={3} className="px-5 py-3 text-right text-sm font-bold text-brand-navy">Net Impact:</td>
                  <td className={`px-5 py-3 text-right font-bold ${bonusSummary.net >= 0 ? "text-emerald-600" : "text-red-600"}`}>{formatRM(bonusSummary.net)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {showBonusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-navy/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-card">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-bold text-brand-navy">Add Bonus / Allowance / Deduction</h2>
              <button onClick={() => setShowBonusModal(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={addBonus} className="space-y-4 px-6 py-5">
              <Field label="Employee">
                <select value={bonusEmp} onChange={(e) => setBonusEmp(e.target.value)} className={inputClass} required>
                  <option value="">Select employee</option>
                  {employees.map((e) => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
                </select>
              </Field>
              <Field label="Type">
                <select value={bonusType} onChange={(e) => setBonusType(e.target.value as BonusAllowance["type"])} className={inputClass}>
                  <option value="bonus">Bonus</option>
                  <option value="allowance">Allowance</option>
                  <option value="deduction">Deduction</option>
                  <option value="epf">EPF</option>
                  <option value="socso">SOCSO</option>
                  <option value="pcb">PCB (Tax)</option>
                </select>
              </Field>
              <Field label="Amount (RM)">
                <input type="number" step="0.01" value={bonusAmount} onChange={(e) => setBonusAmount(e.target.value)} className={inputClass} placeholder="0.00" required />
              </Field>
              <Field label="Description">
                <input type="text" value={bonusDesc} onChange={(e) => setBonusDesc(e.target.value)} className={inputClass} placeholder="e.g. Performance bonus Q4" />
              </Field>
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button type="button" onClick={() => setShowBonusModal(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={bonusSubmitting} className="rounded-xl bg-brand-orange px-5 py-2.5 text-sm font-semibold text-white shadow-glow hover:bg-brand-orangeDark disabled:opacity-60">{bonusSubmitting ? "Saving..." : "Save"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-navy/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-card">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-brand-navy">
                  Edit Payroll
                </h2>
                <p className="text-xs text-slate-500">
                  {editing.employees?.first_name} {editing.employees?.last_name}{" "}
                  — {editing.month} {editing.year}
                </p>
              </div>
              <button
                onClick={closeEdit}
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
            <form onSubmit={handleSaveEdit} className="space-y-4 px-6 py-5">
              {editError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                  {editError}
                </div>
              )}
              <div className="rounded-xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Basic Salary
                </p>
                <p className="mt-1 text-lg font-bold text-brand-navy">
                  {formatRM(Number(editing.basic_salary) || 0)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Overtime (RM)">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editOvertime}
                    onChange={(e) => setEditOvertime(e.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label="Deductions (RM)">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editDeductions}
                    onChange={(e) => setEditDeductions(e.target.value)}
                    className={inputClass}
                  />
                </Field>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-brand-orange/20 bg-brand-orange/5 px-4 py-3">
                <span className="text-sm font-medium text-brand-navy">
                  Net Salary
                </span>
                <span className="text-xl font-bold text-brand-orange">
                  {formatRM(liveNetSalary)}
                </span>
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={closeEdit}
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
                  {submitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {payslipTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-navy/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-card">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-brand-navy">Payslip</h2>
                <p className="text-xs text-slate-500">
                  {payslipTarget.month} {payslipTarget.year}
                </p>
              </div>
              <button
                onClick={() => setPayslipTarget(null)}
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
            <div className="space-y-4 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-orange/10 text-sm font-bold text-brand-orange">
                  {`${payslipTarget.employees?.first_name?.[0] ?? ""}${
                    payslipTarget.employees?.last_name?.[0] ?? ""
                  }`.toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-brand-navy">
                    {payslipTarget.employees?.first_name}{" "}
                    {payslipTarget.employees?.last_name}
                  </p>
                  <p className="text-xs text-slate-500">Employee</p>
                </div>
              </div>
              <div className="overflow-hidden rounded-xl border border-slate-100">
                <div className="flex justify-between px-4 py-3">
                  <span className="text-sm text-slate-600">Basic Salary</span>
                  <span className="text-sm font-medium text-brand-navy">
                    {formatRM(Number(payslipTarget.basic_salary) || 0)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-100 px-4 py-3">
                  <span className="text-sm text-slate-600">Overtime</span>
                  <span className="text-sm font-medium text-emerald-600">
                    + {formatRM(Number(payslipTarget.overtime) || 0)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-100 px-4 py-3">
                  <span className="text-sm text-slate-600">Deductions</span>
                  <span className="text-sm font-medium text-red-600">
                    - {formatRM(Number(payslipTarget.deductions) || 0)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-100 bg-brand-orange/5 px-4 py-3">
                  <span className="text-sm font-semibold text-brand-navy">
                    Net Salary
                  </span>
                  <span className="text-sm font-bold text-brand-orange">
                    {formatRM(Number(payslipTarget.net_salary) || 0)}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Status</span>
                <StatusBadge status={payslipTarget.status} />
              </div>
              {payslipTarget.paid_at && (
                <p className="text-center text-xs text-slate-500">
                  Paid on{" "}
                  {new Date(payslipTarget.paid_at).toLocaleDateString("en-MY", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
