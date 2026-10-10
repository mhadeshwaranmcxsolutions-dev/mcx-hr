"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    let active = true;
    const resolveLanding = async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("landing_page")
        .eq("email", user.email!)
        .maybeSingle();

      if (!active) return;

      const target = (!error && data?.landing_page) || "/dashboard";
      router.replace(target);
    };

    resolveLanding();
    return () => { active = false; };
  }, [user, loading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-brand-orange" />
        <p className="text-sm text-slate-500">Loading your workspace…</p>
      </div>
    </div>
  );
}
