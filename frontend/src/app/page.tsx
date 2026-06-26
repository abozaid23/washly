"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { listWashes, type Wash } from "@/lib/api";
import { Logo, Wordmark } from "@/components/Logo";
import { WashMap } from "@/components/WashMap";

type SortMode = "nearest" | "rating" | "open";

const SORTS: { id: SortMode; label: string }[] = [
  { id: "nearest", label: "الأقرب" },
  { id: "rating", label: "الأعلى تقييم" },
  { id: "open", label: "مفتوحة دلوقتي" },
];

export default function HomePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [washes, setWashes] = useState<Wash[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("nearest");
  const [activeId, setActiveId] = useState<number | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }
    const role = localStorage.getItem("role");
    if (role && role !== "customer") {
      router.replace(`/${role === "super_admin" ? "admin" : role}`);
      return;
    }
    setReady(true);
  }, [router]);

  useEffect(() => {
    if (!ready) return;
    listWashes()
      .then((data) => {
        setWashes(data);
        setActiveId(data[0]?.id ?? null);
      })
      .catch(() => setError("معدرنا نجيب المغاسل، حاول تاني"))
      .finally(() => setLoading(false));
  }, [ready]);

  const filtered = useMemo(() => {
    let list = washes.filter((w) => w.name.includes(query) || w.address.includes(query));
    if (sort === "rating") list = [...list].sort((a, b) => b.rating - a.rating);
    if (sort === "open") list = list.filter((w) => w.is_open_now);
    return list;
  }, [washes, query, sort]);

  if (!ready) return null;

  return (
    <main className="min-h-screen pb-10">
      <header className="sticky top-0 z-sticky border-b border-border bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-5 py-4">
          <div className="flex items-center gap-3">
            <Logo size={36} />
            <Wordmark className="text-base" />
          </div>
          <Link
            href="/profile"
            className="grid size-10 place-items-center rounded-full bg-surface ring-1 ring-border text-sm font-bold text-muted transition-colors hover:text-ink"
          >
            ؟
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-5">
        <div className="mt-5">
          <input
            type="search"
            placeholder="دور على مغسلة بالاسم أو المنطقة"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-2xl bg-surface px-5 py-4 text-[15px] text-ink placeholder:text-faint ring-1 ring-border transition-shadow focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <WashMap washes={filtered} activeId={activeId} onSelect={setActiveId} />

        <div className="mt-5 flex gap-2 overflow-x-auto pb-1" dir="rtl">
          {SORTS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSort(s.id)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                sort === s.id
                  ? "bg-primary text-primary-ink"
                  : "bg-surface text-muted ring-1 ring-border hover:text-ink"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="mt-5 flex flex-col gap-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
          ) : error ? (
            <p className="py-10 text-center text-sm text-muted">{error}</p>
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">مفيش مغاسل مطابقة دلوقتي</p>
          ) : (
            filtered.map((wash, i) => (
              <WashCard
                key={wash.id}
                wash={wash}
                active={wash.id === activeId}
                style={{ animationDelay: `${i * 50}ms` }}
                onMouseEnter={() => setActiveId(wash.id)}
              />
            ))
          )}
        </div>
      </div>
    </main>
  );
}

function WashCard({
  wash,
  active,
  style,
  onMouseEnter,
}: {
  wash: Wash;
  active: boolean;
  style?: React.CSSProperties;
  onMouseEnter: () => void;
}) {
  return (
    <Link
      href={`/wash/${wash.id}`}
      onMouseEnter={onMouseEnter}
      style={style}
      className={`flex animate-[fadeUp_0.5s_cubic-bezier(0.16,1,0.3,1)_both] items-center gap-4 rounded-2xl bg-surface p-4 ring-1 transition-colors ${
        active ? "ring-primary/60" : "ring-border"
      } hover:bg-surface-raised`}
    >
      <div className="grid size-14 shrink-0 place-items-center rounded-xl bg-surface-raised text-lg font-bold text-primary ring-1 ring-border">
        {wash.name.charAt(0)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-bold text-ink">{wash.name}</h3>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              wash.is_open_now ? "bg-success/15 text-success" : "bg-faint/15 text-faint"
            }`}
          >
            {wash.is_open_now ? "مفتوحة" : "مقفولة"}
          </span>
        </div>
        <p className="mt-0.5 truncate text-sm text-muted">{wash.address}</p>
        <div className="mt-1.5 flex items-center gap-3 text-xs text-faint">
          <span className="flex items-center gap-1 font-semibold text-primary">
            ★ {wash.rating.toFixed(1)}
          </span>
          <span dir="ltr">{wash.opening_time} – {wash.closing_time}</span>
        </div>
      </div>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div className="flex animate-pulse items-center gap-4 rounded-2xl bg-surface p-4 ring-1 ring-border">
      <div className="size-14 shrink-0 rounded-xl bg-surface-raised" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-1/3 rounded bg-surface-raised" />
        <div className="h-3 w-2/3 rounded bg-surface-raised" />
      </div>
    </div>
  );
}
