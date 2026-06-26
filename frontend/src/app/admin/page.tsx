"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ApiError,
  allUsers,
  allWashes,
  networkRevenue,
  toggleUser,
  toggleWash,
  type AdminUser,
  type AdminWash,
  type NetworkRevenue,
} from "@/lib/api";
import { useRoleGuard } from "@/lib/useRoleGuard";

const ROLE_LABEL: Record<string, string> = {
  customer: "عميل",
  employee: "موظف",
  supervisor: "كبير موظفين",
  owner: "صاحب مغسلة",
  super_admin: "سوبر أدمن",
};

function logout(router: ReturnType<typeof useRouter>) {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  router.replace("/login");
}

export default function SuperAdminDashboard() {
  const ready = useRoleGuard(["super_admin"]);
  const router = useRouter();

  const [washes, setWashes] = useState<AdminWash[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [revenue, setRevenue] = useState<NetworkRevenue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userQuery, setUserQuery] = useState("");

  useEffect(() => {
    if (!ready) return;
    Promise.all([allWashes(), allUsers(), networkRevenue()])
      .then(([w, u, r]) => {
        setWashes(w);
        setUsers(u);
        setRevenue(r);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "معدرنا نجيب بيانات الشبكة"))
      .finally(() => setLoading(false));
  }, [ready]);

  async function handleToggleWash(id: number) {
    try {
      const res = await toggleWash(id);
      setWashes((prev) => prev.map((w) => (w.id === id ? { ...w, is_active: res.is_active } : w)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "معدرنا نحدث المغسلة");
    }
  }

  async function handleToggleUser(id: number) {
    try {
      const res = await toggleUser(id);
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, is_active: res.is_active } : u)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "معدرنا نحدث الحساب");
    }
  }

  if (!ready || loading) return <DashboardSkeleton />;

  const filteredUsers = users.filter(
    (u) => !userQuery || u.phone.includes(userQuery) || (u.name ?? "").includes(userQuery)
  );

  const activeWashes = washes.filter((w) => w.is_active).length;

  return (
    <main className="min-h-screen pb-16">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 pt-6">
        <div>
          <p className="text-xs font-semibold text-faint">لوحة السوبر أدمن</p>
          <h1 className="mt-1 text-xl font-bold text-ink">صحة الشبكة</h1>
        </div>
        <button onClick={() => logout(router)} className="text-sm font-semibold text-muted hover:text-danger">
          خروج
        </button>
      </header>

      <div className="mx-auto max-w-3xl px-5">
        {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}

        <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="مغاسل شغالة" value={`${activeWashes}/${washes.length}`} />
          <StatCard
            label="عمولة Washly المستحقة"
            value={`${revenue?.total_commission_due.toFixed(0) ?? 0} ج`}
            accent
          />
          <StatCard label="إجمالي المستخدمين" value={String(users.length)} />
          <StatCard
            label="حسابات موقوفة"
            value={String(users.filter((u) => !u.is_active).length)}
          />
        </section>

        <Section title="المغاسل">
          <div className="flex flex-col gap-2">
            {washes.map((w) => {
              const washRevenue = revenue?.washes.find((r) => r.wash_id === w.id);
              return (
                <div key={w.id} className="rounded-xl bg-surface p-3 ring-1 ring-border">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className={`font-bold ${w.is_active ? "text-ink" : "text-faint line-through"}`}>
                        {w.name}
                      </p>
                      <p className="truncate text-xs text-faint">{w.address}</p>
                    </div>
                    <button
                      onClick={() => handleToggleWash(w.id)}
                      className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold ${
                        w.is_active ? "bg-danger/15 text-danger" : "bg-success/15 text-success"
                      }`}
                    >
                      {w.is_active ? "تعليق" : "تفعيل"}
                    </button>
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-xs text-faint">
                    <span>عمولة {w.commission_percent}%</span>
                    {washRevenue ? (
                      <>
                        <span>· {washRevenue.completed_bookings} زيارة مكتملة</span>
                        <span className="font-semibold text-primary">
                          · مستحق {washRevenue.commission_due.toFixed(0)} ج
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>
              );
            })}
            {washes.length === 0 && <p className="text-sm text-muted">لسه مفيش مغاسل في الشبكة</p>}
          </div>
        </Section>

        <Section title="المستخدمون">
          <input
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
            placeholder="بحث بالاسم أو الرقم"
            className="input-field mb-3 w-full"
          />
          <div className="flex flex-col gap-2">
            {filteredUsers.map((u) => (
              <div key={u.id} className="flex items-center justify-between rounded-xl bg-surface p-3 ring-1 ring-border">
                <div className="min-w-0">
                  <p className={`font-bold ${u.is_active ? "text-ink" : "text-faint line-through"}`}>
                    {u.name || u.phone}
                  </p>
                  <p className="text-xs text-faint" dir="ltr">{u.phone} · {ROLE_LABEL[u.role] ?? u.role}</p>
                </div>
                {u.role !== "super_admin" && (
                  <button
                    onClick={() => handleToggleUser(u.id)}
                    className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold ${
                      u.is_active ? "bg-danger/15 text-danger" : "bg-success/15 text-success"
                    }`}
                  >
                    {u.is_active ? "إيقاف" : "تفعيل"}
                  </button>
                )}
              </div>
            ))}
            {filteredUsers.length === 0 && <p className="text-sm text-muted">مفيش نتائج</p>}
          </div>
        </Section>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-7">
      <h2 className="mb-3 text-sm font-bold text-ink">{title}</h2>
      {children}
    </section>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl bg-surface p-4 ring-1 ring-border">
      <p className="text-xs text-faint">{label}</p>
      <p className={`mt-1 text-lg font-black ${accent ? "text-primary" : "text-ink"}`}>{value}</p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <main className="mx-auto max-w-3xl px-5 pt-6">
      <div className="h-6 w-1/3 animate-pulse rounded bg-surface" />
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-2xl bg-surface" />
        ))}
      </div>
    </main>
  );
}
