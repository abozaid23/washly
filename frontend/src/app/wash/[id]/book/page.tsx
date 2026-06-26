"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

export default function BookPage() {
  const params = useParams<{ id: string }>();

  return (
    <main className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-surface-raised text-2xl ring-1 ring-border">
          🗓️
        </div>
        <h1 className="text-lg font-bold text-ink">اختيار الموعد جاي قريب</h1>
        <p className="mt-2 text-sm text-muted">
          الخطوة دي (التقويم واختيار الموظف) لسه قيد البناء.
        </p>
        <Link
          href={`/wash/${params.id}`}
          className="mt-5 inline-block text-sm font-semibold text-primary"
        >
          رجوع لمنيو الخدمات
        </Link>
      </div>
    </main>
  );
}
