"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { ApiError, ROLE_HOME, sendOtp, verifyOtp } from "@/lib/api";
import { Button } from "@/components/Button";
import { Logo, Wordmark } from "@/components/Logo";

type Step = "phone" | "otp";

const OTP_LENGTH = 6;
const RESEND_SECONDS = 45;

function normalizePhone(raw: string) {
  return raw.replace(/\D/g, "");
}

export default function LoginPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    if (step === "otp") otpRefs.current[0]?.focus();
  }, [step]);

  async function handleSendOtp(e: FormEvent) {
    e.preventDefault();
    const cleaned = normalizePhone(phone);
    if (cleaned.length < 10) {
      setError("اكتب رقم تليفون صحيح");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await sendOtp(cleaned);
      setStep("otp");
      setCooldown(RESEND_SECONDS);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "حصل خطأ في الاتصال، حاول تاني");
    } finally {
      setLoading(false);
    }
  }

  function handleOtpChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < OTP_LENGTH - 1) otpRefs.current[index + 1]?.focus();
  }

  function handleOtpKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    const code = otp.join("");
    if (code.length < OTP_LENGTH) {
      setError("اكتب الكود كامل");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const cleaned = normalizePhone(phone);
      const res = await verifyOtp(cleaned, code, name.trim() || undefined);
      localStorage.setItem("token", res.access_token);
      localStorage.setItem("role", res.role);
      router.push(ROLE_HOME[res.role] ?? "/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "الكود غير صحيح، حاول تاني");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0) return;
    setLoading(true);
    setError(null);
    try {
      await sendOtp(normalizePhone(phone));
      setCooldown(RESEND_SECONDS);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "حصل خطأ، حاول تاني");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12">
      <AmbientGlow />

      <div
        className={`relative z-10 w-full max-w-sm transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          mounted ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
        }`}
      >
        <div className="mb-10 flex flex-col items-center gap-4 text-center">
          <Logo size={64} />
          <div>
            <Wordmark className="text-2xl" />
            <p className="mt-1 text-sm text-muted">مغاسل سياراتك في إيدك</p>
          </div>
        </div>

        <div className="rounded-3xl bg-surface p-7 ring-1 ring-border shadow-[0_24px_64px_-24px_oklch(0_0_0/0.6)]">
          {step === "phone" ? (
            <form onSubmit={handleSendOtp} className="flex flex-col gap-5">
              <div>
                <h1 className="text-lg font-bold text-ink">سجل دخولك</h1>
                <p className="mt-1 text-sm text-muted">هنبعتلك كود تأكيد على رسالة نصية</p>
              </div>

              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-faint">رقم التليفون</span>
                <div className="flex items-center gap-2 rounded-xl bg-surface-raised px-4 ring-1 ring-border transition-shadow focus-within:ring-2 focus-within:ring-primary">
                  <span className="text-sm font-semibold text-muted" dir="ltr">+20</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    autoFocus
                    dir="ltr"
                    placeholder="010 1234 5678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-transparent py-3.5 text-[15px] text-ink placeholder:text-faint focus:outline-none"
                  />
                </div>
              </label>

              {error ? <p className="text-sm text-danger">{error}</p> : null}

              <Button type="submit" loading={loading} className="w-full">
                ابعت الكود
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="flex flex-col gap-5">
              <div>
                <h1 className="text-lg font-bold text-ink">اكتب الكود</h1>
                <p className="mt-1 text-sm text-muted">
                  بعتنا كود على <span dir="ltr" className="font-semibold text-ink">+20{normalizePhone(phone)}</span>
                </p>
              </div>

              <div className="flex justify-center gap-2" dir="ltr">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      otpRefs.current[i] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className="size-11 rounded-xl bg-surface-raised text-center text-lg font-bold text-ink ring-1 ring-border transition-shadow focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                ))}
              </div>

              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-faint">الاسم (اختياري)</span>
                <input
                  type="text"
                  placeholder="اسمك"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded-xl bg-surface-raised px-4 py-3.5 text-[15px] text-ink placeholder:text-faint ring-1 ring-border transition-shadow focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </label>

              {error ? <p className="text-sm text-danger">{error}</p> : null}

              <Button type="submit" loading={loading} className="w-full">
                تأكيد
              </Button>

              <button
                type="button"
                onClick={handleResend}
                disabled={cooldown > 0}
                className="text-sm font-semibold text-muted transition-colors disabled:opacity-40 enabled:hover:text-primary"
              >
                {cooldown > 0 ? `إعادة الإرسال بعد ${cooldown} ثانية` : "إعادة إرسال الكود"}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}

function AmbientGlow() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <div className="absolute left-1/2 top-[-10%] size-[560px] -translate-x-1/2 rounded-full bg-primary/[0.08] blur-[120px]" />
      <div className="absolute bottom-[-15%] left-[-10%] size-[420px] rounded-full bg-accent/[0.10] blur-[100px]" />
    </div>
  );
}
