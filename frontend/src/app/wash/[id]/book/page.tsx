"use client";

import { Suspense, useEffect, useMemo, useState, type FormEvent } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ApiError,
  checkAvailability,
  createBooking,
  createVehicle,
  getWash,
  joinWaitlist,
  listServices,
  listVehicles,
  type Service,
  type Vehicle,
  type Wash,
} from "@/lib/api";
import { Button } from "@/components/Button";

const DAY_NAMES = ["الأحد", "الاتنين", "التلات", "الأربع", "الخميس", "الجمعة", "السبت"];
const SLOT_STEP_MINUTES = 30;

interface DaySlots {
  date: Date;
  label: string;
}

function buildDays(): DaySlots[] {
  const days: DaySlots[] = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const label = i === 0 ? "النهاردة" : i === 1 ? "بكرة" : DAY_NAMES[d.getDay()];
    days.push({ date: d, label });
  }
  return days;
}

function parseHHMM(value: string): { h: number; m: number } {
  const [h, m] = value.split(":").map(Number);
  return { h, m: m ?? 0 };
}

function buildSlots(day: Date, opening: string, closing: string): Date[] {
  const { h: oh, m: om } = parseHHMM(opening);
  const { h: ch, m: cm } = parseHHMM(closing);
  const start = new Date(day);
  start.setHours(oh, om, 0, 0);
  const end = new Date(day);
  end.setHours(ch, cm, 0, 0);

  const slots: Date[] = [];
  const now = new Date();
  for (let t = new Date(start); t < end; t = new Date(t.getTime() + SLOT_STEP_MINUTES * 60000)) {
    if (t > now) slots.push(new Date(t));
  }
  return slots;
}

function formatTime(d: Date) {
  return d.toLocaleTimeString("ar-EG", { hour: "numeric", minute: "2-digit" });
}

export default function BookPage() {
  return (
    <Suspense fallback={<BookSkeleton />}>
      <BookPageContent />
    </Suspense>
  );
}

function BookPageContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const washId = params.id;
  const selectedServiceIds = useMemo(
    () => (searchParams.get("services") ?? "").split(",").filter(Boolean).map(Number),
    [searchParams]
  );

  const [wash, setWash] = useState<Wash | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [vehicleId, setVehicleId] = useState<number | null>(null);
  const [addingVehicle, setAddingVehicle] = useState(false);

  const [dayIndex, setDayIndex] = useState(0);
  const days = useMemo(() => buildDays(), []);
  const slots = useMemo(
    () => (wash ? buildSlots(days[dayIndex].date, wash.opening_time, wash.closing_time) : []),
    [wash, days, dayIndex]
  );
  const [availability, setAvailability] = useState<Map<number, boolean>>(new Map());
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);

  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [booking, setBooking] = useState<{ id: number; access_code: string | null } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }
    Promise.all([getWash(washId), listServices(washId), listVehicles()])
      .then(([washData, serviceData, vehicleData]) => {
        setWash(washData);
        setServices(serviceData);
        setVehicles(vehicleData);
        if (vehicleData.length > 0) setVehicleId(vehicleData[0].id);
        else setAddingVehicle(true);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "معدرنا نجيب البيانات"))
      .finally(() => setLoading(false));
  }, [washId, router]);

  useEffect(() => {
    if (!wash || slots.length === 0) return;
    // Resetting UI state right before kicking off the fetch this effect
    // exists to perform — not a synchronization of unrelated state.
    /* eslint-disable react-hooks/set-state-in-effect */
    setSelectedSlot(null);
    setSlotsLoading(true);
    setSlotsError(null);
    /* eslint-enable react-hooks/set-state-in-effect */

    Promise.all(slots.map((s) => checkAvailability(washId, s.toISOString())))
      .then((results) => {
        const map = new Map<number, boolean>();
        results.forEach((r, i) => map.set(i, r.available));
        setAvailability(map);
      })
      .catch(() => {
        setAvailability(new Map());
        setSlotsError("معدرنا نتأكد من المواعيد المتاحة، ممكن بعض المواعيد تكون ممتلئة فعلاً");
      })
      .finally(() => setSlotsLoading(false));
  }, [wash, slots, washId]);

  const picked = useMemo(
    () => services.filter((s) => selectedServiceIds.includes(s.id)),
    [services, selectedServiceIds]
  );
  const totalPrice = picked.reduce((sum, s) => sum + s.price, 0);
  const totalMinutes = picked.reduce((sum, s) => sum + s.duration_minutes, 0);

  async function handleAddVehicle(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      const vehicle = await createVehicle({
        brand: String(form.get("brand")),
        model: String(form.get("model")),
        year: Number(form.get("year")),
        plate_number: String(form.get("plate")),
        color: String(form.get("color") || ""),
      });
      setVehicles((prev) => [...prev, vehicle]);
      setVehicleId(vehicle.id);
      setAddingVehicle(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "معدرنا نضيف العربية");
    }
  }

  async function handleConfirm() {
    if (!selectedSlot || !wash) return;
    setConfirming(true);
    setConfirmError(null);
    try {
      const result = await createBooking({
        wash_id: wash.id,
        appointment_time: selectedSlot.toISOString(),
        vehicle_id: vehicleId ?? undefined,
        service_ids: selectedServiceIds,
      });
      setBooking({ id: result.id, access_code: result.access_code });
    } catch (err) {
      setConfirmError(err instanceof ApiError ? err.message : "معدرنا نأكد الحجز، حاول تاني");
    } finally {
      setConfirming(false);
    }
  }

  async function handleJoinWaitlist(slot: Date) {
    if (!wash) return;
    try {
      await joinWaitlist(wash.id, slot.toISOString());
      setConfirmError(null);
      alert("تم إضافتك لقائمة الانتظار، هنبعتلك إشعار لو فيه مكان فاضي");
    } catch (err) {
      setConfirmError(err instanceof ApiError ? err.message : "معدرنا نضيفك لقائمة الانتظار");
    }
  }

  if (loading) return <BookSkeleton />;

  if (booking) {
    return (
      <main className="grid min-h-screen place-items-center px-6 text-center">
        <div className="w-full max-w-sm animate-[fadeUp_0.5s_cubic-bezier(0.16,1,0.3,1)_both]">
          <div className="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-primary text-2xl text-primary-ink">
            ✓
          </div>
          <h1 className="text-lg font-bold text-ink">تم تأكيد الحجز</h1>
          <p className="mt-2 text-sm text-muted">
            رقم الحجز <span className="font-semibold text-ink">#{booking.id}</span> في {wash?.name}
          </p>
          {selectedSlot ? (
            <p className="mt-1 text-sm text-muted" dir="ltr">
              {selectedSlot.toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long" })} ·{" "}
              {formatTime(selectedSlot)}
            </p>
          ) : null}

          {booking.access_code ? (
            <div className="mt-6 rounded-3xl bg-surface p-6 ring-1 ring-primary/40">
              <p className="text-xs font-semibold text-muted">كود الوصول — اعطيه للموظف لما توصل</p>
              <p className="mt-3 text-5xl font-black tracking-[0.2em] text-primary" dir="ltr">
                {booking.access_code}
              </p>
            </div>
          ) : null}

          <p className="mx-auto mt-5 max-w-xs text-xs text-faint">
            من غير الكود ده، الموظف مش هيقدر يأكد وصولك. هتلاقي الكود برضه في صفحة &quot;حجوزاتي&quot;.
          </p>
          <Link href="/" className="mt-6 inline-block text-sm font-semibold text-primary">
            رجوع للرئيسية
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-32">
      <header className="mx-auto max-w-2xl px-5 pt-5">
        <Link
          href={`/wash/${washId}`}
          className="grid size-10 place-items-center rounded-full bg-surface ring-1 ring-border text-ink transition-colors hover:bg-surface-raised"
          aria-label="رجوع"
        >
          ←
        </Link>
        <h1 className="mt-5 text-xl font-bold text-ink">اختار الميعاد</h1>
        {wash ? <p className="mt-1 text-sm text-muted">{wash.name}</p> : null}
      </header>

      <div className="mx-auto max-w-2xl px-5">
        {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}

        <section className="mt-6">
          <h2 className="mb-3 text-sm font-bold text-ink">عربيتك</h2>
          {!addingVehicle ? (
            <div className="flex flex-wrap gap-2">
              {vehicles.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setVehicleId(v.id)}
                  className={`rounded-xl px-4 py-3 text-sm ring-1 transition-colors ${
                    vehicleId === v.id
                      ? "bg-surface-raised font-bold text-ink ring-primary/60"
                      : "bg-surface text-muted ring-border hover:text-ink"
                  }`}
                >
                  {v.brand} {v.model} <span dir="ltr">· {v.plate_number}</span>
                </button>
              ))}
              <button
                onClick={() => setAddingVehicle(true)}
                className="rounded-xl px-4 py-3 text-sm font-semibold text-primary ring-1 ring-dashed ring-border"
              >
                + عربية جديدة
              </button>
            </div>
          ) : (
            <form
              onSubmit={handleAddVehicle}
              className="grid grid-cols-2 gap-3 rounded-2xl bg-surface p-4 ring-1 ring-border"
            >
              <input name="brand" required placeholder="الماركة" className="input-field" />
              <input name="model" required placeholder="الموديل" className="input-field" />
              <input name="year" required type="number" placeholder="السنة" className="input-field" />
              <input name="plate" required placeholder="رقم اللوحة" className="input-field" dir="ltr" />
              <input name="color" placeholder="اللون (اختياري)" className="input-field col-span-2" />
              <div className="col-span-2 flex gap-2">
                <Button type="submit" className="flex-1 !py-2.5 !text-sm">
                  حفظ العربية
                </Button>
                {vehicles.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setAddingVehicle(false)}
                    className="px-4 text-sm text-muted"
                  >
                    إلغاء
                  </button>
                )}
              </div>
            </form>
          )}
        </section>

        <section className="mt-7">
          <h2 className="mb-3 text-sm font-bold text-ink">اليوم</h2>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {days.map((d, i) => (
              <button
                key={i}
                onClick={() => setDayIndex(i)}
                className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                  dayIndex === i
                    ? "bg-primary text-primary-ink"
                    : "bg-surface text-muted ring-1 ring-border hover:text-ink"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-6">
          <h2 className="mb-3 text-sm font-bold text-ink">الميعاد</h2>
          {slotsLoading ? (
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="h-11 animate-pulse rounded-xl bg-surface" />
              ))}
            </div>
          ) : slots.length === 0 ? (
            <p className="text-sm text-muted">مفيش مواعيد متاحة في اليوم ده</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {slots.map((slot, i) => {
                const available = availability.get(i) ?? true;
                const isSelected = selectedSlot?.getTime() === slot.getTime();
                return (
                  <button
                    key={slot.getTime()}
                    onClick={() => (available ? setSelectedSlot(slot) : handleJoinWaitlist(slot))}
                    className={`rounded-xl py-2.5 text-sm font-semibold transition-colors ${
                      isSelected
                        ? "bg-primary text-primary-ink"
                        : available
                        ? "bg-surface text-ink ring-1 ring-border hover:bg-surface-raised"
                        : "bg-surface/40 text-faint ring-1 ring-border/50 line-through"
                    }`}
                    dir="ltr"
                  >
                    {formatTime(slot)}
                  </button>
                );
              })}
            </div>
          )}
          {slotsError ? (
            <p className="mt-2 text-xs text-danger">{slotsError}</p>
          ) : (
            <p className="mt-2 text-xs text-faint">المواعيد المشطوبة ممتلئة — اضغط عليها للدخول في قائمة الانتظار</p>
          )}
        </section>
      </div>

      {selectedSlot && (
        <div className="fixed inset-x-0 bottom-0 z-sticky border-t border-border bg-bg/95 px-5 py-4 backdrop-blur-md">
          <div className="mx-auto max-w-2xl">
            {confirmError ? <p className="mb-2 text-sm text-danger">{confirmError}</p> : null}
            <div className="flex items-center justify-between gap-4">
              <div className="text-sm">
                <p className="font-bold text-ink">{totalPrice.toFixed(0)} جنيه</p>
                <p className="text-faint" dir="ltr">
                  {formatTime(selectedSlot)} · {totalMinutes} دقيقة
                </p>
              </div>
              <Button onClick={handleConfirm} loading={confirming} disabled={!vehicleId} className="flex-1">
                تأكيد الحجز
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function BookSkeleton() {
  return (
    <main className="mx-auto max-w-2xl px-5 pt-5">
      <div className="size-10 animate-pulse rounded-full bg-surface" />
      <div className="mt-5 h-6 w-1/3 animate-pulse rounded bg-surface" />
      <div className="mt-8 flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-11 w-20 animate-pulse rounded-xl bg-surface" />
        ))}
      </div>
    </main>
  );
}
