"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ApiError,
  checkinBooking,
  myLeaves,
  requestLeave,
  todayBookings,
  type BookingDetail,
  type LeaveRequestItem,
} from "@/lib/api";
import { useRoleGuard } from "@/lib/useRoleGuard";
import { Button } from "@/components/Button";

const STATUS_LABEL: Record<string, string> = {
  confirmed: "في الانتظار",
  checked_in: "وصل — جاري الشغل",
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

export default function EmployeeDashboard() {
  const ready = useRoleGuard(["employee"]);
  const router = useRouter();

  const [bookings, setBookings] = useState<BookingDetail[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeBookingId, setActiveBookingId] = useState<number | null>(null);
  const [code, setCode] = useState("");
  const [checkinError, setCheckinError] = useState<string | null>(null);
  const [checkinLoading, setCheckinLoading] = useState(false);

  const [showLeaveForm, setShowLeaveForm] = useState(false);

  function refresh() {
    return Promise.all([todayBookings(), myLeaves()]).then(([bk, lv]) => {
      setBookings(bk);
      setLeaves(lv);
    });
  }

  useEffect(() => {
    if (!ready) return;
    refresh()
      .catch((err) => setError(err instanceof ApiError ? err.message : "معدرنا نجيب الشيفت"))
      .finally(() => setLoading(false));
  }, [ready]);

  async function handleCheckin(bookingId: number) {
    setCheckinLoading(true);
    setCheckinError(null);
    try {
      await checkinBooking(bookingId, code);
      setCode("");
      setActiveBookingId(null);
      await refresh();
    } catch (err) {
      setCheckinError(err instanceof ApiError ? err.message : "الكود غلط");
    } finally {
      setCheckinLoading(false);
    }
  }

  async function handleRequestLeave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await requestLeave({ date: String(form.get("date")), reason: String(form.get("reason")) });
      setShowLeaveForm(false);
      const lv = await myLeaves();
      setLeaves(lv);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "معدرنا نبعت طلب الإجازة");
    }
  }

  if (!ready || loading) return <ShiftSkeleton />;

  const pending = bookings.filter((b) => b.status === "confirmed");
  const inProgress = bookings.filter((b) => b.status === "checked_in");
  const done = bookings.filter((b) => ["completed", "no_show", "cancelled"].includes(b.status));

  return (
    <main className="min-h-screen pb-16">
      <header className="mx-auto flex max-w-2xl items-center justify-between px-5 pt-6">
        <div>
          <p className="text-xs font-semibold text-faint">شيفتي اليوم</p>
          <h1 className="mt-1 text-xl font-bold text-ink">{bookings.length} حجز النهاردة</h1>
        </div>
        <button onClick={() => logout(router)} className="text-sm font-semibold text-muted hover:text-danger">
          خروج
        </button>
      </header>

      <div className="mx-auto max-w-2xl px-5">
        {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}

        <Link
          href="/employee/scan"
          className="mt-6 flex items-center justify-between rounded-2xl bg-primary px-5 py-4 text-primary-ink shadow-[0_8px_24px_-8px_oklch(0.80_0.16_113_/_0.45)] transition-[transform] active:scale-[0.98]"
        >
          <span className="text-sm font-bold">استلام عميل بكود الحجز</span>
          <span className="text-lg">←</span>
        </Link>

        <Section title="في الانتظار — أكد الوصول">
          {pending.length === 0 ? (
            <p className="text-sm text-muted">مفيش حجوزات منتظرة دلوقتي</p>
          ) : (
            <div className="flex flex-col gap-2">
              {pending.map((b) => (
                <div key={b.id} className="rounded-xl bg-surface p-3 ring-1 ring-border">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-ink" dir="ltr">
                      {new Date(b.appointment_time).toLocaleTimeString("ar-EG", { hour: "numeric", minute: "2-digit" })}
                    </p>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLE[b.status]}`}>
                      {STATUS_LABEL[b.status]}
                    </span>
                  </div>
                  {b.vehicle_label ? <p className="mt-1 text-xs text-faint" dir="ltr">{b.vehicle_label}</p> : null}

                  {activeBookingId === b.id ? (
                    <div className="mt-3 flex gap-2">
                      <input
                        autoFocus
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="كود الوصول"
                        maxLength={6}
                        className="input-field flex-1 text-center text-lg font-bold tracking-widest"
                        dir="ltr"
                      />
                      <Button
                        onClick={() => handleCheckin(b.id)}
                        loading={checkinLoading}
                        className="!px-5 !py-2.5 !text-sm"
                      >
                        تأكيد
                      </Button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setActiveBookingId(b.id);
                        setCode("");
                        setCheckinError(null);
                      }}
                      className="mt-3 w-full rounded-xl bg-surface-raised py-2.5 text-sm font-bold text-primary ring-1 ring-border"
                    >
                      إدخال كود الوصول
                    </button>
                  )}
                  {activeBookingId === b.id && checkinError ? (
                    <p className="mt-2 text-xs text-danger">{checkinError}</p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </Section>

        {inProgress.length > 0 && (
          <Section title="جاري الشغل عليها">
            <div className="flex flex-col gap-2">
              {inProgress.map((b) => (
                <div key={b.id} className="flex items-center justify-between rounded-xl bg-surface p-3 ring-1 ring-border">
                  <p className="text-sm text-ink" dir="ltr">
                    {new Date(b.appointment_time).toLocaleTimeString("ar-EG", { hour: "numeric", minute: "2-digit" })}
                  </p>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLE[b.status]}`}>
                    {STATUS_LABEL[b.status]}
                  </span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {done.length > 0 && (
          <Section title="خلصت">
            <div className="flex flex-col gap-2">
              {done.map((b) => (
                <div key={b.id} className="flex items-center justify-between rounded-xl bg-surface/60 p-3 ring-1 ring-border/60">
                  <p className="text-sm text-faint" dir="ltr">
                    {new Date(b.appointment_time).toLocaleTimeString("ar-EG", { hour: "numeric", minute: "2-digit" })}
                  </p>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLE[b.status]}`}>
                    {STATUS_LABEL[b.status]}
                  </span>
                </div>
              ))}
            </div>
          </Section>
        )}

        <Section title="طلبات الإجازة">
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

function ShiftSkeleton() {
  return (
    <main className="mx-auto max-w-2xl px-5 pt-6">
      <div className="h-6 w-1/3 animate-pulse rounded bg-surface" />
      <div className="mt-6 flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-surface" />
        ))}
      </div>
    </main>
  );
}
