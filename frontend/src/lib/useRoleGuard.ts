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
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return ready;
}
