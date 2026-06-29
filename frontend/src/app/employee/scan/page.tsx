"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ApiError,
  bookingByCode,
  checkinBooking,
  updateBookingStatus,
  type BookingDetail,
} from "@/lib/api";
import { useRoleGuard } from "@/lib/useRoleGuard";
import { Button } from "@/components/Button";

const STATUS_LABEL: Record<string, string> = {
  confirmed: "في الانتظار",
  checked_in: "جاري الشغل عليها",
  completed: "خلصت",
  no_show: "لم يحضر",
  cancelled: "ملغي",
};

function logout(router: ReturnType<typeof useRouter>) {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  router.replace("/login");
}

export default function EmployeeScanPage() {
  const ready = useRoleGuard(["employee", "supervisor"]);
  const router = useRouter();

  const [code, setCode] = useState("");
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  if (!ready) return null;

  async function handleLookup() {
    if (code.trim().length === 0) return;
    setLoading(true);
    setError(null);
    setBooking(null);
    try {
      const b = await bookingByCode(code.trim());
      setBooking(b);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "معدرنا نجيب الحجز");
    } finally {
      setLoading(false);
    }
  }

  async function handleStart() {
    if (!booking) return;
    setActionLoading(true);
    setError(null);
    try {
      // "بدء الخدمة" يستخدم نفس مسار تأكيد الوصول الموجود فعليًا (كود
      // الوصول بيتأكد، والحجز يتحول لـ checked_in — أي إن الخدمة بدأت).
      await checkinBooking(booking.id, code.trim());
      const refreshed = await bookingByCode(code.trim());
      setBooking(refreshed);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "معدرنا نبدأ الخدمة");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleComplete() {
    if (!booking) return;
    setActionLoading(true);
    setError(null);
    try {
      await updateBookingStatus(booking.id, "completed");
      const refreshed = await bookingByCode(code.trim()).catch(() => null);
      setBooking(refreshed ?? { ...booking, status: "completed" });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "معدرنا نخلّص الخدمة");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <main className="min-h-screen pb-16">
      <header className="mx-auto flex max-w-md items-center justify-between px-5 pt-6">
        <div>
          <p className="text-xs font-semibold text-faint">استلام عميل</p>
          <h1 className="mt-1 text-xl font-bold text-ink">كود العميل</h1>
        </div>
        <button onClick={() => logout(router)} className="text-sm font-semibold text-muted hover:text-danger">
          خروج
        </button>
      </header>

      <div className="mx-auto max-w-md px-5">
        <Link href="/employee" className="mt-4 inline-block text-sm font-semibold text-muted hover:text-ink">
          ← رجوع للوحة التحكم
        </Link>

        <div className="mt-5 rounded-2xl bg-surface p-5 ring-1 ring-border">
          <label className="text-sm font-semibold text-muted">
            ادخل كود الحجز (6 أرقام)
            <input
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              onKeyDown={(e) => e.key === "Enter" && handleLookup()}
              placeholder="000000"
              maxLength={6}
              dir="ltr"
              className="input-field mt-2 w-full text-center text-3xl font-black tracking-[0.3em]"
            />
          </label>
          <Button onClick={handleLookup} loading={loading} className="mt-4 w-full !py-3.5">
            بحث
          </Button>
        </div>

        {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}

        {booking ? (
          <div className="mt-5 rounded-2xl bg-surface p-5 ring-1 ring-border">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-ink">{booking.customer_name || booking.customer_phone || "عميل"}</h2>
              <span className="rounded-full bg-surface-raised px-2.5 py-1 text-[11px] font-semibold text-muted">
                {STATUS_LABEL[booking.status] ?? booking.status}
              </span>
            </div>
            {booking.vehicle_label ? (
              <p className="mt-1 text-sm text-faint" dir="ltr">{booking.vehicle_label}</p>
            ) : null}

            <div className="mt-4 flex items-center justify-between rounded-xl bg-surface-raised p-3">
              <span className="text-sm text-muted">إجمالي المطلوب</span>
              <span className="text-lg font-black text-primary">{booking.total_price.toFixed(0)} ج</span>
            </div>

            <div className="mt-5 flex flex-col gap-2">
              {booking.status === "confirmed" && (
                <Button onClick={handleStart} loading={actionLoading} className="w-full !py-3.5">
                  ابدأ الخدمة
                </Button>
              )}
              {booking.status === "checked_in" && (
                <Button onClick={handleComplete} loading={actionLoading} className="w-full !py-3.5">
                  تمت الخدمة
                </Button>
              )}
              {booking.status === "completed" && (
                <p className="text-center text-sm font-semibold text-success">الخدمة خلصت بنجاح ✓</p>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
