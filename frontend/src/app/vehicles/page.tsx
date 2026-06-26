"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ApiError,
  createVehicle,
  deleteVehicle,
  listVehicles,
  type Vehicle,
} from "@/lib/api";
import { Button } from "@/components/Button";

export default function VehiclesPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }
    listVehicles()
      .then(setVehicles)
      .catch((err) => setError(err instanceof ApiError ? err.message : "معدرنا نجيب عرباياتك"))
      .finally(() => setLoading(false));
  }, [router]);

  async function handleAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setSaving(true);
    setError(null);
    try {
      const vehicle = await createVehicle({
        brand: String(form.get("brand")),
        model: String(form.get("model")),
        year: Number(form.get("year")),
        plate_number: String(form.get("plate")),
        color: String(form.get("color") || ""),
      });
      setVehicles((prev) => [...prev, vehicle]);
      setShowForm(false);
      e.currentTarget.reset();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "معدرنا نضيف العربية");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteVehicle(id);
      setVehicles((prev) => prev.filter((v) => v.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "معدرنا نشيل العربية");
    }
  }

  return (
    <main className="min-h-screen pb-16">
      <header className="mx-auto max-w-2xl px-5 pt-5">
        <Link
          href="/profile"
          className="grid size-10 place-items-center rounded-full bg-surface ring-1 ring-border text-ink transition-colors hover:bg-surface-raised"
          aria-label="رجوع"
        >
          ←
        </Link>
        <h1 className="mt-5 text-xl font-bold text-ink">عرباياتي</h1>
      </header>

      <div className="mx-auto max-w-2xl px-5">
        {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}

        {loading ? (
          <div className="mt-6 flex flex-col gap-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-surface" />
            ))}
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-3">
            {vehicles.map((v, i) => (
              <div
                key={v.id}
                style={{ animationDelay: `${i * 50}ms` }}
                className="flex animate-[fadeUp_0.4s_cubic-bezier(0.16,1,0.3,1)_both] items-center justify-between rounded-2xl bg-surface p-4 ring-1 ring-border"
              >
                <div>
                  <p className="font-bold text-ink">{v.brand} {v.model} · {v.year}</p>
                  <p className="mt-0.5 text-sm text-muted" dir="ltr">
                    {v.plate_number}
                    {v.color ? ` · ${v.color}` : ""}
                  </p>
                </div>
                <button onClick={() => handleDelete(v.id)} className="text-sm font-semibold text-danger">
                  حذف
                </button>
              </div>
            ))}
            {vehicles.length === 0 && (
              <p className="py-10 text-center text-sm text-muted">لسه معندكش عربيات مسجلة</p>
            )}
          </div>
        )}

        {showForm ? (
          <form
            onSubmit={handleAdd}
            className="mt-5 grid grid-cols-2 gap-3 rounded-2xl bg-surface p-4 ring-1 ring-border"
          >
            <input name="brand" required placeholder="الماركة" className="input-field" />
            <input name="model" required placeholder="الموديل" className="input-field" />
            <input name="year" required type="number" placeholder="السنة" className="input-field" />
            <input name="plate" required placeholder="رقم اللوحة" className="input-field" dir="ltr" />
            <input name="color" placeholder="اللون (اختياري)" className="input-field col-span-2" />
            <div className="col-span-2 flex gap-2">
              <Button type="submit" loading={saving} className="flex-1 !py-2.5 !text-sm">
                حفظ العربية
              </Button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 text-sm text-muted">
                إلغاء
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="mt-5 w-full rounded-2xl bg-surface py-3.5 text-sm font-bold text-primary ring-1 ring-dashed ring-border"
          >
            + إضافة عربية جديدة
          </button>
        )}
      </div>
    </main>
  );
}
