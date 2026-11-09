"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";

const benefits = [
  "Employee records in one place",
  "Attendance, leave and shift visibility",
  "Payroll and people reports",
];

const demoAccounts = [
  { label: "Admin demo", email: "admin@mcxhr.com", password: "admin123" },
  { label: "Employee demo", email: "employee@mcxhr.com", password: "employee123" },
];

export default function LoginPage() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const useDemoAccount = (account: (typeof demoAccounts)[number]) => {
    setEmail(account.email);
    setPassword(account.password);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      setError(error);
      return;
    }
    router.push("/");
  };

  return (
    <main className="min-h-screen bg-[#f2f4f7] px-4 py-5 sm:px-6 sm:py-8 lg:flex lg:items-center lg:justify-center">
      <div className="mx-auto grid min-h-[min(850px,calc(100vh-4rem))] w-full max-w-[1440px] overflow-hidden rounded-[28px] bg-white shadow-[0_28px_90px_rgba(15,23,42,0.14)] lg:grid-cols-[1fr_0.92fr]">
        <section className="flex items-center justify-center px-6 py-10 sm:px-12 lg:px-16 xl:px-24">
          <div className="w-full max-w-[440px]">
            <Link href="https://mcxsolutionwebsite.vercel.app" className="inline-flex items-center gap-3" aria-label="MCX Solutions home">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-orange text-lg font-black tracking-tight text-white shadow-[0_8px_20px_rgba(255,122,0,0.24)]">
                M
              </span>
              <span>
                <span className="block text-xl font-extrabold tracking-tight text-brand-navy">
                  MCX <span className="text-brand-orange">HR</span>
                </span>
                <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  People operations
                </span>
              </span>
            </Link>

            <div className="mt-12 sm:mt-16">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-orange">
                Welcome back
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-brand-navy sm:text-[2.5rem]">
                Sign in to your account
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Enter your work email and password to continue to MCX HR.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-9 space-y-5">
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-700">
                  Work email
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
                    <UserIcon />
                  </span>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-14 w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-[15px] text-brand-navy outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-brand-orange focus:bg-white focus:ring-4 focus:ring-brand-orange/10"
                    placeholder="you@company.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-700">
                  Password
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
                    <LockIcon />
                  </span>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-14 w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-14 text-[15px] text-brand-navy outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-brand-orange focus:bg-white focus:ring-4 focus:ring-brand-orange/10"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-slate-400 transition hover:text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-orange"
                  >
                    <EyeIcon crossed={!showPassword} />
                  </button>
                </div>
              </div>

              {error && (
                <div role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-between gap-4 pt-0.5">
                <span className="text-sm text-slate-500">
                  Need access?{" "}
                  <a className="font-semibold text-brand-navy underline decoration-slate-300 underline-offset-4 hover:text-brand-orange" href="mailto:hello@mcxsolutions.com">
                    Contact your admin
                  </a>
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-brand-navy px-5 text-sm font-bold text-white shadow-[0_8px_18px_rgba(11,31,58,0.16)] transition hover:bg-[#13315c] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-orange/25 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowIcon />
                  </>
                )}
              </button>
            </form>

            <div className="mt-7 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-brand-navy">Demo login</p>
                  <p className="mt-1 text-xs text-slate-500">Choose a role to fill the sign-in form.</p>
                </div>
                <span className="rounded-full bg-brand-orange/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-brand-orange">
                  Try MCX HR
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {demoAccounts.map((account) => (
                  <button
                    key={account.email}
                    type="button"
                    onClick={() => useDemoAccount(account)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left transition hover:border-brand-orange/50 hover:bg-orange-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
                  >
                    <span className="block text-xs font-semibold text-brand-navy">{account.label}</span>
                    <span className="mt-1 block truncate text-[10px] text-slate-400">{account.email}</span>
                  </button>
                ))}
              </div>
            </div>

            <p className="mt-6 text-center text-xs text-slate-400">
              Your organization’s HR workspace
            </p>
          </div>
        </section>

        <aside className="relative hidden min-h-[680px] overflow-hidden bg-[#071426] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(255,122,0,0.2),transparent_28%),radial-gradient(circle_at_15%_80%,rgba(45,111,170,0.3),transparent_35%),linear-gradient(145deg,#0a1b31_0%,#071426_58%,#050d18_100%)]" />
          <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(255,255,255,0.22)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.22)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />

          <div className="relative flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-white/60">
              MCX Solutions
            </span>
            <span className="rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[11px] font-semibold tracking-wide text-white/70">
              HR WORKSPACE
            </span>
          </div>

          <div className="relative mx-auto w-full max-w-[520px] py-10">
            <div className="relative mx-auto mb-10 flex h-48 w-48 items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-white/10" />
              <div className="absolute inset-4 rounded-full border border-white/[0.08]" />
              <div className="absolute inset-8 rounded-full bg-brand-orange/10 blur-2xl" />
              <div className="relative flex h-32 w-32 flex-col items-center justify-center rounded-[34px] border border-white/15 bg-white/[0.08] shadow-[0_24px_70px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                <span className="text-4xl font-black tracking-tight text-white">
                  MCX
                </span>
                <span className="mt-1 rounded-md bg-brand-orange px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white">
                  Human resources
                </span>
              </div>
              <span className="absolute right-2 top-7 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-[#11263d] text-brand-orange shadow-lg">
                <PeopleIcon />
              </span>
              <span className="absolute bottom-6 left-0 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-[#11263d] text-emerald-300 shadow-lg">
                <CheckIcon />
              </span>
            </div>

            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight xl:text-4xl">
                People, managed with clarity.
              </h2>
              <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-slate-300/75">
                A simpler way to keep your team, daily operations and people data connected.
              </p>
            </div>

            <div className="mx-auto mt-8 max-w-[390px] space-y-3">
              {benefits.map((benefit) => (
                <div key={benefit} className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-slate-200/90 backdrop-blur">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-300">
                    <CheckIcon />
                  </span>
                  {benefit}
                </div>
              ))}
            </div>
          </div>

          <div className="relative flex items-center justify-between border-t border-white/10 pt-5 text-xs text-white/40">
            <span>MCX HR</span>
            <span>Smart solutions. Simple business.</span>
          </div>
        </aside>
      </div>
    </main>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4.5" y="10" width="15" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
    </svg>
  );
}

function EyeIcon({ crossed }: { crossed: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.5" />
      {crossed && <path d="m4 4 16 16" />}
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0M16 5.5a3 3 0 0 1 0 5.8M17 14a5 5 0 0 1 3.5 4.8" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}
