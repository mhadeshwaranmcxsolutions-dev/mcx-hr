"use client";

import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import type { Permission, Role } from "@/types";

const ALL_PAGES = [
  "/landing",
  "/dashboard",
  "/employees",
  "/org-chart",
  "/recruitment",
  "/onboarding",
  "/attendance",
  "/leave",
  "/holidays",
  "/shifts",
  "/payroll",
  "/expenses",
  "/performance",
  "/training",
  "/assets",
  "/reports",
  "/audit-log",
  "/settings",
];

export function usePermissions(role: Role, userId: string | null) {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data } = await supabase
        .from("permissions")
        .select("*")
        .or(`role.eq.${role},user_id.eq.${userId || "00000000-0000-0000-0000-000000000000"}`);
      if (!active) return;
      setPermissions((data as Permission[]) || []);
      setLoading(false);
    };
    if (userId) load();

    const channel = supabase
      .channel(`permissions-${role}-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "permissions" },
        async () => {
          if (!userId) return;
          const { data } = await supabase
            .from("permissions")
            .select("*")
            .or(`role.eq.${role},user_id.eq.${userId}`);
          if (active) setPermissions((data as Permission[]) || []);
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [role, userId]);

  const canAccess = (page: string): boolean => {
    if (role === "admin") return true;
    const userPerm = permissions.find((p) => p.page === page && p.user_id === userId);
    if (userPerm) return userPerm.can_access;
    const rolePerm = permissions.find((p) => p.page === page && !p.user_id);
    return rolePerm ? rolePerm.can_access : true;
  };

  const allowedPages = ALL_PAGES.filter((p) => canAccess(p));

  return { canAccess, allowedPages, loading };
}
