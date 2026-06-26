"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ApiError, getWash, listServices, type Service, type Wash } from "@/lib/api";
import { Button } from "@/components/Button";

export default function WashDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const washId = params.id;

  const [wash, setWash] = useState<Wash | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }

    Promise.all([getWash(washId), listServices(washId)])
      .then(([washData, serviceData]) => {
        setWash(washData);
        setServices(serviceData);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "معدرنا نجيب بيانات المغسلة");
      })
      .finally(() => setLoading(false));
  }, [washId, router]);

  function toggleService(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const summary = useMemo(() => {
    const picked = services.filter((s) => selected.has(s.id));
    return {
      count: picked.length,
      price: picked.reduce((sum, s) => sum + s.price, 0),
      minutes: picked.reduce((sum, s) => sum + s.duration_minutes, 0),
    };
  }, [services, selected]);

  if (loading) return <DetailSkeleton />;

  if (error || !wash) {
    return (
      <main className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <p className="text-sm text-muted">{error ?? "المغسلة غير موجودة"}</p>
          <Link href="/" className="mt-3 inline-block text-sm font-semibold text-primary">
            رجوع للرئيسية
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-32">
      <header className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute left-1/2 top-[-30%] size-[420px] -translate-x-1/2 rounded-full bg-primary/[0.12] blur-[100px]" />
        </div>

        <div className="relative mx-auto max-w-2xl px-5 pt-5">
          <Link
            href="/"
            className="grid size-10 place-items-center rounded-full bg-surface ring-1 ring-border text-ink transition-colors hover:bg-surface-raised"
            aria-label="رجوع"
          >
            ←
          </Link>

          <div className="mt-6 flex items-start gap-4">
            <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-surface-raised text-2xl font-bold text-primary ring-1 ring-border">
              {wash.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-ink">{wash.name}</h1>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    wash.is_open_now ? "bg-success/15 text-success" : "bg-faint/15 text-faint"
                  }`}
                >
                  {wash.is_open_now ? "مفتوحة" : "مقفولة"}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted">{wash.address}</p>
              <div className="mt-2 flex items-center gap-3 text-xs text-faint">
                <span className="flex items-center gap-1 font-semibold text-primary">
                  ★ {wash.rating.toFixed(1)}
                </span>
                <span dir="ltr">{wash.opening_time} – {wash.closing_time}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-5">
        <h2 className="mt-8 mb-3 text-base font-bold text-ink">منيو الخدمات</h2>

        {services.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">المغسلة لسه مضيفة خدمات</p>
        ) : (
          <div className="flex flex-col gap-3">
            {services.map((service, i) => (
              <ServiceRow
                key={service.id}
                service={service}
                checked={selected.has(service.id)}
                onToggle={() => toggleService(service.id)}
                style={{ animationDelay: `${i * 40}ms` }}
              />
            ))}
          </div>
        )}
      </div>

      {summary.count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-sticky border-t border-border bg-bg/95 px-5 py-4 backdrop-blur-md">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
            <div className="text-sm">
              <p className="font-bold text-ink">{summary.price.toFixed(0)} جنيه</p>
              <p className="text-faint">{summary.count} خدمة · {summary.minutes} دقيقة</p>
            </div>
            <Button
              onClick={() =>
                router.push(`/wash/${washId}/book?services=${[...selected].join(",")}`)
              }
              className="flex-1"
            >
              اختار الموعد
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}

function ServiceRow({
  service,
  checked,
  onToggle,
  style,
}: {
  service: Service;
  checked: boolean;
  onToggle: () => void;
  style?: React.CSSProperties;
}) {
  return (
    <button
      onClick={onToggle}
      style={style}
      className={`flex animate-[fadeUp_0.4s_cubic-bezier(0.16,1,0.3,1)_both] items-start gap-3 rounded-2xl p-4 text-right ring-1 transition-colors ${
        checked ? "bg-surface-raised ring-primary/60" : "bg-surface ring-border hover:bg-surface-raised"
      }`}
    >
      <span
        className={`mt-1 grid size-5 shrink-0 place-items-center rounded-full ring-1 transition-colors ${
          checked ? "bg-primary ring-primary text-primary-ink" : "ring-border text-transparent"
        }`}
      >
        ✓
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="font-bold text-ink">{service.name}</span>
          <span className="shrink-0 font-bold text-primary">{service.price.toFixed(0)} ج</span>
        </span>
        {service.description ? (
          <span className="mt-1 block text-sm text-muted">{service.description}</span>
        ) : null}
        <span className="mt-1.5 block text-xs text-faint" dir="ltr">
          {service.duration_minutes} دقيقة
        </span>
      </span>
    </button>
  );
}

function DetailSkeleton() {
  return (
    <main className="mx-auto max-w-2xl px-5 pt-5">
      <div className="size-10 animate-pulse rounded-full bg-surface" />
      <div className="mt-6 flex items-start gap-4">
        <div className="size-16 animate-pulse rounded-2xl bg-surface" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-5 w-1/2 animate-pulse rounded bg-surface" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-surface" />
        </div>
      </div>
      <div className="mt-8 flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-2xl bg-surface" />
        ))}
      </div>
    </main>
  );
}
