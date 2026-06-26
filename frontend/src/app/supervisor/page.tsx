"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ApiError,
  myEmployees,
  myLeaves,
  requestLeave,
  todayBookings,
  type BookingDetail,
  type LeaveRequestItem,
  type StaffMember,
} from "@/lib/api";
import { useRoleGuard } from "@/lib/useRoleGuard";
import { Button } from "@/components/Button";

const STATUS_LABEL: Record<string, string> = {
  confirmed: "في الانتظار",
  checked_in: "وصل",
  completed: "خلص",
  no_show: "لم يحضر",
  cancelled: "ملغي",
};

const STATUS_STYLE: Record<string, string> = {
  confirmed: "bg-primary/15 text-primary",
  checked_in: "bg-accent/15 text-accent",
  completed: "bg-success/15 text-success",
  no_show: "bg-danger/15 text-danger",
  cancelled: "bg-faint/15 text-faint",
};

function logout(router: ReturnType<typeof useRouter>) {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  router.replace("/login");
}

export default function SupervisorDashboard() {
  const ready = useRoleGuard(["supervisor"]);
  const router = useRouter();

  const [bookings, setBookings] = useState<BookingDetail[]>([]);
  const [employees, setEmployees] = useState<StaffMember[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLeaveForm, setShowLeaveForm] = useState(false);

  useEffect(() => {
    if (!ready) return;
    Promise.all([todayBookings(), myEmployees(), myLeaves()])
      .then(([bk, emp, lv]) => {
        setBookings(bk);
        setEmployees(emp);
        setLeaves(lv);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "معدرنا نجيب البيانات"))
      .finally(() => setLoading(false));
  }, [ready]);

  async function handleRequestLeave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await requestLeave({ date: String(form.get("date")), reason: String(form.get("reason")) });
      setShowLeaveForm(false);
      setLeaves(await myLeaves());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "معدرنا نبعت طلب الإجازة");
    }
  }

  if (!ready || loading) return <DashboardSkeleton />;

  const byStatus = (status: string) => bookings.filter((b) => b.status === status);

  return (
    <main className="min-h-screen pb-16">
      <header className="mx-auto flex max-w-2xl items-center justify-between px-5 pt-6">
        <div>
          <p className="text-xs font-semibold text-faint">لوحة كبير الموظفين</p>
          <h1 className="mt-1 text-xl font-bold text-ink">جدول اليوم</h1>
        </div>
        <button onClick={() => logout(router)} className="text-sm font-semibold text-muted hover:text-danger">
          خروج
        </button>
      </header>

      <div className="mx-auto max-w-2xl px-5">
        {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}

        <section className="mt-6 grid grid-cols-3 gap-3">
          <StatCard label="في الانتظار" value={byStatus("confirmed").length} />
          <StatCard label="جاري الشغل" value={byStatus("checked_in").length} accent />
          <StatCard label="خلصت" value={byStatus("completed").length} />
        </section>

        <Section title="حجوزات النهاردة">
          {bookings.length === 0 ? (
            <p className="text-sm text-muted">مفيش حجوزات النهاردة</p>
          ) : (
            <div className="flex flex-col gap-2">
              {bookings.map((b) => (
                <div key={b.id} className="flex items-center justify-between rounded-xl bg-surface p-3 ring-1 ring-border">
                  <div className="text-sm">
                    <p className="font-bold text-ink" dir="ltr">
                      {new Date(b.appointment_time).toLocaleTimeString("ar-EG", { hour: "numeric", minute: "2-digit" })}
                    </p>
                    {b.vehicle_label ? <p className="text-xs text-faint" dir="ltr">{b.vehicle_label}</p> : null}
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLE[b.status]}`}>
                    {STATUS_LABEL[b.status] ?? b.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="الموظفون">
          {employees.length === 0 ? (
            <p className="text-sm text-muted">لسه مفيش موظفين</p>
          ) : (
            <div className="flex flex-col gap-2">
              {employees.map((e) => (
                <div key={e.id} className="flex items-center justify-between rounded-xl bg-surface p-3 ring-1 ring-border">
                  <p className="font-bold text-ink">{e.name || e.phone}</p>
                  <span className="rounded-full bg-surface-raised px-2.5 py-1 text-[11px] font-semibold text-muted">
                    {e.role === "supervisor" ? "كبير موظفين" : "موظف"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="طلبات إجازتي">
          <div className="flex flex-col gap-2">
            {leaves.map((l) => (
              <div key={l.id} className="flex items-center justify-between rounded-xl bg-surface p-3 ring-1 ring-border">
                <div className="text-sm">
                  <p className="text-ink">{l.date}</p>
                  <p className="text-xs text-faint">{l.reason}</p>
                </div>
                <span className="rounded-full bg-surface-raised px-2.5 py-1 text-[11px] font-semibold text-muted">
                  {l.status === "pending" ? "في الانتظار" : l.status === "approved" ? "موافق عليها" : "مرفوضة"}
                </span>
              </div>
            ))}
          </div>
          {showLeaveForm ? (
            <form onSubmit={handleRequestLeave} className="mt-3 flex flex-col gap-2 rounded-xl bg-surface p-3 ring-1 ring-border">
              <input name="date" required type="date" className="input-field" />
              <input name="reason" required placeholder="السبب" className="input-field" />
              <Button type="submit" className="!py-2.5 !text-sm">
                إرسال الطلب
              </Button>
            </form>
          ) : (
            <button
              onClick={() => setShowLeaveForm(true)}
              className="mt-3 w-full rounded-xl bg-surface py-2.5 text-sm font-bold text-primary ring-1 ring-dashed ring-border"
            >
              + طلب إجازة جديد
            </button>
          )}
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

function StatCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="rounded-2xl bg-surface p-4 text-center ring-1 ring-border">
      <p className={`text-2xl font-black ${accent ? "text-primary" : "text-ink"}`}>{value}</p>
      <p className="mt-1 text-xs text-faint">{label}</p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <main className="mx-auto max-w-2xl px-5 pt-6">
      <div className="h-6 w-1/3 animate-pulse rounded bg-surface" />
      <div className="mt-6 grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-2xl bg-surface" />
        ))}
      </div>
    </main>
  );
}
