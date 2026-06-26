"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ApiError, getMe, updateMe, type Me } from "@/lib/api";
import { Button } from "@/components/Button";

const ROLE_LABEL: Record<string, string> = {
  customer: "عميل",
  employee: "موظف",
  supervisor: "كبير موظفين",
  owner: "صاحب مغسلة",
  super_admin: "سوبر أدمن",
};

export default function ProfilePage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }
    getMe()
      .then(setMe)
      .catch((err) => setError(err instanceof ApiError ? err.message : "معدرنا نجيب بياناتك"))
      .finally(() => setLoading(false));
  }, [router]);

  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setSaving(true);
    setError(null);
    try {
      const updated = await updateMe({
        name: String(form.get("name") || ""),
        email: String(form.get("email") || ""),
      });
      setMe(updated);
      setEditing(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "معدرنا نحفظ التغييرات");
    } finally {
      setSaving(false);
    }
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    router.replace("/login");
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-2xl px-5 pt-6">
        <div className="h-6 w-1/3 animate-pulse rounded bg-surface" />
        <div className="mt-6 h-40 animate-pulse rounded-2xl bg-surface" />
      </main>
    );
  }

  if (!me) {
    return (
      <main className="grid min-h-screen place-items-center px-6 text-center">
        <p className="text-sm text-muted">{error ?? "معدرنا نجيب بياناتك"}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-16">
      <header className="mx-auto max-w-2xl px-5 pt-5">
        <Link
          href="/"
          className="grid size-10 place-items-center rounded-full bg-surface ring-1 ring-border text-ink transition-colors hover:bg-surface-raised"
          aria-label="رجوع"
        >
          ←
        </Link>
        <h1 className="mt-5 text-xl font-bold text-ink">البروفايل</h1>
      </header>

      <div className="mx-auto max-w-2xl px-5">
        {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}

        <div className="mt-6 flex items-center gap-4">
          <div className="grid size-16 place-items-center rounded-2xl bg-surface-raised text-2xl font-bold text-primary ring-1 ring-border">
            {(me.name || me.phone).charAt(0)}
          </div>
          <div>
            <p className="text-lg font-bold text-ink">{me.name || "بدون اسم"}</p>
            <p className="text-sm text-muted" dir="ltr">{me.phone}</p>
            <span className="mt-1 inline-block rounded-full bg-primary/15 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
              {ROLE_LABEL[me.role] ?? me.role}
            </span>
          </div>
        </div>

        {editing ? (
          <form onSubmit={handleSave} className="mt-6 flex flex-col gap-3 rounded-2xl bg-surface p-4 ring-1 ring-border">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-faint">الاسم</span>
              <input name="name" defaultValue={me.name ?? ""} className="input-field" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-faint">الإيميل</span>
              <input name="email" type="email" defaultValue={me.email ?? ""} className="input-field" dir="ltr" />
            </label>
            <div className="flex gap-2">
              <Button type="submit" loading={saving} className="flex-1 !py-2.5 !text-sm">
                حفظ
              </Button>
              <button type="button" onClick={() => setEditing(false)} className="px-4 text-sm text-muted">
                إلغاء
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="mt-6 w-full rounded-2xl bg-surface py-3 text-sm font-bold text-primary ring-1 ring-border"
          >
            تعديل البيانات
          </button>
        )}

        <div className="mt-6 flex flex-col gap-2">
          <Link
            href="/vehicles"
            className="flex items-center justify-between rounded-2xl bg-surface p-4 ring-1 ring-border transition-colors hover:bg-surface-raised"
          >
            <span className="font-semibold text-ink">عرباياتي</span>
            <span className="text-faint">←</span>
          </Link>
          <Link
            href="/bookings"
            className="flex items-center justify-between rounded-2xl bg-surface p-4 ring-1 ring-border transition-colors hover:bg-surface-raised"
          >
            <span className="font-semibold text-ink">حجوزاتي</span>
            <span className="text-faint">←</span>
          </Link>
        </div>

        <button onClick={logout} className="mt-6 w-full rounded-2xl py-3 text-sm font-bold text-danger ring-1 ring-danger/30">
          خروج
        </button>
      </div>
    </main>
  );
}
