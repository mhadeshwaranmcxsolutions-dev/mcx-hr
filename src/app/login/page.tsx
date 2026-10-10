"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
    router.push("/dashboard");
  };

  return (
    <div className="gradient-navy flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="https://mcxsolutionwebsite.vercel.app" className="inline-block">
            <div className="flex items-center justify-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-orange text-xl font-black text-white">
                M
              </div>
              <div className="text-left">
                <div className="text-2xl font-black tracking-tight text-white">
                  MCX <span className="text-brand-orange">HR</span>
                </div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Human Resource System
                </div>
              </div>
            </div>
          </Link>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-2xl">
          <h1 className="text-2xl font-bold text-brand-navy">Welcome back</h1>
          <p className="mt-1 text-sm text-slate-500">
            Sign in to your MCX HR account
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-brand-navy">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-brand-navy outline-none transition focus:border-brand-orange focus:bg-white focus:ring-2 focus:ring-brand-orange/20"
                placeholder="you@company.com"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-brand-navy">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-brand-navy outline-none transition focus:border-brand-orange focus:bg-white focus:ring-2 focus:ring-brand-orange/20"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-brand-orange py-3 text-sm font-semibold text-white shadow-card transition hover:bg-brand-orangeDark disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-6 rounded-xl bg-slate-50 p-4 text-xs text-slate-500">
            <p className="font-semibold text-brand-navy">Demo accounts</p>
            <p className="mt-1">Admin: admin@mcxhr.com / admin123</p>
            <p>Employee: employee@mcxhr.com / employee123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
