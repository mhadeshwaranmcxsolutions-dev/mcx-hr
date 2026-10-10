"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import type { Employee, Attendance, LeaveRequest, Department, Announcement } from "@/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const DONUT_COLORS = [
  "#FF7A00",
  "#0B1F3A",
  "#0A66C2",
  "#13315C",
  "#FF9A3D",
  "#38BDF8",
  "#64748B",
  "#22C55E",
];

const formatRM = (value: number) =>
  new Intl.NumberFormat("ms-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 2,
  }).format(value);

const toISODate = (d: Date) => d.toISOString().slice(0, 10);

const todayISO = () => toISODate(new Date());

const daysAgoISO = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return toISODate(d);
};

const weekdayLabel = (dateStr: string) =>
  new Date(dateStr + "T00:00:00").toLocaleDateString("en-MY", {
    weekday: "short",
  });

interface DashboardData {
  employees: (Employee & { departments?: { name: string } | null })[];
  attendance: Attendance[];
  leaveRequests: LeaveRequest[];
  departments: Department[];
  announcements: Announcement[];
}

const KpiCard = ({
  title,
  value,
  icon,
  iconBg,
  trend,
  trendUp,
  trendNeutral,
}: {
  title: string;
  value: string | number;
  icon: string;
  iconBg: string;
  trend: string;
  trendUp?: boolean;
  trendNeutral?: boolean;
}) => {
  const trendColor = trendNeutral
    ? "text-slate-500 bg-slate-100"
    : trendUp
      ? "text-emerald-700 bg-emerald-50"
      : "text-red-700 bg-red-50";
  return (
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
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${trendColor}`}
        >
          {!trendNeutral && (
            <svg
              viewBox="0 0 24 24"
              className={`h-3 w-3 ${trendUp ? "" : "rotate-180"}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          )}
          {trend}
        </span>
      </div>
      <p className="mt-4 text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-1 text-3xl font-bold text-brand-navy">{value}</p>
    </div>
  );
};

const SkeletonCard = () => (
  <div className="rounded-2xl bg-white p-5 shadow-card">
    <div className="flex items-start justify-between">
      <div className="h-11 w-11 animate-pulse rounded-xl bg-slate-200" />
      <div className="h-6 w-16 animate-pulse rounded-full bg-slate-200" />
    </div>
    <div className="mt-4 h-4 w-24 animate-pulse rounded bg-slate-200" />
    <div className="mt-3 h-8 w-20 animate-pulse rounded bg-slate-200" />
  </div>
);

const NoData = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
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
        <path d="M3 3v18h18M7 14l4-4 4 4 5-5" />
      </svg>
    </div>
    <p className="mt-3 text-sm font-medium text-slate-500">{message}</p>
  </div>
);

const LoadingSpinner = () => (
  <div className="flex min-h-[60vh] items-center justify-center">
    <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-brand-orange" />
  </div>
);

