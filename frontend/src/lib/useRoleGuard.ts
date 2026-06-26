"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ROLE_HOME, type AuthRole } from "./api";

export function useRoleGuard(allowed: AuthRole[]) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role") as AuthRole | null;
    if (!token || !role) {
      router.replace("/login");
      return;
    }
    if (!allowed.includes(role)) {
      router.replace(ROLE_HOME[role] ?? "/");
      return;
    }
    // Reading an external system (localStorage) on mount and reflecting it
    // into state is exactly the sanctioned use of an effect; there's no
    // way to know "ready" before this check runs.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return ready;
}
