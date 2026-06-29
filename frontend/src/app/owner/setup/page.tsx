"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ApiError,
  createService,
  myWash,
  setupWash,
  type Wash,
  type WorkingHours,
} from "@/lib/api";
import { useRoleGuard } from "@/lib/useRoleGuard";
import { Button } from "@/components/Button";
import { WashMap } from "@/components/WashMap";

const STEPS = ["البيانات الأساسية", "الموقع على الخريطة", "ساعات العمل", "الخدمات"];

const DAYS: { key: string; label: string }[] = [
  { key: "sun", label: "الأحد" },
  { key: "mon", label: "الإثنين" },
  { key: "tue", label: "الثلاثاء" },
  { key: "wed", label: "الأربعاء" },
  { key: "thu", label: "الخميس" },
  { key: "fri", label: "الجمعة" },
  { key: "sat", label: "السبت" },
];

function defaultWorkingHours(): WorkingHours {
  const hours: WorkingHours = {};
  for (const d of DAYS) {
    hours[d.key] = { open: "08:00", close: "22:00", closed: false };
  }
  return hours;
}

interface DraftService {
  name: string;
  price: string;
  duration: string;
}

function logout(router: ReturnType<typeof useRouter>) {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  router.replace("/login");
}

export default function OwnerSetupWizard() {
  const ready = useRoleGuard(["owner"]);
  const router = useRouter();

  const [wash, setWash] = useState<Wash | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // step 1
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  // step 2
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  // step 3
  const [workingHours, setWorkingHours] = useState<WorkingHours>(defaultWorkingHours());
  // step 4
  const [draftServices, setDraftServices] = useState<DraftService[]>([]);
  const [serviceName, setServiceName] = useState("");
  const [servicePrice, setServicePrice] = useState("");
  const [serviceDuration, setServiceDuration] = useState("");

  useEffect(() => {
    if (!ready) return;
    myWash()
      .then((washes) => {
        const w = washes[0];
        setWash(w ?? null);
        if (w) {
          setName(w.name);
          setDescription(w.description ?? "");
          if (w.latitude && w.longitude) setLocation({ lat: w.latitude, lng: w.longitude });
          if (w.status !== "pending_setup") {
            router.replace("/owner");
          }
        }
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "معدرنا نجيب بيانات المغسلة"))
      .finally(() => setLoading(false));
  }, [ready, router]);

  if (!ready || loading) return <WizardSkeleton />;

  if (!wash) {
    return (
      <main className="grid min-h-screen place-items-center px-6 text-center">
        <p className="text-sm text-muted">لا توجد مغسلة مرتبطة بحسابك</p>
      </main>
    );
  }

  function handleAddDraftService() {
    if (!serviceName.trim() || !servicePrice || !serviceDuration) return;
    setDraftServices((prev) => [...prev, { name: serviceName.trim(), price: servicePrice, duration: serviceDuration }]);
    setServiceName("");
    setServicePrice("");
    setServiceDuration("");
  }

  function removeDraftService(index: number) {
    setDraftServices((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleFinish() {
    if (!wash) return;
    setSubmitting(true);
    setError(null);
    try {
      const updated = await setupWash(wash.id, {
        name,
        description,
        latitude: location?.lat,
        longitude: location?.lng,
        working_hours: workingHours,
      });

      for (const s of draftServices) {
        await createService(wash.id, {
          name: s.name,
          price: Number(s.price),
          duration_minutes: Number(s.duration),
        });
      }

      setWash(updated);
      router.replace("/owner");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "معدرنا نحفظ بيانات المغسلة");
    } finally {
      setSubmitting(false);
    }
  }

  function canGoNext() {
    if (step === 0) return name.trim().length > 0;
    if (step === 1) return location !== null;
    return true;
  }

  return (
    <main className="min-h-screen pb-16">
      <header className="mx-auto flex max-w-2xl items-center justify-between px-5 pt-6">
        <div>
          <p className="text-xs font-semibold text-faint">إعداد المغسلة</p>
          <h1 className="mt-1 text-xl font-bold text-ink">خطوة {step + 1} من {STEPS.length}</h1>
        </div>
        <button onClick={() => logout(router)} className="text-sm font-semibold text-muted hover:text-danger">
          خروج
        </button>
      </header>

      <div className="mx-auto max-w-2xl px-5">
        {/* Progress bar */}
        <div className="mt-6 flex items-center gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex flex-1 flex-col items-center gap-1.5">
              <div
                className={`h-1.5 w-full rounded-full transition-colors ${
                  i <= step ? "bg-primary" : "bg-surface-raised"
                }`}
              />
              <span className={`text-[11px] font-semibold ${i === step ? "text-ink" : "text-faint"}`}>
                {label}
              </span>
            </div>
          ))}
        </div>

        {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}

        <div className="mt-7 rounded-2xl bg-surface p-5 ring-1 ring-border">
          {step === 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="text-base font-bold text-ink">اسم المغسلة ووصفها</h2>
              <label className="text-sm font-semibold text-muted">
                اسم المغسلة
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field mt-1.5 w-full"
                  placeholder="مثلاً: مغسلة النجمة"
                />
              </label>
              <label className="text-sm font-semibold text-muted">
                وصف مختصر (اختياري)
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input-field mt-1.5 w-full"
                  rows={3}
                  placeholder="عرّف عن مغسلتك في جملتين"
                />
              </label>
            </div>
          )}

          {step === 1 && (
            <div className="flex flex-col gap-3">
              <h2 className="text-base font-bold text-ink">حدد موقع المغسلة على الخريطة</h2>
              <p className="text-xs text-faint">اضغط على الخريطة لتحديد المكان بالضبط</p>
              <WashMap
                washes={[]}
                activeId={null}
                onSelect={() => {}}
                pickable
                pickedLocation={location}
                onPick={setLocation}
                heightClassName="h-64"
              />
              {location ? (
                <p className="text-xs text-faint" dir="ltr">
                  {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                </p>
              ) : (
                <p className="text-xs text-warning">لسه محتاج تحدد المكان</p>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-3">
              <h2 className="text-base font-bold text-ink">ساعات العمل</h2>
              <div className="flex flex-col gap-2">
                {DAYS.map((d) => {
                  const day = workingHours[d.key];
                  return (
                    <div key={d.key} className="flex items-center gap-2 rounded-xl bg-surface-raised p-3 ring-1 ring-border">
                      <span className="w-20 shrink-0 text-sm font-bold text-ink">{d.label}</span>
                      {day.closed ? (
                        <span className="flex-1 text-xs text-faint">عطلة</span>
                      ) : (
                        <div className="flex flex-1 items-center gap-2" dir="ltr">
                          <input
                            type="time"
                            value={day.open}
                            onChange={(e) =>
                              setWorkingHours((prev) => ({
                                ...prev,
                                [d.key]: { ...prev[d.key], open: e.target.value },
                              }))
                            }
                            className="input-field flex-1 !py-1.5 text-xs"
                          />
                          <span className="text-xs text-faint">إلى</span>
                          <input
                            type="time"
                            value={day.close}
                            onChange={(e) =>
                              setWorkingHours((prev) => ({
                                ...prev,
                                [d.key]: { ...prev[d.key], close: e.target.value },
                              }))
                            }
                            className="input-field flex-1 !py-1.5 text-xs"
                          />
                        </div>
                      )}
                      <button
                        onClick={() =>
                          setWorkingHours((prev) => ({
                            ...prev,
                            [d.key]: { ...prev[d.key], closed: !prev[d.key].closed },
                          }))
                        }
                        className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-bold ${
                          day.closed ? "bg-success/15 text-success" : "bg-danger/15 text-danger"
                        }`}
                      >
                        {day.closed ? "فتح اليوم" : "عطلة"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-3">
              <h2 className="text-base font-bold text-ink">إضافة الخدمات</h2>
              <div className="flex flex-col gap-2">
                {draftServices.map((s, i) => (
                  <div key={i} className="flex items-center justify-between rounded-xl bg-surface-raised p-3 ring-1 ring-border">
                    <div className="min-w-0">
                      <p className="font-bold text-ink">{s.name}</p>
                      <p className="text-xs text-faint">{s.price} ج · {s.duration} دقيقة</p>
                    </div>
                    <button onClick={() => removeDraftService(i)} className="text-xs font-bold text-danger">
                      حذف
                    </button>
                  </div>
                ))}
                {draftServices.length === 0 && (
                  <p className="text-sm text-muted">لسه مفيش خدمات مضافة — ممكن تضيف بعدين من لوحة التحكم</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-surface-raised p-3 ring-1 ring-border">
                <input
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  placeholder="اسم الخدمة"
                  className="input-field col-span-2"
                />
                <input
                  value={servicePrice}
                  onChange={(e) => setServicePrice(e.target.value)}
                  type="number"
                  placeholder="السعر"
                  className="input-field"
                />
                <input
                  value={serviceDuration}
                  onChange={(e) => setServiceDuration(e.target.value)}
                  type="number"
                  placeholder="المدة (دقيقة)"
                  className="input-field"
                />
                <button
                  onClick={handleAddDraftService}
                  className="col-span-2 rounded-xl bg-surface py-2.5 text-sm font-bold text-primary ring-1 ring-dashed ring-border"
                >
                  + إضافة الخدمة للقائمة
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-5 flex gap-3">
          {step > 0 && (
            <Button variant="ghost" onClick={() => setStep((s) => s - 1)} className="flex-1 !py-3">
              السابق
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canGoNext()} className="flex-1 !py-3">
              التالي
            </Button>
          ) : (
            <Button onClick={handleFinish} loading={submitting} className="flex-1 !py-3">
              إنهاء وإرسال للموافقة
            </Button>
          )}
        </div>
      </div>
    </main>
  );
}

function WizardSkeleton() {
  return (
    <main className="mx-auto max-w-2xl px-5 pt-6">
      <div className="h-6 w-1/3 animate-pulse rounded bg-surface" />
      <div className="mt-6 h-64 animate-pulse rounded-2xl bg-surface" />
    </main>
  );
}
