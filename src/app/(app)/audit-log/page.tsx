"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import type { AuditLog } from "@/types";

const PAGE_SIZE = 50;

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const truncateId = (id: string | null) => (id ? `${id.slice(0, 8)}…` : "—");

const getActionBadgeStyle = (action: string): string => {
  const a = action.toLowerCase();
  if (a.includes("create") || a.includes("insert") || a.includes("add"))
    return "bg-emerald-50 text-emerald-700";
  if (a.includes("delete") || a.includes("remove") || a.includes("reject"))
    return "bg-red-50 text-red-700";
  if (a.includes("update") || a.includes("edit") || a.includes("modify"))
    return "bg-blue-50 text-blue-700";
  if (a.includes("login") || a.includes("signin") || a.includes("sign-in"))
    return "bg-purple-50 text-purple-700";
  if (a.includes("logout") || a.includes("signout") || a.includes("sign-out"))
    return "bg-slate-100 text-slate-600";
  if (a.includes("approve")) return "bg-emerald-50 text-emerald-700";
  return "bg-slate-100 text-slate-600";
};

const prettyDetails = (details: unknown): string => {
  if (details == null) return "";
  try {
    return typeof details === "string"
      ? details
      : JSON.stringify(details, null, 2);
  } catch {
    return String(details);
  }
};

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
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
      </svg>
    </div>
    <p className="mt-3 text-sm font-medium text-slate-700">{title}</p>
    <p className="mt-1 text-sm text-slate-500">{message}</p>
  </div>
);

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: string;
  iconBg: string;
  accent?: string;
}

const KpiCard = ({ title, value, icon, iconBg, accent }: KpiCardProps) => (
  <div className="rounded-2xl bg-white p-5 shadow-card">
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
    <p className="mt-4 text-sm font-medium text-slate-500">{title}</p>
    <p className={`mt-1 text-2xl font-bold ${accent || "text-brand-navy"}`}>
      {value}
    </p>
  </div>
);

