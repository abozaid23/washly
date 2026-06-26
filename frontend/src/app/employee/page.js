"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const T = {
  bg: "#030508",
  card: "rgba(8,12,16,0.95)",
  border: "rgba(176,196,216,0.12)",
  accent: "#b0c4d8",
  accentGlow: "rgba(176,196,216,0.15)",
  text: "#e0eaf5",
  sub: "#4a6070",
  success: "#4ade80",
  danger: "#f87171",
  warning: "#fbbf24",
};

export default function EmployeeDashboard() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [visible, setVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    if (!token) { router.push("/"); return; }
    if (role !== "employee" && role !== "supervisor" && role !== "super_admin") { router.push("/dashboard"); return; }
    setTimeout(() => setVisible(true), 100);
    fetchTodayBookings(token);
  }, []);

  function fetchTodayBookings(token) {
    fetch("http://127.0.0.1:8000/bookings/today", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => { if (Array.isArray(data)) setBookings(data); setLoading(false); })
      .catch(() => setLoading(false));
  }

  async function updateStatus(bookingId, status) {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`http://127.0.0.1:8000/bookings/${bookingId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        fetchTodayBookings(token);
        setMessage("تم تحديث الحالة");
        setTimeout(() => setMessage(""), 2000);
      }
    } catch { setMessage("فشل التحديث"); }
  }

  const statusColor = (s) => s === "confirmed" ? T.accent : s === "checked_in" ? T.warning : s === "completed" ? T.success : T.danger;
  const statusLabel = (s) => s === "confirmed" ? "مؤكد" : s === "checked_in" ? "وصل" : s === "completed" ? "مكتمل" : s === "no_show" ? "لم يحضر" : s;

  if (loading) return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: T.sub, letterSpacing: "2px", fontSize: "12px" }}>جاري التحميل...</p>
    </div>
  );

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #030508 0%, #080d12 30%, #030508 70%, #050810 100%)",
      padding: "24px 20px 40px",
    }}>
      <div style={{ maxWidth: "600px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: "28px",
          opacity: visible ? 1 : 0, transition: "all 0.6s ease",
        }}>
          <div>
            <h1 style={{ color: T.accent, fontSize: "20px", fontWeight: "800", margin: "0 0 4px", letterSpacing: "2px" }}>شيفتي اليوم</h1>
            <p style={{ color: T.sub, fontSize: "11px", margin: 0 }}>{bookings.length} حجز اليوم</p>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={() => router.push("/leave")} style={{
              background: `${T.warning}0a`, color: T.warning,
              border: `1px solid ${T.warning}33`, borderRadius: "10px",
              padding: "7px 12px", fontSize: "12px", cursor: "pointer",
            }}>طلب إجازة</button>
            <button onClick={() => router.push("/dashboard")} style={{
              background: "none", border: "none", color: T.sub, cursor: "pointer", fontSize: "13px",
            }}>← رجوع</button>
          </div>
        </div>

        {message && (
          <p style={{ color: T.success, marginBottom: "16px", fontSize: "13px", textAlign: "center" }}>{message}</p>
        )}

        {bookings.length === 0 && (
          <div style={{
            background: T.card, borderRadius: "20px", padding: "40px 20px",
            border: `1px solid ${T.border}`, textAlign: "center",
          }}>
            <p style={{ color: T.sub, fontSize: "13px" }}>لا توجد حجوزات اليوم</p>
          </div>
        )}

        {bookings.map((booking, i) => (
          <div key={booking.id} style={{
            background: T.card, borderRadius: "20px", padding: "20px",
            border: `1px solid ${T.border}`, marginBottom: "12px",
            boxShadow: `0 4px 24px rgba(0,0,0,0.4)`,
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(20px)",
            transition: `all 0.6s cubic-bezier(0.16,1,0.3,1) ${0.1 + i * 0.06}s`,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
              <div>
                <p style={{ color: T.sub, fontSize: "10px", letterSpacing: "1px", margin: "0 0 6px" }}>حجز رقم {booking.id}</p>
                <p style={{ color: T.text, fontSize: "16px", fontWeight: "600", margin: 0 }}>
                  {new Date(booking.appointment_time).toLocaleString("ar-EG")}
                </p>
              </div>
              <div style={{
                background: `${statusColor(booking.status)}11`,
                border: `1px solid ${statusColor(booking.status)}33`,
                borderRadius: "20px", padding: "5px 12px",
              }}>
                <span style={{ color: statusColor(booking.status), fontSize: "12px", fontWeight: "600" }}>
                  {statusLabel(booking.status)}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {booking.status === "confirmed" && (
                <>
                  <button onClick={() => updateStatus(booking.id, "checked_in")} style={{
                    padding: "9px 16px", borderRadius: "10px", border: `1px solid ${T.warning}44`,
                    background: `${T.warning}11`, color: T.warning, fontSize: "13px",
                    fontWeight: "600", cursor: "pointer",
                  }}>وصل ✓</button>
                  <button onClick={() => updateStatus(booking.id, "no_show")} style={{
                    padding: "9px 16px", borderRadius: "10px", border: `1px solid ${T.danger}44`,
                    background: `${T.danger}11`, color: T.danger, fontSize: "13px",
                    fontWeight: "600", cursor: "pointer",
                  }}>لم يحضر</button>
                </>
              )}
              {booking.status === "checked_in" && (
                <button onClick={() => updateStatus(booking.id, "completed")} style={{
                  padding: "9px 16px", borderRadius: "10px", border: `1px solid ${T.success}44`,
                  background: `${T.success}11`, color: T.success, fontSize: "13px",
                  fontWeight: "600", cursor: "pointer",
                }}>خلصت ✓</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}