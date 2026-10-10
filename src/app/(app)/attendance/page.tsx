"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import type { Attendance, Employee } from "@/types";

interface AttendanceWithEmployee extends Attendance {
  employees: { first_name: string; last_name: string } | null;
}

type AttendanceStatus = Attendance["status"];

const statusStyles: Record<AttendanceStatus, string> = {
  present: "bg-emerald-50 text-emerald-700",
  absent: "bg-red-50 text-red-700",
  late: "bg-amber-50 text-amber-700",
  on_leave: "bg-blue-50 text-blue-700",
};

const toISODate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const todayISO = () => toISODate(new Date());

const getWeekRange = () => {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: toISODate(monday), end: toISODate(sunday) };
};

const formatTime = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleTimeString("en-MY", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

const formatDuration = (clockIn: string | null, clockOut: string | null) => {
  if (!clockIn || !clockOut) return clockIn ? "In progress" : "—";
  const diff = new Date(clockOut).getTime() - new Date(clockIn).getTime();
  if (diff <= 0) return "—";
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  return `${hours}h ${minutes}m`;
};

const StatusBadge = ({ status }: { status: AttendanceStatus }) => (
  <span
    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
      statusStyles[status] || "bg-slate-100 text-slate-600"
    }`}
  >
    {status.replace("_", " ")}
  </span>
);

const StatCard = ({
  label,
  value,
  iconBg,
  icon,
}: {
  label: string;
  value: number;
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
        <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
      </svg>
    </div>
    <p className="mt-3 text-sm font-medium text-slate-700">{title}</p>
    <p className="mt-1 text-sm text-slate-500">{message}</p>
  </div>
);

export default function AttendancePage() {
  const { user } = useAuth();

  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [clocking, setClocking] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [dateAttendance, setDateAttendance] = useState<AttendanceWithEmployee[]>(
    []
  );
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);

  const [weekSummary, setWeekSummary] = useState<
    Record<AttendanceStatus, number>
  >({ present: 0, absent: 0, late: 0, on_leave: 0 });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAll = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    const today = todayISO();
    const { start: weekStart, end: weekEnd } = getWeekRange();

    const [
      empRes,
      todayAttRes,
      dateAttRes,
      allEmpRes,
      weekRes,
    ] = await Promise.all([
      supabase
        .from("employees")
        .select("*")
        .eq("email", user.email)
        .maybeSingle(),
      supabase
        .from("attendance")
        .select("*")
        .eq("date", today)
        .maybeSingle(),
      supabase
        .from("attendance")
        .select("*, employees(first_name, last_name)")
        .eq("date", selectedDate)
        .order("created_at", { ascending: true }),
      supabase
        .from("employees")
        .select("*")
        .eq("status", "active")
        .order("first_name"),
      supabase
        .from("attendance")
        .select("status")
        .gte("date", weekStart)
        .lte("date", weekEnd),
    ]);

    if (empRes.error) {
      setError("Failed to load your employee record.");
      setLoading(false);
      return;
    }

    const employee = empRes.data as Employee | null;
    setCurrentEmployee(employee);

    if (employee && todayAttRes.data) {
      const record = (todayAttRes.data as Attendance[]).find(
        (a) => a.employee_id === employee.id
      );
      setTodayAttendance(record || null);
    } else {
      setTodayAttendance(null);
    }

    setDateAttendance(
      (dateAttRes.data as AttendanceWithEmployee[]) || []
    );
    setAllEmployees((allEmpRes.data as Employee[]) || []);

    const weekCounts: Record<AttendanceStatus, number> = {
      present: 0,
      absent: 0,
      late: 0,
      on_leave: 0,
    };
    (weekRes.data as { status: AttendanceStatus }[] | null)?.forEach((r) => {
      if (r.status in weekCounts) weekCounts[r.status]++;
    });
    setWeekSummary(weekCounts);

    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, [user, selectedDate]);

  const handleClockIn = async () => {
    if (!currentEmployee) return;
    setClocking(true);
    setActionError(null);

    const now = new Date();
    const isLate = now.getHours() >= 9;
    const status: AttendanceStatus = isLate ? "late" : "present";

    const { data, error } = await supabase
      .from("attendance")
      .insert({
        employee_id: currentEmployee.id,
        date: todayISO(),
        clock_in: now.toISOString(),
        status,
      })
      .select()
      .single();

    if (error) {
      setActionError(error.message);
      setClocking(false);
      return;
    }

    setTodayAttendance(data as Attendance);
    setClocking(false);
    loadAll();
  };

  const handleClockOut = async () => {
    if (!todayAttendance) return;
    setClocking(true);
    setActionError(null);

    const { data, error } = await supabase
      .from("attendance")
      .update({ clock_out: new Date().toISOString() })
      .eq("id", todayAttendance.id)
      .select()
      .single();

    if (error) {
      setActionError(error.message);
      setClocking(false);
      return;
    }

    setTodayAttendance(data as Attendance);
    setClocking(false);
    loadAll();
  };

  const tableRows = useMemo(() => {
    const byEmployee = new Map(dateAttendance.map((a) => [a.employee_id, a]));
    return allEmployees.map((emp) => {
      const att = byEmployee.get(emp.id) || null;
      const status: AttendanceStatus = att?.status || "absent";
      return {
        employee: emp,
        attendance: att,
        status,
      };
    });
  }, [allEmployees, dateAttendance]);

  const clockedIn = !!todayAttendance?.clock_in;
  const clockedOut = !!todayAttendance?.clock_out;

  const todayLabel = new Date().toLocaleDateString("en-MY", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-navy">Attendance</h1>
        <p className="text-sm text-slate-500">
          Clock in and out, and track your team&apos;s attendance.
        </p>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-card">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-orange/10">
              <svg
                viewBox="0 0 24 24"
                className="h-7 w-7 text-brand-orange"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 6v6l4 2" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Today
              </p>
              <p className="text-xl font-bold text-brand-navy">{todayLabel}</p>
              <p className="mt-1 text-sm font-medium text-slate-600">
                {!clockedIn
                  ? "Not clocked in"
                  : clockedOut
                    ? `Clocked out at ${formatTime(todayAttendance!.clock_out)}`
                    : `Clocked in at ${formatTime(todayAttendance!.clock_in)}`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {!currentEmployee ? (
              <p className="text-sm text-slate-500">
                No employee record linked to your account.
              </p>
            ) : clockedOut ? (
              <span className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700">
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                You&apos;re clocked out for today
              </span>
            ) : clockedIn ? (
              <button
                onClick={handleClockOut}
                disabled={clocking}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-navy px-6 py-3 text-sm font-semibold text-white shadow-card transition hover:bg-brand-navyDeep disabled:opacity-60"
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
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                </svg>
                {clocking ? "Clock out..." : "Clock Out"}
              </button>
            ) : (
              <button
                onClick={handleClockIn}
                disabled={clocking}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-orange px-6 py-3 text-sm font-semibold text-white shadow-glow transition hover:bg-brand-orangeDark disabled:opacity-60"
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
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />
                </svg>
                {clocking ? "Clock in..." : "Clock In"}
              </button>
            )}
          </div>
        </div>

        {todayAttendance && (
          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-100 pt-6 sm:grid-cols-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Clock In
              </p>
              <p className="mt-1 text-lg font-semibold text-brand-navy">
                {formatTime(todayAttendance.clock_in)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Clock Out
              </p>
              <p className="mt-1 text-lg font-semibold text-brand-navy">
                {formatTime(todayAttendance.clock_out)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Duration
              </p>
              <p className="mt-1 text-lg font-semibold text-brand-navy">
                {formatDuration(
                  todayAttendance.clock_in,
                  todayAttendance.clock_out
                )}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Status
              </p>
              <div className="mt-1">
                <StatusBadge status={todayAttendance.status} />
              </div>
            </div>
          </div>
        )}

        {actionError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {actionError}
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-card">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-brand-navy">
              Team Attendance
            </h2>
            <p className="text-sm text-slate-500">
              Attendance records for all employees.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-600">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-brand-navy outline-none transition focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
            />
          </div>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : tableRows.length === 0 ? (
          <EmptyState
            title="No employees found"
            message="There are no active employees to display."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-4 font-semibold">Employee</th>
                  <th className="px-5 py-4 font-semibold">Clock In</th>
                  <th className="px-5 py-4 font-semibold">Clock Out</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 font-semibold">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tableRows.map(({ employee, attendance, status }) => {
                  const initials = `${employee.first_name[0] ?? ""}${
                    employee.last_name[0] ?? ""
                  }`.toUpperCase();
                  return (
                    <tr
                      key={employee.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-orange/10 text-xs font-bold text-brand-orange">
                            {initials}
                          </div>
                          <span className="font-medium text-brand-navy">
                            {employee.first_name} {employee.last_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        {formatTime(attendance?.clock_in || null)}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        {formatTime(attendance?.clock_out || null)}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={status} />
                      </td>
                      <td className="px-5 py-3.5 font-medium text-slate-700">
                        {formatDuration(
                          attendance?.clock_in || null,
                          attendance?.clock_out || null
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-card">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-brand-navy">Weekly Summary</h2>
          <p className="text-sm text-slate-500">
            Attendance counts for the current week.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Present"
            value={weekSummary.present}
            iconBg="bg-emerald-500"
            icon="M20 6 9 17l-5-5"
          />
          <StatCard
            label="Late"
            value={weekSummary.late}
            iconBg="bg-amber-500"
            icon="M12 6v6l4 2M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z"
          />
          <StatCard
            label="Absent"
            value={weekSummary.absent}
            iconBg="bg-red-500"
            icon="M18 6 6 18M6 6l12 12"
          />
          <StatCard
            label="On Leave"
            value={weekSummary.on_leave}
            iconBg="bg-blue-500"
            icon="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
          />
        </div>
      </div>
    </div>
  );
}