const ActionBadge = ({ action }: { action: string }) => (
  <span
    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${getActionBadgeStyle(
      action
    )}`}
  >
    {action}
  </span>
);

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-brand-navy outline-none transition focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20";

export default function AuditLogPage() {
  const { user } = useAuth();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [totalCount, setTotalCount] = useState(0);
  const [offset, setOffset] = useState(0);

  const [actionFilter, setActionFilter] = useState("all");
  const [tableFilter, setTableFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [actionOptions, setActionOptions] = useState<string[]>([]);
  const [tableOptions, setTableOptions] = useState<string[]>([]);

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtersKey = `${actionFilter}|${tableFilter}|${fromDate}|${toDate}`;

  const fetchLogs = useCallback(
    async (append: boolean) => {
      if (!user) return;
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError(null);
      }

      const from = append ? offset : 0;
      let query = supabase
        .from("audit_logs")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, from + PAGE_SIZE - 1);

      if (actionFilter !== "all") query = query.eq("action", actionFilter);
      if (tableFilter !== "all") query = query.eq("table_name", tableFilter);
      if (fromDate)
        query = query.gte("created_at", `${fromDate}T00:00:00`);
      if (toDate) query = query.lte("created_at", `${toDate}T23:59:59`);

      const { data, error: err, count } = await query;

      if (err) {
        setError("Failed to load audit logs.");
        setLoading(false);
        setLoadingMore(false);
        return;
      }

      const rows = (data as AuditLog[]) || [];
      if (append) {
        setLogs((prev) => [...prev, ...rows]);
        setOffset(from + rows.length);
      } else {
        setLogs(rows);
        setOffset(rows.length);
      }
      if (count != null) setTotalCount(count);
      setLoading(false);
      setLoadingMore(false);
    },
    [user, actionFilter, tableFilter, fromDate, toDate, offset]
  );

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [actionsRes, tablesRes] = await Promise.all([
        supabase.from("audit_logs").select("action").limit(1000),
        supabase.from("audit_logs").select("table_name").limit(1000),
      ]);
      const actions = Array.from(
        new Set(
          (actionsRes.data || [])
            .map((r) => r.action)
            .filter((a): a is string => Boolean(a))
        )
      ).sort();
      const tables = Array.from(
        new Set(
          (tablesRes.data || [])
            .map((r) => r.table_name)
            .filter((t): t is string => Boolean(t))
        )
      ).sort();
      setActionOptions(actions);
      setTableOptions(tables);
    })();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchLogs(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey, user]);

  const hasMore = offset < totalCount;

  const kpis = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todayCount = logs.filter(
      (l) => l.created_at.slice(0, 10) === today
    ).length;
    const uniqueUsers = new Set(
      logs.map((l) => l.user_id).filter(Boolean)
    ).size;

    const actionCounts: Record<string, number> = {};
    for (const l of logs)
      actionCounts[l.action] = (actionCounts[l.action] || 0) + 1;
    const topAction = Object.entries(actionCounts).sort(
      (a, b) => b[1] - a[1]
    )[0];

    return {
      total: totalCount,
      todayCount,
      uniqueUsers,
      topAction: topAction
        ? `${topAction[0]} (${topAction[1]})`
        : "—",
    };
  }, [logs, totalCount]);

  const resetFilters = () => {
    setActionFilter("all");
    setTableFilter("all");
    setFromDate("");
    setToDate("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-navy">Audit Log</h1>
        <p className="text-sm text-slate-500">
          Track system activity and changes across MCX HR.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Total Logs"
          value={kpis.total}
          icon="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6"
          iconBg="bg-brand-orange"
        />
        <KpiCard
          title="Today's Activity"
          value={kpis.todayCount}
          icon="M12 6v6l4 2M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z"
          iconBg="bg-emerald-500"
          accent="text-emerald-600"
        />
        <KpiCard
          title="Unique Users"
          value={kpis.uniqueUsers}
          icon="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm13 14v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
          iconBg="bg-brand-blue"
          accent="text-brand-blue"
        />
        <KpiCard
          title="Top Action"
          value={kpis.topAction}
          icon="M3 3v18h18M7 16V9m5 7V5m5 11v-4"
          iconBg="bg-brand-navy"
        />
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-2xl bg-white p-4 shadow-card">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">
              Action
            </label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className={inputClass}
            >
              <option value="all">All actions</option>
              {actionOptions.map((a) => (
                <option key={a} value={a} className="capitalize">
                  {a}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">
              Table
            </label>
            <select
              value={tableFilter}
              onChange={(e) => setTableFilter(e.target.value)}
              className={inputClass}
            >
              <option value="all">All tables</option>
              {tableOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">
              From date
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">
              To date
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <button
            onClick={resetFilters}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          >
            Reset filters
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-card">
        {loading ? (
          <LoadingSpinner />
        ) : logs.length === 0 ? (
          <EmptyState
            title="No audit logs found"
            message="Try adjusting your filters, or activity will appear here as changes happen."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-4 font-semibold">Timestamp</th>
                  <th className="px-5 py-4 font-semibold">User</th>
                  <th className="px-5 py-4 font-semibold">Action</th>
                  <th className="px-5 py-4 font-semibold">Table</th>
                  <th className="px-5 py-4 font-semibold">Record ID</th>
                  <th className="px-5 py-4 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => {
                  const isExpanded = expandedId === log.id;
                  return (
                    <Fragment key={log.id}>
                      <tr
                        className="cursor-pointer align-top transition hover:bg-slate-50"
                        onClick={() =>
                          setExpandedId(isExpanded ? null : log.id)
                        }
                      >
                        <td className="px-5 py-3.5 whitespace-nowrap text-slate-600">
                          {formatDateTime(log.created_at)}
                        </td>
                        <td className="px-5 py-3.5">
                          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">
                            {truncateId(log.user_id)}
                          </code>
                        </td>
                        <td className="px-5 py-3.5">
                          <ActionBadge action={log.action} />
                        </td>
                        <td className="px-5 py-3.5 text-slate-600">
                          {log.table_name || "—"}
                        </td>
                        <td className="px-5 py-3.5">
                          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">
                            {truncateId(log.record_id)}
                          </code>
                        </td>
                        <td className="px-5 py-3.5">
                          <svg
                            viewBox="0 0 24 24"
                            className={`h-4 w-4 text-slate-400 transition-transform ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="m6 9 6 6 6-6" />
                          </svg>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-slate-50">
                          <td colSpan={6} className="px-5 py-4">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Details (JSON)
                            </p>
                            <pre className="max-h-80 overflow-auto rounded-xl bg-brand-navy p-4 text-xs leading-relaxed text-slate-100">
                              {prettyDetails(log.details) || "{}"}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {logs.length > 0 && (
        <div className="flex flex-col items-center gap-2">
          {hasMore ? (
            <button
              onClick={() => fetchLogs(true)}
              disabled={loadingMore}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-navySoft disabled:opacity-60"
            >
              {loadingMore && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              )}
              {loadingMore ? "Loading..." : "Load more"}
            </button>
          ) : (
            <p className="text-sm text-slate-400">
              Showing all {totalCount} log{totalCount === 1 ? "" : "s"}
            </p>
          )}
          <p className="text-xs text-slate-400">
            Showing {logs.length} of {totalCount}
          </p>
        </div>
      )}
    </div>
  );
}
