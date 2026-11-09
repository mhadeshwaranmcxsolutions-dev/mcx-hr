"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import type { Announcement, Attendance, Employee, LeaveBalance, PublicHoliday } from "@/types";

type EmployeeWithOrganization = Employee & {
  departments?: { name: string } | null;
  positions?: { title: string } | null;
};

const localDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDate = (
  value: string,
  options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
  }
) => new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString("en-MY", options);

const formatTime = (value: string) =>
  new Date(value).toLocaleTimeString("en-MY", { hour: "numeric", minute: "2-digit" });

const quickLinks = [
  { href: "/attendance", label: "Attendance", description: "Clock in or review your day", icon: "M12 8v4l3 3M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z", color: "bg-emerald-50 text-emerald-700" },
  { href: "/leave", label: "Request leave", description: "Plan time away", icon: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z", color: "bg-orange-50 text-brand-orange" },
  { href: "/payroll", label: "Payroll", description: "View payslips and pay history", icon: "M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6", color: "bg-blue-50 text-blue-700" },
  { href: "/employees", label: "People directory", description: "Find a teammate", icon: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75", color: "bg-violet-50 text-violet-700" },
];

export default function LandingPage() {
  const { user, role } = useAuth();
  const [employee, setEmployee] = useState<EmployeeWithOrganization | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null);
  const [holiday, setHoliday] = useState<PublicHoliday | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [todayLabel, setTodayLabel] = useState("");
  const [greeting, setGreeting] = useState("Welcome");

  useEffect(() => {
    if (!user?.email) {
      setLoading(false);
      return;
    }
    let active = true;
    const load = async () => {
      setLoading(true);
      setLoadError("");
      const now = new Date();
      const today = localDateKey(now);
      setTodayLabel(now.toLocaleDateString("en-MY", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }));
      setGreeting(now.getHours() < 12 ? "Good morning" : now.getHours() < 18 ? "Good afternoon" : "Good evening");

      const [
        { data: emp, error: employeeError },
        { data: ann, error: announcementError },
        { data: nextHoliday, error: holidayError },
      ] = await Promise.all([
        supabase
          .from("employees")
          .select("*, departments(name), positions(title)")
          .eq("email", user.email)
          .maybeSingle(),
        supabase
          .from("announcements")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(4),
        supabase
          .from("public_holidays")
          .select("*")
          .gte("date", today)
          .order("date", { ascending: true })
          .limit(1)
          .maybeSingle(),
      ]);

      if (!active) return;
      setEmployee((emp as EmployeeWithOrganization | null) || null);
      setAnnouncements((ann as Announcement[]) || []);
      setHoliday((nextHoliday as PublicHoliday | null) || null);

      let hasError = Boolean(employeeError || announcementError || holidayError);
      if (emp) {
        const [{ data: attendanceData, error: attendanceError }, { data: balanceData, error: balanceError }] = await Promise.all([
          supabase
            .from("attendance")
            .select("*")
            .eq("employee_id", emp.id)
            .eq("date", today)
            .maybeSingle(),
          supabase
            .from("leave_balances")
            .select("*")
            .eq("employee_id", emp.id)
            .eq("year", now.getFullYear())
            .maybeSingle(),
        ]);
        if (!active) return;
        setAttendance((attendanceData as Attendance | null) || null);
        setLeaveBalance((balanceData as LeaveBalance | null) || null);
        hasError ||= Boolean(attendanceError || balanceError);
      }
      if (hasError) setLoadError("Some workspace information could not be loaded. Please refresh the page.");
      setLoading(false);
    };
    load();
    return () => { active = false; };
  }, [user?.email]);

  const firstName = employee?.first_name || user?.email?.split("@")[0] || "there";
  const initials = employee
    ? `${employee.first_name[0] || ""}${employee.last_name[0] || ""}`.toUpperCase()
    : firstName.slice(0, 2).toUpperCase();
  const clockedIn = Boolean(attendance?.clock_in && !attendance.clock_out);
  const annualRemaining = leaveBalance
    ? Math.max(0, Number(leaveBalance.annual_total) - Number(leaveBalance.annual_used))
    : null;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
                <p className="text-sm font-medium text-slate-500">{todayLabel || "Your HR workspace"}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl">
            {greeting}, {firstName}
          </h1>
        </div>
        <Link href="/dashboard" className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-brand-navy shadow-sm transition hover:border-brand-orange/40 hover:text-brand-orange">
          Open HR dashboard <ArrowIcon />
        </Link>
      </header>
      {loadError && <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{loadError}</div>}

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-navy via-[#10294a] to-[#163963] p-6 text-white shadow-card sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full border border-white/[0.08]" />
        <div className="pointer-events-none absolute -right-2 -top-10 h-52 w-52 rounded-full border border-white/[0.08]" />
        <div className="pointer-events-none absolute bottom-0 right-1/4 h-48 w-48 rounded-full bg-brand-orange/10 blur-3xl" />
        <div className="relative grid gap-8 lg:grid-cols-[1fr_340px] lg:items-center">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-lg font-bold text-white">{initials}</div>
              <div>
                <p className="text-sm font-medium text-slate-300">Your workspace</p>
                <p className="mt-0.5 text-sm font-semibold capitalize text-white">{role}</p>
              </div>
            </div>
            <h2 className="mt-7 max-w-2xl text-2xl font-bold tracking-tight sm:text-3xl">Your workday, all in one place.</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">Check in, keep track of time off, and stay up to date with what’s happening at work.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {employee?.departments?.name && <ProfileTag>{employee.departments.name}</ProfileTag>}
              {employee?.positions?.title && <ProfileTag>{employee.positions.title}</ProfileTag>}
              {!employee?.departments?.name && !employee?.positions?.title && <ProfileTag>MCX HR member</ProfileTag>}
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-5 backdrop-blur">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-300">Today’s attendance</p>
                <p className="mt-2 text-xl font-bold">{loading ? "Checking status…" : clockedIn ? "You’re clocked in" : attendance?.clock_out ? "Day completed" : "Not clocked in"}</p>
              </div>
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${clockedIn ? "bg-emerald-400/15 text-emerald-300" : "bg-white/10 text-slate-200"}`}><ClockIcon /></span>
            </div>
            <p className="mt-2 min-h-5 text-sm text-slate-300">
              {attendance?.clock_in ? `Started at ${formatTime(attendance.clock_in)}${attendance.clock_out ? ` · finished at ${formatTime(attendance.clock_out)}` : ""}` : "Record your attendance when you start work."}
            </p>
            <Link href="/attendance" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-orange px-4 py-3 text-sm font-bold text-white transition hover:bg-brand-orangeDark">
              {clockedIn ? "View attendance" : "Go to attendance"} <ArrowIcon />
            </Link>
          </div>
        </div>
      </section>

      <section aria-label="Quick links">
        <div className="mb-3">
          <h2 className="text-lg font-bold text-brand-navy">Quick links</h2>
          <p className="mt-0.5 text-sm text-slate-500">Get to the things you use most.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {quickLinks.map((item) => (
            <Link key={item.href} href={item.href} className="group flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-brand-orange/40 hover:shadow-card">
              <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${item.color}`}>
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={item.icon} /></svg>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-brand-navy group-hover:text-brand-orange">{item.label}</span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">{item.description}</span>
              </span>
              <ArrowIcon className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-orange" />
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.35fr_0.85fr]">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-brand-navy">Company updates</h2>
              <p className="mt-1 text-sm text-slate-500">The latest news and announcements.</p>
            </div>
            {role === "admin" && <Link href="/dashboard" className="shrink-0 text-sm font-semibold text-brand-orange hover:underline">Post update</Link>}
          </div>
          <div className="mt-5 divide-y divide-slate-100">
            {loading && announcements.length === 0 ? <AnnouncementSkeleton /> : announcements.length === 0 ? (
              <div className="rounded-xl bg-slate-50 px-4 py-8 text-center">
                <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm"><AnnouncementIcon /></span>
                <p className="mt-3 text-sm font-semibold text-slate-700">Nothing new for now</p>
                <p className="mt-1 text-xs text-slate-500">Company announcements will appear here.</p>
              </div>
            ) : announcements.map((announcement) => (
              <article key={announcement.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-brand-orange"><AnnouncementIcon /></span>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-brand-navy">{announcement.title}</h3>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600">{announcement.content}</p>
                    <time className="mt-2 block text-xs text-slate-400" dateTime={announcement.created_at}>{formatDate(announcement.created_at)}</time>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-sm font-medium text-slate-500">Annual leave</p><h2 className="mt-1 text-lg font-bold text-brand-navy">Your balance</h2></div>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-brand-orange"><CalendarIcon /></span>
            </div>
            <div className="mt-5 flex items-end gap-2">
              <span className="text-3xl font-bold tracking-tight text-brand-navy">{loading ? "—" : annualRemaining ?? "—"}</span>
              <span className="pb-1 text-sm text-slate-500">
                {leaveBalance ? `of ${leaveBalance.annual_total} days` : loading ? "days available" : "balance not set"}
              </span>
            </div>
            {leaveBalance && <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-orange transition-all" style={{ width: `${Math.min(100, (Number(leaveBalance.annual_used) / Math.max(Number(leaveBalance.annual_total), 1)) * 100)}%` }} /></div>}
            <Link href="/leave" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-orange hover:underline">Manage leave <ArrowIcon /></Link>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><CalendarIcon /></span>
              <div><p className="text-sm font-medium text-slate-500">Coming up</p><h2 className="text-base font-bold text-brand-navy">Next public holiday</h2></div>
            </div>
            {loading ? <div className="mt-4 h-12 animate-pulse rounded-lg bg-slate-100" /> : holiday ? (
              <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3">
                <span className="text-sm font-semibold text-brand-navy">{holiday.name}</span>
                <time dateTime={holiday.date} className="shrink-0 text-xs font-medium text-slate-500">{formatDate(holiday.date, { day: "numeric", month: "short" })}</time>
              </div>
            ) : <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">No upcoming holiday has been added.</p>}
            <Link href="/holidays" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-orange hover:underline">View holiday calendar <ArrowIcon /></Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function ProfileTag({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-white/15 bg-white/[0.07] px-3 py-1.5 text-xs font-medium text-slate-200">{children}</span>;
}

function ArrowIcon({ className = "h-4 w-4" }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
}

function ClockIcon() {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
}

function CalendarIcon() {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></svg>;
}

function AnnouncementIcon() {
  return <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m3 11 18-5v12L3 13v-2ZM11.6 15.4 13 21H8l-1.7-6.5" /><path d="M3 11v2" /></svg>;
}

function AnnouncementSkeleton() {
  return <div className="space-y-4">{[0, 1].map((item) => <div key={item} className="flex gap-3 py-2"><div className="h-9 w-9 shrink-0 animate-pulse rounded-xl bg-slate-100" /><div className="flex-1 space-y-2"><div className="h-4 w-2/5 animate-pulse rounded bg-slate-100" /><div className="h-3 w-full animate-pulse rounded bg-slate-100" /><div className="h-3 w-4/5 animate-pulse rounded bg-slate-100" /></div></div>)}</div>;
}
