"use client";

import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import type {
  Employee,
  Attendance,
  LeaveRequest,
  Payroll,
  ExpenseClaim,
  PerformanceReview,
} from "@/types";
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
  LineChart,
  Line,
} from "recharts";

const BRAND_ORANGE = "#FF7A00";
const BRAND_NAVY = "#0B1F3A";

const LEAVE_COLORS: Record<string, string> = {
  annual: "#FF7A00",
  sick: "#0B1F3A",
  personal: "#0A66C2",
  unpaid: "#64748B",
};

const formatRM = (value: number) =>
  new Intl.NumberFormat("ms-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 2,
  }).format(value);

interface ReportsData {
  employees: (Employee & { departments?: { name: string } | null })[];
  attendance: Attendance[];
  leaveRequests: LeaveRequest[];
  payroll: Payroll[];
  expenseClaims: ExpenseClaim[];
  performanceReviews: PerformanceReview[];
}

const KpiCard = ({
  title,
  value,
  icon,
  iconBg,
  badge,
  badgeTone = "neutral",
}: {
  title: string;
  value: string | number;
  icon: string;
  iconBg: string;
  badge?: string;
  badgeTone?: "neutral" | "up" | "down";
}) => {
  const badgeColor =
    badgeTone === "up"
      ? "text-emerald-700 bg-emerald-50"
      : badgeTone === "down"
        ? "text-red-700 bg-red-50"
        : "text-slate-600 bg-slate-100";

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
        {badge ? (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${badgeColor}`}
          >
            {badge}
          </span>
        ) : null}
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
  <div className="flex min-h-[40vh] items-center justify-center">
    <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-brand-orange" />
  </div>
);

const SectionCard = ({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) => (
  <div className="rounded-2xl bg-white p-6 shadow-card">
    <div className="mb-4">
      <h2 className="text-lg font-bold text-brand-navy">{title}</h2>
      {subtitle ? (
        <p className="text-sm text-slate-500">{subtitle}</p>
      ) : null}
    </div>
    {children}
  </div>
);

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid #E2E8F0",
  boxShadow: "0 4px 20px -6px rgba(11,31,58,0.12)",
  fontSize: 12,
};

export default function ReportsPage() {
  const { session } = useAuth();
  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [month, setMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const [year, monthNum] = month.split("-").map(Number);
  const monthStart = `${month}-01`;
  const daysInMonth = new Date(year, monthNum, 0).getDate();
  const monthEnd = `${month}-${String(daysInMonth).padStart(2, "0")}`;
  const nextMonthDate = new Date(year, monthNum, 1);
  const nextMonthStartISO = `${nextMonthDate.getFullYear()}-${String(
    nextMonthDate.getMonth() + 1
  ).padStart(2, "0")}-01`;
  const monthLabel = new Date(year, monthNum - 1, 1).toLocaleDateString("en-MY", {
    month: "long",
    year: "numeric",
  });

  const changeMonth = (delta: number) => {
    const d = new Date(year, monthNum - 1 + delta, 1);
    setMonth(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    );
  };

  useEffect(() => {
    let active = true;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      const [
        { data: employees, error: empErr },
        { data: attendance, error: attErr },
        { data: leaveRequests, error: leaveErr },
        { data: payroll, error: payrollErr },
        { data: expenseClaims, error: expErr },
        { data: performanceReviews, error: perfErr },
      ] = await Promise.all([
        supabase.from("employees").select("*, departments(name)"),
        supabase
          .from("attendance")
          .select("*")
          .gte("date", monthStart)
          .lte("date", monthEnd),
        supabase
          .from("leave_requests")
          .select("*")
          .gte("created_at", monthStart)
          .lt("created_at", nextMonthStartISO),
        supabase
          .from("payroll")
          .select("*")
          .eq("month", monthNum)
          .eq("year", year),
        supabase
          .from("expense_claims")
          .select("*")
          .gte("created_at", monthStart)
          .lt("created_at", nextMonthStartISO),
        supabase
          .from("performance_reviews")
          .select("*")
          .gte("created_at", monthStart)
          .lt("created_at", nextMonthStartISO),
      ]);

      if (empErr || attErr || leaveErr || payrollErr || expErr || perfErr) {
        if (active) {
          setError("Failed to load reports data. Please try again.");
          setLoading(false);
        }
        return;
      }

      if (active) {
        setData({
          employees: employees as ReportsData["employees"],
          attendance: attendance as Attendance[],
          leaveRequests: leaveRequests as LeaveRequest[],
          payroll: payroll as Payroll[],
          expenseClaims: expenseClaims as ExpenseClaim[],
          performanceReviews: performanceReviews as PerformanceReview[],
        });
        setLoading(false);
      }
    };

    fetchData();
    return () => {
      active = false;
    };
  }, [monthStart, monthEnd, nextMonthStartISO, monthNum, year, session]);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-brand-navy">Reports</h1>
            <p className="text-sm text-slate-500">Analytics overview</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-brand-navy">Reports</h1>
        <div className="rounded-2xl bg-white p-8 text-center shadow-card">
          <p className="text-sm font-medium text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  const { employees, attendance, leaveRequests, payroll, expenseClaims, performanceReviews } =
    data;

  const headcount = employees.length;
  const activeEmployees = employees.filter((e) => e.status === "active").length;
  const newHires = employees.filter(
    (e) => e.hire_date >= monthStart && e.hire_date <= monthEnd
  ).length;
  const totalPayroll = payroll.reduce((sum, p) => sum + (p.net_salary || 0), 0);
  const totalExpenses = expenseClaims.reduce(
    (sum, c) => sum + (c.amount || 0),
    0
  );
  const avgRating =
    performanceReviews.length > 0
      ? performanceReviews.reduce((sum, r) => sum + (r.rating || 0), 0) /
        performanceReviews.length
      : 0;
  const leaveRequestsThisMonth = leaveRequests.length;
  const presentRecords = attendance.filter(
    (a) => a.status === "present" || a.status === "late"
  ).length;
  const attendanceRate =
    attendance.length > 0 ? (presentRecords / attendance.length) * 100 : 0;

  const empDeptMap = new Map(
    employees.map((e) => [e.id, e.departments?.name || "Unassigned"])
  );

  const deptCounts = new Map<string, number>();
  employees.forEach((emp) => {
    const name = emp.departments?.name || "Unassigned";
    deptCounts.set(name, (deptCounts.get(name) || 0) + 1);
  });
  const headcountByDept = Array.from(deptCounts.entries()).map(
    ([name, value]) => ({ name, value })
  );

  const payrollByDept = new Map<string, number>();
  payroll.forEach((p) => {
    const dept = empDeptMap.get(p.employee_id) || "Unassigned";
    payrollByDept.set(dept, (payrollByDept.get(dept) || 0) + (p.net_salary || 0));
  });
  const payrollByDeptChart = Array.from(payrollByDept.entries()).map(
    ([name, value]) => ({ name, value })
  );

  const leaveTypeCounts = new Map<string, number>();
  leaveRequests.forEach((r) => {
    leaveTypeCounts.set(r.type, (leaveTypeCounts.get(r.type) || 0) + 1);
  });
  const leaveBreakdown = Array.from(leaveTypeCounts.entries()).map(
    ([name, value]) => ({ name, value })
  );

  const attendanceTrend = Array.from({ length: daysInMonth }, (_, i) => {
    const day = String(i + 1).padStart(2, "0");
    const dateStr = `${month}-${day}`;
    const dayRecords = attendance.filter((a) => a.date === dateStr);
    return {
      day: String(i + 1),
      present: dayRecords.filter(
        (a) => a.status === "present" || a.status === "late"
      ).length,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">Reports</h1>
          <p className="text-sm text-slate-500">
            Analytics overview for {monthLabel}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => changeMonth(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-brand-navy transition hover:bg-slate-50"
            aria-label="Previous month"
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
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-brand-navy outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
          />
          <button
            type="button"
            onClick={() => changeMonth(1)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-brand-navy transition hover:bg-slate-50"
            aria-label="Next month"
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
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Headcount"
          value={headcount}
          icon="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm13 14v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
          iconBg="bg-brand-orange"
          badge={`${activeEmployees} active`}
        />
        <KpiCard
          title="Active Employees"
          value={activeEmployees}
          icon="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm13 5-2 2-4-4"
          iconBg="bg-emerald-500"
          badge={`${headcount > 0 ? Math.round((activeEmployees / headcount) * 100) : 0}% of total`}
        />
        <KpiCard
          title="New Hires This Month"
          value={newHires}
          icon="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm19 6v6m-3-3h6"
          iconBg="bg-brand-navy"
          badge={monthLabel}
        />
        <KpiCard
          title="Total Payroll"
          value={formatRM(totalPayroll)}
          icon="M21 12V7H5a2 2 0 0 1 0-4h14v4M3 5v14a2 2 0 0 0 2 2h16v-5M18 12a2 2 0 0 0 0 4h4v-4Z"
          iconBg="bg-brand-blue"
          badge={`${payroll.length} records`}
        />
        <KpiCard
          title="Total Expenses"
          value={formatRM(totalExpenses)}
          icon="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1ZM8 7h8M8 11h8M8 15h5"
          iconBg="bg-amber-500"
          badge={`${expenseClaims.length} claims`}
        />
        <KpiCard
          title="Avg Performance Rating"
          value={performanceReviews.length > 0 ? avgRating.toFixed(2) : "—"}
          icon="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2Z"
          iconBg="bg-yellow-500"
          badge={`${performanceReviews.length} reviews`}
        />
        <KpiCard
          title="Leave Requests This Month"
          value={leaveRequestsThisMonth}
          icon="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm9 12-2 2-4-4"
          iconBg="bg-rose-500"
          badge={`${leaveRequests.filter((r) => r.status === "pending").length} pending`}
          badgeTone={
            leaveRequests.filter((r) => r.status === "pending").length > 0
              ? "down"
              : "neutral"
          }
        />
        <KpiCard
          title="Attendance Rate"
          value={`${attendanceRate.toFixed(1)}%`}
          icon="M22 12h-4l-3 9L9 3l-3 9H2"
          iconBg="bg-brand-navy"
          badge={`${presentRecords} present`}
          badgeTone={attendanceRate >= 80 ? "up" : "down"}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard
          title="Headcount by Department"
          subtitle="Number of employees per department"
        >
          {headcountByDept.length === 0 ? (
            <NoData message="No employee data available" />
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={headcountByDept}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#E2E8F0"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12, fill: "#64748B" }}
                    axisLine={{ stroke: "#E2E8F0" }}
                    tickLine={false}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 12, fill: "#64748B" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    cursor={{ fill: "rgba(255,122,0,0.08)" }}
                  />
                  <Bar
                    dataKey="value"
                    name="Employees"
                    fill={BRAND_ORANGE}
                    radius={[6, 6, 0, 0]}
                    maxBarSize={48}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Payroll by Department"
          subtitle={`Total net salary for ${monthLabel}`}
        >
          {payrollByDeptChart.length === 0 ? (
            <NoData message="No payroll records for this month" />
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={payrollByDeptChart}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#E2E8F0"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12, fill: "#64748B" }}
                    axisLine={{ stroke: "#E2E8F0" }}
                    tickLine={false}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "#64748B" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) =>
                      `RM${(v / 1000).toFixed(0)}k`
                    }
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: number) => formatRM(value)}
                    cursor={{ fill: "rgba(11,31,58,0.06)" }}
                  />
                  <Bar
                    dataKey="value"
                    name="Net Salary"
                    fill={BRAND_NAVY}
                    radius={[6, 6, 0, 0]}
                    maxBarSize={48}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard
          title="Leave Breakdown"
          subtitle="Leave requests by type"
        >
          {leaveBreakdown.length === 0 ? (
            <NoData message="No leave requests for this month" />
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={leaveBreakdown}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {leaveBreakdown.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={LEAVE_COLORS[entry.name] || "#94A3B8"}
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend
                    wrapperStyle={{ fontSize: 12, textTransform: "capitalize" }}
                    iconType="circle"
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Attendance Trend"
          subtitle={`Daily present count for ${monthLabel}`}
        >
          {attendanceTrend.every((d) => d.present === 0) ? (
            <NoData message="No attendance records for this month" />
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={attendanceTrend}
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
                    interval={daysInMonth > 20 ? 2 : 0}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 12, fill: "#64748B" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelFormatter={(label: string) => `Day ${label}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="present"
                    name="Present"
                    stroke={BRAND_ORANGE}
                    strokeWidth={3}
                    dot={{ r: 3, fill: BRAND_ORANGE }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