const statusStyles: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700",
  inactive: "bg-slate-100 text-slate-600",
  on_leave: "bg-amber-50 text-amber-700",
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const { role } = useAuth();
  const [showAnnounce, setShowAnnounce] = useState(false);
  const [annTitle, setAnnTitle] = useState("");
  const [annContent, setAnnContent] = useState("");
  const [annSubmitting, setAnnSubmitting] = useState(false);

  const postAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annContent.trim()) return;
    setAnnSubmitting(true);
    const { error } = await supabase.from("announcements").insert({
      title: annTitle.trim(),
      content: annContent.trim(),
    });
    setAnnSubmitting(false);
    if (!error) {
      setAnnTitle("");
      setAnnContent("");
      setShowAnnounce(false);
      setData((prev) => prev ? { ...prev, announcements: [{ id: crypto.randomUUID(), title: annTitle.trim(), content: annContent.trim(), created_by: null, created_at: new Date().toISOString() }, ...prev.announcements].slice(0, 3) } : prev);
    }
  };

  useEffect(() => {
    let active = true;

    const fetchData = async () => {
      setLoading(true);
      const startDate = daysAgoISO(6);
      const endDate = todayISO();

      const [
        { data: employees, error: empErr },
        { data: attendance, error: attErr },
        { data: leaveRequests, error: leaveErr },
        { data: departments, error: deptErr },
        { data: announcements, error: annErr },
      ] = await Promise.all([
        supabase
          .from("employees")
          .select("*, departments(name)")
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("attendance")
          .select("*")
          .gte("date", startDate)
          .lte("date", endDate),
        supabase.from("leave_requests").select("*"),
        supabase.from("departments").select("*"),
        supabase
          .from("announcements")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(3),
      ]);

      if (empErr || attErr || leaveErr || deptErr || annErr) {
        if (active) setLoading(false);
        return;
      }

      if (active) {
        setData({
          employees: employees as DashboardData["employees"],
          attendance: attendance as Attendance[],
          leaveRequests: leaveRequests as LeaveRequest[],
          departments: departments as Department[],
          announcements: announcements as Announcement[],
        });
        setLoading(false);
      }
    };

    fetchData();
    return () => {
      active = false;
    };
  }, []);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <LoadingSpinner />
      </div>
    );
  }

  const { employees, attendance, leaveRequests, departments, announcements } = data;
  const today = todayISO();
  const yesterday = daysAgoISO(1);

  const totalEmployees = employees.length;

  const attendanceToday = attendance.filter((a) => a.date === today);
  const presentToday = attendanceToday.filter(
    (a) => a.status === "present" || a.status === "late"
  ).length;
  const onLeaveToday = attendanceToday.filter(
    (a) => a.status === "on_leave"
  ).length;

  const attendanceYesterday = attendance.filter((a) => a.date === yesterday);
  const presentYesterday = attendanceYesterday.filter(
    (a) => a.status === "present" || a.status === "late"
  ).length;
  const onLeaveYesterday = attendanceYesterday.filter(
    (a) => a.status === "on_leave"
  ).length;

  const pendingRequests = leaveRequests.filter(
    (r) => r.status === "pending"
  ).length;
  const totalLeaveRequests = leaveRequests.length;
  const pendingPct =
    totalLeaveRequests > 0
      ? Math.round((pendingRequests / totalLeaveRequests) * 100)
      : 0;

  const presentDelta = presentToday - presentYesterday;
  const onLeaveDelta = onLeaveToday - onLeaveYesterday;

  const weekDays = Array.from({ length: 7 }, (_, i) => daysAgoISO(6 - i));
  const attendanceChart = weekDays.map((day) => {
    const dayRecords = attendance.filter((a) => a.date === day);
    return {
      day: weekdayLabel(day),
      Present: dayRecords.filter(
        (a) => a.status === "present" || a.status === "late"
      ).length,
      Absent: dayRecords.filter(
        (a) => a.status === "absent" || a.status === "on_leave"
      ).length,
    };
  });

  const deptMap = new Map(departments.map((d) => [d.id, d.name]));
  const deptCounts = new Map<string, number>();
  employees.forEach((emp) => {
    const name =
      (emp.department_id && deptMap.get(emp.department_id)) || "Unassigned";
    deptCounts.set(name, (deptCounts.get(name) || 0) + 1);
  });
  const departmentChart = Array.from(deptCounts.entries()).map(
    ([name, value]) => ({ name, value })
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Total Employees"
          value={totalEmployees}
          icon="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm13 14v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
          iconBg="bg-brand-orange"
          trend={`${employees.filter((e) => e.status === "active").length} active`}
          trendNeutral
        />
        <KpiCard
          title="Present Today"
          value={presentToday}
          icon="M9 12l2 2 4-4M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z"
          iconBg="bg-emerald-500"
          trend={`${presentDelta >= 0 ? "+" : ""}${presentDelta} vs yesterday`}
          trendUp={presentDelta >= 0}
        />
        <KpiCard
          title="On Leave"
          value={onLeaveToday}
          icon="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
          iconBg="bg-amber-500"
          trend={`${onLeaveDelta >= 0 ? "+" : ""}${onLeaveDelta} vs yesterday`}
          trendUp={onLeaveDelta < 0}
        />
        <KpiCard
          title="Pending Leave Requests"
          value={pendingRequests}
          icon="M12 6v6l4 2M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z"
          iconBg="bg-brand-navy"
          trend={`${pendingPct}% of requests`}
          trendNeutral
        />
      </div>

      {announcements.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-r from-brand-navy to-slate-800 p-5 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-brand-orange" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 11l18-5v12L3 14v-3zM11.6 16.8a3 3 0 1 1-5.8-1.6" />
              </svg>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">Announcements</h2>
            </div>
            {(role === "admin" || role === "hr") && (
              <button onClick={() => setShowAnnounce(true)} className="rounded-lg bg-brand-orange px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-orangeDark">
                + Post
              </button>
            )}
          </div>
          <div className="space-y-2">
            {announcements.map((a) => (
              <div key={a.id} className="rounded-xl bg-white/5 p-3">
                <p className="text-sm font-semibold text-white">{a.title}</p>
                <p className="mt-1 text-sm text-slate-300 line-clamp-2">{a.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {announcements.length === 0 && (role === "admin" || role === "hr") && (
        <div className="rounded-2xl bg-gradient-to-r from-brand-navy to-slate-800 p-5 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-brand-orange" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 11l18-5v12L3 14v-3zM11.6 16.8a3 3 0 1 1-5.8-1.6" />
              </svg>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">Announcements</h2>
            </div>
            <button onClick={() => setShowAnnounce(true)} className="rounded-lg bg-brand-orange px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-orangeDark">
              + Post
            </button>
          </div>
          <p className="text-sm text-slate-400">No announcements yet. Post your first company update.</p>
        </div>
      )}

      {showAnnounce && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-navy/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-card">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-bold text-brand-navy">Post Announcement</h2>
              <button onClick={() => setShowAnnounce(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={postAnnouncement} className="space-y-4 px-6 py-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Title</label>
                <input value={annTitle} onChange={(e) => setAnnTitle(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20" placeholder="Announcement title" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Content</label>
                <textarea value={annContent} onChange={(e) => setAnnContent(e.target.value)} rows={4} className="w-full resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20" placeholder="Write your announcement..." />
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button type="button" onClick={() => setShowAnnounce(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={annSubmitting} className="rounded-xl bg-brand-orange px-5 py-2.5 text-sm font-semibold text-white shadow-glow hover:bg-brand-orangeDark disabled:opacity-60">{annSubmitting ? "Posting..." : "Post"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl bg-white p-6 shadow-card lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-brand-navy">
                Attendance Overview
              </h2>
              <p className="text-sm text-slate-500">Last 7 days</p>
            </div>
          </div>
          {attendanceChart.every((d) => d.Present === 0 && d.Absent === 0) ? (
            <NoData message="No attendance records for the last 7 days" />
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={attendanceChart}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#E2E8F0"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 12, fill: "#64748B" }}
                    axisLine={{ stroke: "#E2E8F0" }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 12, fill: "#64748B" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #E2E8F0",
                      boxShadow: "0 4px 20px -6px rgba(11,31,58,0.12)",
                      fontSize: 12,
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                    iconType="circle"
                  />
                  <Bar
                    dataKey="Present"
                    stackId="a"
                    fill="#10B981"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="Absent"
                    stackId="a"
                    fill="#F87171"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-card">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-brand-navy">
              Department Distribution
            </h2>
            <p className="text-sm text-slate-500">Employees by department</p>
          </div>
          {departmentChart.length === 0 ? (
            <NoData message="No department data available" />
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={departmentChart}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {departmentChart.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={DONUT_COLORS[index % DONUT_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #E2E8F0",
                      boxShadow: "0 4px 20px -6px rgba(11,31,58,0.12)",
                      fontSize: 12,
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 12 }}
                    iconType="circle"
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-brand-navy">
              Recent Employees
            </h2>
            <p className="text-sm text-slate-500">
              Latest additions to the team
            </p>
          </div>
        </div>
        {employees.length === 0 ? (
          <NoData message="No employees found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Department</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Salary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.slice(0, 8).map((emp) => {
                  const initials = `${emp.first_name[0] ?? ""}${
                    emp.last_name[0] ?? ""
                  }`.toUpperCase();
                  return (
                    <tr
                      key={emp.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-orange/10 text-xs font-bold text-brand-orange">
                            {initials}
                          </div>
                          <span className="font-medium text-brand-navy">
                            {emp.first_name} {emp.last_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{emp.email}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {emp.departments?.name || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                            statusStyles[emp.status] ||
                            "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {emp.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700">
                        {formatRM(Number(emp.salary) || 0)}
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
  );
}
