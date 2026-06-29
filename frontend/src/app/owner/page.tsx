"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ApiError,
  addEmployee,
  createService,
  listServicesForOwner,
  myEmployees,
  myRevenue,
  myWash,
  pendingLeaves,
  removeEmployee,
  respondLeave,
  toggleService,
  washBookings,
  type BookingDetail,
  type LeaveRequestItem,
  type MyRevenue,
  type Service,
  type StaffMember,
  type Wash,
} from "@/lib/api";
import { useRoleGuard } from "@/lib/useRoleGuard";
import { Button } from "@/components/Button";

const STATUS_LABEL: Record<string, string> = {
  confirmed: "مؤكد",
  checked_in: "وصل المكان",
  completed: "خلص",
  no_show: "لم يحضر",
  cancelled: "ملغي",
};

function logout(router: ReturnType<typeof useRouter>) {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  router.replace("/login");
}

export default function OwnerDashboard() {
  const ready = useRoleGuard(["owner"]);
  const router = useRouter();

  const [wash, setWash] = useState<Wash | null>(null);
  const [revenue, setRevenue] = useState<MyRevenue | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [employees, setEmployees] = useState<StaffMember[]>([]);
  const [bookings, setBookings] = useState<BookingDetail[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    myWash()
      .then((washes) => {
        const w = washes[0];
        setWash(w ?? null);
        if (!w) return;
        if (w.status === "pending_setup") {
          router.replace("/owner/setup");
          return;
        }
        return Promise.all([
          myRevenue(),
          listServicesForOwner(w.id),
          myEmployees(),
          washBookings(),
          pendingLeaves(),
        ]).then(([rev, svc, emp, bk, lv]) => {
          setRevenue(rev);
          setServices(svc);
          setEmployees(emp);
          setBookings(bk);
          setLeaves(lv);
        });
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "معدرنا نجيب بيانات المغسلة"))
      .finally(() => setLoading(false));
  }, [ready]);

  async function handleAddService(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!wash) return;
    const form = new FormData(e.currentTarget);
    try {
      const service = await createService(wash.id, {
        name: String(form.get("name")),
        description: String(form.get("description") || ""),
        price: Number(form.get("price")),
        duration_minutes: Number(form.get("duration")),
      });
      setServices((prev) => [...prev, service]);
      e.currentTarget.reset();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "معدرنا نضيف الخدمة");
    }
  }

  async function handleToggleService(serviceId: number) {
    if (!wash) return;
    try {
      const updated = await toggleService(wash.id, serviceId);
      setServices((prev) => prev.map((s) => (s.id === serviceId ? updated : s)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "معدرنا نحدث الخدمة");
    }
  }

  async function handleAddEmployee(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await addEmployee({
        phone: String(form.get("phone")),
        name: String(form.get("name") || ""),
        role: form.get("role") === "supervisor" ? "supervisor" : "employee",
      });
      const updated = await myEmployees();
      setEmployees(updated);
      e.currentTarget.reset();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "معدرنا نضيف الموظف");
    }
  }

  async function handleRemoveEmployee(id: number) {
    try {
      await removeEmployee(id);
      setEmployees((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "معدرنا نشيل الموظف");
    }
  }

  async function handleRespondLeave(id: number, status: "approved" | "rejected") {
    try {
      await respondLeave(id, status);
      setLeaves((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "معدرنا نحدث الطلب");
    }
  }

  if (!ready || loading) return <DashboardSkeleton />;

  if (!wash) {
    return (
      <main className="grid min-h-screen place-items-center px-6 text-center">
        <p className="text-sm text-muted">لا توجد مغسلة مرتبطة بحسابك</p>
      </main>
    );
  }

  if (wash.status === "pending_setup") {
    // Redirect already in-flight (see effect above) — avoid flashing the
    // full dashboard with empty data while the router navigates.
    return <DashboardSkeleton />;
  }

  if (wash.status === "pending_approval") {
    return (
      <main className="grid min-h-screen place-items-center px-6 text-center">
        <div className="max-w-sm">
          <p className="text-2xl">⏳</p>
          <h1 className="mt-3 text-lg font-bold text-ink">مغسلتك في انتظار الموافقة</h1>
          <p className="mt-2 text-sm text-muted">
            بياناتك بقت كاملة، وفريق Washly بيراجعها دلوقتي. هنفعّل الحساب فور الموافقة.
          </p>
          <button onClick={() => logout(router)} className="mt-6 text-sm font-semibold text-muted hover:text-danger">
            خروج
          </button>
        </div>
      </main>
    );
  }

  if (wash.status === "rejected") {
    return (
      <main className="grid min-h-screen place-items-center px-6 text-center">
        <div className="max-w-sm">
          <p className="text-2xl">✕</p>
          <h1 className="mt-3 text-lg font-bold text-ink">تم رفض طلب المغسلة</h1>
          <p className="mt-2 text-sm text-muted">
            تواصل مع فريق Washly لمعرفة التفاصيل.
          </p>
          <button onClick={() => logout(router)} className="mt-6 text-sm font-semibold text-muted hover:text-danger">
            خروج
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-16">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 pt-6">
        <div>
          <p className="text-xs font-semibold text-faint">لوحة تحكم صاحب المغسلة</p>
          <h1 className="mt-1 text-xl font-bold text-ink">{wash.name}</h1>
        </div>
        <button onClick={() => logout(router)} className="text-sm font-semibold text-muted hover:text-danger">
          خروج
        </button>
      </header>

      <div className="mx-auto max-w-3xl px-5">
        {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}

        {revenue ? (
          <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="إيراد مكتمل" value={`${revenue.gross_revenue.toFixed(0)} ج`} />
            <StatCard label={`عمولة Washly (${revenue.commission_percent}%)`} value={`${revenue.commission_due.toFixed(0)} ج`} accent />
            <StatCard label="صافي ليك" value={`${revenue.net_revenue.toFixed(0)} ج`} />
            <StatCard label="حجوزات جاية" value={String(revenue.upcoming_bookings)} />
          </section>
        ) : null}

        {leaves.length > 0 && (
          <Section title="طلبات إجازة في الانتظار">
            <div className="flex flex-col gap-2">
              {leaves.map((l) => (
                <div key={l.id} className="flex items-center justify-between rounded-xl bg-surface p-3 ring-1 ring-border">
                  <div className="text-sm">
                    <p className="text-ink">{l.date}</p>
                    <p className="text-faint">{l.reason}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRespondLeave(l.id, "approved")}
                      className="rounded-lg bg-success/15 px-3 py-1.5 text-xs font-bold text-success"
                    >
                      موافقة
                    </button>
                    <button
                      onClick={() => handleRespondLeave(l.id, "rejected")}
                      className="rounded-lg bg-danger/15 px-3 py-1.5 text-xs font-bold text-danger"
                    >
                      رفض
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        <Section title="الخدمات">
          <div className="flex flex-col gap-2">
            {services.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-xl bg-surface p-3 ring-1 ring-border">
                <div className="min-w-0">
                  <p className={`font-bold ${s.is_active ? "text-ink" : "text-faint line-through"}`}>{s.name}</p>
                  <p className="text-xs text-faint">{s.price.toFixed(0)} ج · {s.duration_minutes} دقيقة</p>
                </div>
                <button
                  onClick={() => handleToggleService(s.id)}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold ${
                    s.is_active ? "bg-danger/15 text-danger" : "bg-success/15 text-success"
                  }`}
                >
                  {s.is_active ? "إيقاف" : "تفعيل"}
                </button>
              </div>
            ))}
          </div>
          <form onSubmit={handleAddService} className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-surface p-3 ring-1 ring-border">
            <input name="name" required placeholder="اسم الخدمة" className="input-field col-span-2" />
            <input name="description" placeholder="وصف (اختياري)" className="input-field col-span-2" />
            <input name="price" required type="number" placeholder="السعر" className="input-field" />
            <input name="duration" required type="number" placeholder="المدة (دقيقة)" className="input-field" />
            <Button type="submit" className="col-span-2 !py-2.5 !text-sm">
              إضافة خدمة
            </Button>
          </form>
        </Section>

        <Section title="الموظفون">
          <div className="flex flex-col gap-2">
            {employees.map((e) => (
              <div key={e.id} className="flex items-center justify-between rounded-xl bg-surface p-3 ring-1 ring-border">
                <div>
                  <p className="font-bold text-ink">{e.name || e.phone}</p>
                  <p className="text-xs text-faint" dir="ltr">{e.phone} · {e.role === "supervisor" ? "كبير موظفين" : "موظف"}</p>
                </div>
                <button onClick={() => handleRemoveEmployee(e.id)} className="text-xs font-bold text-danger">
                  إزالة
                </button>
              </div>
            ))}
            {employees.length === 0 && <p className="text-sm text-muted">لسه مفيش موظفين</p>}
          </div>
          <form onSubmit={handleAddEmployee} className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-surface p-3 ring-1 ring-border">
            <input name="phone" required placeholder="رقم التليفون" className="input-field" dir="ltr" />
            <input name="name" placeholder="الاسم (اختياري)" className="input-field" />
            <select name="role" className="input-field col-span-2" defaultValue="employee">
              <option value="employee">موظف</option>
              <option value="supervisor">كبير موظفين</option>
            </select>
            <Button type="submit" className="col-span-2 !py-2.5 !text-sm">
              إضافة موظف
            </Button>
          </form>
        </Section>

        <Section title="آخر الحجوزات">
          <div className="flex flex-col gap-2">
            {bookings.slice(0, 10).map((b) => (
              <div key={b.id} className="flex items-center justify-between rounded-xl bg-surface p-3 ring-1 ring-border">
                <div className="text-sm">
                  <p className="text-ink">#{b.id} · {new Date(b.appointment_time).toLocaleString("ar-EG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</p>
                  {b.total_price > 0 && <p className="text-xs text-faint">{b.total_price.toFixed(0)} ج</p>}
                </div>
                <span className="rounded-full bg-surface-raised px-2.5 py-1 text-[11px] font-semibold text-muted">
                  {STATUS_LABEL[b.status] ?? b.status}
                </span>
              </div>
            ))}
            {bookings.length === 0 && <p className="text-sm text-muted">لسه مفيش حجوزات</p>}
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
