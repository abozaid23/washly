"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ApiError,
  allUsers,
  allWashes,
  approveWash,
  createWashOwner,
  networkRevenue,
  pendingApprovalWashes,
  rejectWash,
  toggleUser,
  toggleWash,
  type AdminUser,
  type AdminWash,
  type NetworkRevenue,
  type PendingWash,
} from "@/lib/api";
import { useRoleGuard } from "@/lib/useRoleGuard";
import { Button } from "@/components/Button";

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
  const [pending, setPending] = useState<PendingWash[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userQuery, setUserQuery] = useState("");

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createMessage, setCreateMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    Promise.all([allWashes(), allUsers(), networkRevenue(), pendingApprovalWashes()])
      .then(([w, u, r, p]) => {
        setWashes(w);
        setUsers(u);
        setRevenue(r);
        setPending(p);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "معدرنا نجيب بيانات الشبكة"))
      .finally(() => setLoading(false));
  }, [ready]);

  async function handleCreateWashOwner(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreateLoading(true);
    setCreateMessage(null);
    const form = new FormData(e.currentTarget);
    try {
      await createWashOwner({
        wash_name: String(form.get("wash_name")),
        owner_name: String(form.get("owner_name")),
        owner_phone: String(form.get("owner_phone")),
      });
      setCreateMessage("تم إنشاء المغسلة — هتظهر لصاحبها عشان يكمل بياناتها");
      e.currentTarget.reset();
      setShowCreateForm(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "معدرنا ننشئ المغسلة");
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleApprove(id: number) {
    try {
      await approveWash(id);
      setPending((prev) => prev.filter((w) => w.id !== id));
      setWashes(await allWashes());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "معدرنا نوافق على المغسلة");
    }
  }

  async function handleReject(id: number) {
    try {
      await rejectWash(id);
      setPending((prev) => prev.filter((w) => w.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "معدرنا نرفض المغسلة");
    }
  }

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

  const activeWashes = washes.filter((w) => w.is_active && w.status === "active").length;

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
        {createMessage ? <p className="mt-4 text-sm text-success">{createMessage}</p> : null}

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

        <Section title="مغاسل في انتظار الموافقة">
          {pending.length === 0 ? (
            <p className="text-sm text-muted">لا توجد مغاسل في انتظار الموافقة دلوقتي</p>
          ) : (
            <div className="flex flex-col gap-2">
              {pending.map((w) => (
                <div key={w.id} className="rounded-xl bg-surface p-3 ring-1 ring-border">
                  <p className="font-bold text-ink">{w.name}</p>
                  {w.description ? <p className="mt-0.5 text-xs text-faint">{w.description}</p> : null}
                  <p className="mt-0.5 text-xs text-faint" dir="ltr">{w.phone}</p>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleApprove(w.id)}
                      className="flex-1 rounded-lg bg-success/15 py-1.5 text-xs font-bold text-success"
                    >
                      وافق
                    </button>
                    <button
                      onClick={() => handleReject(w.id)}
                      className="flex-1 rounded-lg bg-danger/15 py-1.5 text-xs font-bold text-danger"
                    >
                      ارفض
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="المغاسل">
          {showCreateForm ? (
            <form onSubmit={handleCreateWashOwner} className="mb-3 grid grid-cols-2 gap-2 rounded-xl bg-surface p-3 ring-1 ring-border">
              <input name="wash_name" required placeholder="اسم المغسلة" className="input-field col-span-2" />
              <input name="owner_name" required placeholder="اسم صاحب المغسلة" className="input-field" />
              <input name="owner_phone" required placeholder="رقم تليفونه" className="input-field" dir="ltr" />
              <div className="col-span-2 flex gap-2">
                <Button type="submit" loading={createLoading} className="flex-1 !py-2.5 !text-sm">
                  إنشاء المغسلة
                </Button>
                <Button type="button" variant="ghost" onClick={() => setShowCreateForm(false)} className="!px-4 !py-2.5 !text-sm">
                  إلغاء
                </Button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowCreateForm(true)}
              className="mb-3 w-full rounded-xl bg-surface py-2.5 text-sm font-bold text-primary ring-1 ring-dashed ring-border"
            >
              + إضافة مغسلة جديدة
            </button>
          )}
          <div className="flex flex-col gap-2">
            {washes.map((w) => {
              const washRevenue = revenue?.washes.find((r) => r.wash_id === w.id);
              return (
                <div key={w.id} className="rounded-xl bg-surface p-3 ring-1 ring-border">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className={`flex items-center gap-2 font-bold ${w.is_active ? "text-ink" : "text-faint line-through"}`}>
                        {w.name}
                        {w.status !== "active" && (
                          <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-bold text-warning">
                            {w.status === "pending_setup"
                              ? "لسه بيكمل بياناته"
                              : w.status === "pending_approval"
                              ? "في انتظار الموافقة"
                              : "مرفوضة"}
                          </span>
                        )}
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
