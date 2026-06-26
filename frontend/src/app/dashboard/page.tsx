"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ApiError, getMe, myBookings, type BookingDetail, type Me } from "@/lib/api";
import { useRoleGuard } from "@/lib/useRoleGuard";

const STATUS_LABEL: Record<string, string> = {
  confirmed: "مؤكد",
  checked_in: "وصل المكان",
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

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long" }),
    time: d.toLocaleTimeString("ar-EG", { hour: "numeric", minute: "2-digit" }),
  };
}

export default function CustomerDashboard() {
  const ready = useRoleGuard(["customer"]);
  const [me, setMe] = useState<Me | null>(null);
  const [lastBooking, setLastBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    Promise.all([getMe(), myBookings()])
      .then(([meData, bookings]) => {
        setMe(meData);
        setLastBooking(bookings[0] ?? null);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "معدرنا نجيب بياناتك"))
      .finally(() => setLoading(false));
  }, [ready]);

  if (!ready || loading) return <DashboardSkeleton />;

  return (
    <main className="min-h-screen pb-16">
      <header className="mx-auto max-w-2xl px-5 pt-6">
        <p className="text-xs font-semibold text-faint">أهلاً بيك</p>
        <h1 className="mt-1 text-xl font-bold text-ink">{me?.name || me?.phone || "عميل Washly"}</h1>
      </header>

      <div className="mx-auto max-w-2xl px-5">
        {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}

        <section className="mt-6">
          <h2 className="mb-3 text-sm font-bold text-ink">آخر حجز</h2>
          {lastBooking ? (
            <Link
              href="/bookings"
              className="block rounded-2xl bg-surface p-4 ring-1 ring-border transition-colors hover:bg-surface-raised"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-bold text-ink">{lastBooking.wash_name}</h3>
                  <p className="mt-0.5 truncate text-sm text-muted">{lastBooking.wash_address}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    STATUS_STYLE[lastBooking.status] ?? "bg-faint/15 text-faint"
                  }`}
                >
                  {STATUS_LABEL[lastBooking.status] ?? lastBooking.status}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-3 text-xs text-faint">
                <span>{formatDateTime(lastBooking.appointment_time).date}</span>
                <span dir="ltr">{formatDateTime(lastBooking.appointment_time).time}</span>
              </div>
              {lastBooking.total_price > 0 && (
                <p className="mt-1 text-sm font-bold text-primary">{lastBooking.total_price.toFixed(0)} جنيه</p>
              )}
            </Link>
          ) : (
            <div className="rounded-2xl bg-surface p-6 text-center ring-1 ring-border">
              <p className="text-sm text-muted">لسه معندكش حجوزات</p>
            </div>
          )}
        </section>

        <section className="mt-7">
          <h2 className="mb-3 text-sm font-bold text-ink">إجراءات سريعة</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <QuickAction href="/" icon="🚿" label="احجز دلوقتي" />
            <QuickAction href="/bookings" icon="🗓" label="حجوزاتي" />
            <QuickAction href="/vehicles" icon="🚗" label="عرباياتي" />
          </div>
        </section>
      </div>
    </main>
  );
}

function QuickAction({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-2xl bg-surface p-4 ring-1 ring-border transition-colors hover:bg-surface-raised"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-surface-raised text-xl ring-1 ring-border">
        {icon}
      </span>
      <span className="font-bold text-ink">{label}</span>
    </Link>
  );
}

function DashboardSkeleton() {
  return (
    <main className="mx-auto max-w-2xl px-5 pt-6">
      <div className="h-6 w-1/3 animate-pulse rounded bg-surface" />
      <div className="mt-6 h-32 animate-pulse rounded-2xl bg-surface" />
      <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-2xl bg-surface" />
        ))}
      </div>
    </main>
  );
}
