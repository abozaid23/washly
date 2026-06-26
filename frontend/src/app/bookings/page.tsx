"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ApiError,
  cancelBooking,
  myBookings,
  rateBooking,
  type BookingDetail,
  type BookingStatus,
} from "@/lib/api";

const STATUS_LABEL: Record<BookingStatus, string> = {
  confirmed: "مؤكد",
  checked_in: "وصل المكان",
  completed: "خلص",
  no_show: "لم يحضر",
  cancelled: "ملغي",
};

const STATUS_STYLE: Record<BookingStatus, string> = {
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

export default function BookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<BookingDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }
    myBookings()
      .then(setBookings)
      .catch((err) => setError(err instanceof ApiError ? err.message : "معدرنا نجيب حجوزاتك"))
      .finally(() => setLoading(false));
  }, [router]);

  function updateBooking(updated: BookingDetail) {
    setBookings((prev) => prev.map((b) => (b.id === updated.id ? { ...b, ...updated } : b)));
  }

  // Not memoized on purpose: "now" must be re-evaluated every render so a
  // booking moves from upcoming to past as soon as its time passes, even
  // if `bookings` itself hasn't changed. Comparing against the wall clock
  // is inherently impure — there's no pure way to express "is this in the
  // future"; that's what the comparison means.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const upcoming: BookingDetail[] = [];
  const past: BookingDetail[] = [];
  for (const b of bookings) {
    const isFuture = new Date(b.appointment_time).getTime() >= now;
    const isActiveStatus = b.status === "confirmed" || b.status === "checked_in";
    if (isFuture && isActiveStatus) upcoming.push(b);
    else past.push(b);
  }

  return (
    <main className="min-h-screen pb-10">
      <header className="mx-auto max-w-2xl px-5 pt-5">
        <Link
          href="/"
          className="grid size-10 place-items-center rounded-full bg-surface ring-1 ring-border text-ink transition-colors hover:bg-surface-raised"
          aria-label="رجوع"
        >
          ←
        </Link>
        <h1 className="mt-5 text-xl font-bold text-ink">حجوزاتي</h1>
      </header>

      <div className="mx-auto max-w-2xl px-5">
        {loading ? (
          <div className="mt-6 flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-surface" />
            ))}
          </div>
        ) : error ? (
          <p className="mt-10 text-center text-sm text-muted">{error}</p>
        ) : bookings.length === 0 ? (
          <div className="mt-16 text-center">
            <p className="text-sm text-muted">لسه معندكش حجوزات</p>
            <Link href="/" className="mt-3 inline-block text-sm font-semibold text-primary">
              ابحث عن مغسلة
            </Link>
          </div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <section className="mt-6">
                <h2 className="mb-3 text-sm font-bold text-ink">الشغالة دلوقتي</h2>
                <div className="flex flex-col gap-3">
                  {upcoming.map((b, i) => (
                    <BookingCard
                      key={b.id}
                      booking={b}
                      onUpdate={updateBooking}
                      style={{ animationDelay: `${i * 50}ms` }}
                    />
                  ))}
                </div>
              </section>
            )}

            {past.length > 0 && (
              <section className="mt-7">
                <h2 className="mb-3 text-sm font-bold text-ink">القديمة</h2>
                <div className="flex flex-col gap-3">
                  {past.map((b, i) => (
                    <BookingCard
                      key={b.id}
                      booking={b}
                      onUpdate={updateBooking}
                      style={{ animationDelay: `${i * 50}ms` }}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function BookingCard({
  booking,
  onUpdate,
  style,
}: {
  booking: BookingDetail;
  onUpdate: (b: BookingDetail) => void;
  style?: React.CSSProperties;
}) {
  const { date, time } = formatDateTime(booking.appointment_time);
  const showCode = booking.access_code && booking.status === "confirmed";
  const canCancel = booking.status === "confirmed";

  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState(false);

  async function handleCancel() {
    if (!confirm("متأكد عايز تلغي الحجز ده؟")) return;
    setCancelling(true);
    setError(null);
    try {
      await cancelBooking(booking.id);
      onUpdate({ ...booking, status: "cancelled" });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "معدرنا نلغي الحجز");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div
      style={style}
      className="animate-[fadeUp_0.4s_cubic-bezier(0.16,1,0.3,1)_both] rounded-2xl bg-surface p-4 ring-1 ring-border"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-bold text-ink">{booking.wash_name}</h3>
          <p className="mt-0.5 truncate text-sm text-muted">{booking.wash_address}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLE[booking.status]}`}>
          {STATUS_LABEL[booking.status]}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-3 text-xs text-faint">
        <span>{date}</span>
        <span dir="ltr">{time}</span>
        {booking.vehicle_label ? <span dir="ltr">· {booking.vehicle_label}</span> : null}
      </div>

      {booking.total_price > 0 && (
        <p className="mt-1 text-sm font-bold text-primary">{booking.total_price.toFixed(0)} جنيه</p>
      )}

      {showCode ? (
        <div className="mt-3 flex items-center justify-between rounded-xl bg-surface-raised px-4 py-3">
          <span className="text-xs font-semibold text-muted">كود الوصول</span>
          <span className="text-xl font-black tracking-[0.15em] text-primary" dir="ltr">
            {booking.access_code}
          </span>
        </div>
      ) : null}

      {error ? <p className="mt-2 text-xs text-danger">{error}</p> : null}

      {canCancel && (
        <button
          onClick={handleCancel}
          disabled={cancelling}
          className="mt-3 text-sm font-semibold text-danger disabled:opacity-50"
        >
          {cancelling ? "بيتلغي..." : "إلغاء الحجز"}
        </button>
      )}

      {booking.status === "completed" && !booking.rated && !rating && (
        <button onClick={() => setRating(true)} className="mt-3 block text-sm font-semibold text-primary">
          قيّم الزيارة
        </button>
      )}

      {rating && (
        <RatingForm
          onSubmitted={() => {
            onUpdate({ ...booking, rated: true });
            setRating(false);
          }}
          bookingId={booking.id}
        />
      )}

      {booking.status === "completed" && booking.rated && (
        <p className="mt-3 text-sm text-faint">تم تقييم الزيارة دي، شكراً 🙏</p>
      )}

      {booking.status === "completed" && (
        <Link
          href={`/wash/${booking.wash_id}`}
          className="mt-3 inline-block text-sm font-semibold text-primary"
        >
          احجز تاني
        </Link>
      )}
    </div>
  );
}

function RatingForm({ bookingId, onSubmitted }: { bookingId: number; onSubmitted: () => void }) {
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      await rateBooking(bookingId, { stars, comment: comment.trim() || undefined });
      onSubmitted();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "معدرنا نسجل التقييم");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-3 rounded-xl bg-surface-raised p-3">
      <div className="flex justify-center gap-1" dir="ltr">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => setStars(n)}
            className={`text-2xl transition-colors ${n <= stars ? "text-primary" : "text-faint"}`}
            aria-label={`${n} نجوم`}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="تعليق (اختياري)"
        className="input-field mt-2 w-full resize-none"
        rows={2}
      />
      {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
      <button
        onClick={submit}
        disabled={saving}
        className="mt-2 w-full rounded-lg bg-primary py-2 text-sm font-bold text-primary-ink disabled:opacity-50"
      >
        {saving ? "جاري الحفظ..." : "إرسال التقييم"}
      </button>
    </div>
  );
}
