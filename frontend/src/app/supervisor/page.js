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

export default function SupervisorDashboard() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [quickForm, setQuickForm] = useState({ phone: "", date: "", time: "" });
  const [visible, setVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    if (!token) { router.push("/"); return; }
    if (role !== "supervisor" && role !== "super_admin") { router.push("/dashboard"); return; }
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

  async function cancelBooking(bookingId) {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`http://127.0.0.1:8000/bookings/${bookingId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: "cancelled" }),
      });
      if (res.ok) {
        fetchTodayBookings(token);
        setMessage("تم إلغاء الحجز");
        setTimeout(() => setMessage(""), 2000);
      }
    } catch { setMessage("فشل الإلغاء"); }
  }

  async function addQuickBooking() {
    setMessage("");
    const token = localStorage.getItem("token");
    if (!quickForm.phone || !quickForm.date || !quickForm.time) {
      setMessage("من فضلك أدخل كل البيانات");
      return;
    }
    try {
      const res = await fetch("http://127.0.0.1:8000/bookings/quick", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ phone: quickForm.phone, appointment_time: `${quickForm.date}T${quickForm.time}:00` }),
      });
      const data = await res.json();
      if (!res.ok) { setMessage(typeof data.detail === "string" ? data.detail : "حدث خطأ"); return; }
      setMessage("تم إضافة الموعد بنجاح!");
      setShowAddForm(false);
      setQuickForm({ phone: "", date: "", time: "" });
      fetchTodayBookings(token);
    } catch { setMessage("فشل الاتصال"); }
  }

  const statusColor = (s) => s === "confirmed" ? T.accent : s === "checked_in" ? T.warning : s === "completed" ? T.success : T.danger;
  const statusLabel = (s) => s === "confirmed" ? "مؤكد" : s === "checked_in" ? "وصل" : s === "completed" ? "مكتمل" : s === "cancelled" ? "ملغي" : s === "no_show" ? "لم يحضر" : s;

  const filtered = bookings.filter(b => b.id.toString().includes(search) || search === "");

  if (loading) return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: T.sub, letterSpacing: "2px", fontSize: "12px" }}>جاري التحميل...</p>
    </div>
  );

  const inputStyle = {
    width: "100%", padding: "13px 16px", borderRadius: "12px",
    border: `1px solid ${T.border}`, background: "rgba(4,8,12,0.8)",
    color: T.text, fontSize: "14px", outline: "none",
    boxSizing: "border-box", backdropFilter: "blur(8px)", fontFamily: "inherit",
    marginBottom: "10px",
  };

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
          marginBottom: "24px",
          opacity: visible ? 1 : 0, transition: "all 0.6s ease",
        }}>
          <div>
            <h1 style={{ color: T.accent, fontSize: "20px", fontWeight: "800", margin: "0 0 4px", letterSpacing: "2px" }}>جدول اليوم</h1>
            <p style={{ color: T.sub, fontSize: "11px", margin: 0 }}>{bookings.length} حجز</p>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={() => router.push("/dashboard")} style={{
              background: "none", border: "none", color: T.sub, cursor: "pointer", fontSize: "13px",
            }}>← رجوع</button>
            <button onClick={() => setShowAddForm(!showAddForm)} style={{
              padding: "9px 14px", borderRadius: "10px",
              border: `1px solid ${T.accent}44`,
              background: `linear-gradient(135deg, ${T.accent}18, ${T.accent}08)`,
              color: T.accent, fontSize: "12px", fontWeight: "600", cursor: "pointer",
            }}>{showAddForm ? "إلغاء" : "+ موعد سريع"}</button>
          </div>
        </div>

        {message && (
          <p style={{
            color: message.includes("بنجاح") ? T.success : T.danger,
            marginBottom: "16px", fontSize: "13px", textAlign: "center",
          }}>{message}</p>
        )}

        {/* Quick Add Form */}
        {showAddForm && (
          <div style={{
            background: T.card, borderRadius: "20px", padding: "20px",
            border: `1px solid ${T.border}`, marginBottom: "20px",
          }}>
            <p style={{ color: T.sub, fontSize: "10px", letterSpacing: "2px", marginBottom: "16px" }}>إضافة موعد سريع</p>
            <input style={inputStyle} placeholder="رقم تليفون العميل" value={quickForm.phone} onChange={e => setQuickForm({ ...quickForm, phone: e.target.value })} />
            <input style={inputStyle} type="date" value={quickForm.date} onChange={e => setQuickForm({ ...quickForm, date: e.target.value })} />
            <input style={inputStyle} type="time" value={quickForm.time} onChange={e => setQuickForm({ ...quickForm, time: e.target.value })} />
            <button onClick={addQuickBooking} style={{
              width: "100%", padding: "13px", borderRadius: "12px",
              border: `1px solid ${T.accent}55`,
              background: `linear-gradient(135deg, ${T.accent}cc, ${T.accent}88)`,
              color: "#030508", fontSize: "14px", fontWeight: "800",
              cursor: "pointer", boxSizing: "border-box",
            }}>حفظ الموعد</button>
          </div>
        )}

        {/* Search */}
        <input
          placeholder="بحث برقم الحجز..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...inputStyle, marginBottom: "16px" }}
        />

        {filtered.length === 0 && (
          <div style={{
            background: T.card, borderRadius: "20px", padding: "40px 20px",
            border: `1px solid ${T.border}`, textAlign: "center",
          }}>
            <p style={{ color: T.sub, fontSize: "13px" }}>لا توجد حجوزات اليوم</p>
          </div>
        )}

        {filtered.map((booking, i) => (
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
                <p style={{ color: T.text, fontSize: "15px", fontWeight: "600", margin: 0 }}>
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

            {booking.status !== "completed" && booking.status !== "cancelled" && (
              <button onClick={() => cancelBooking(booking.id)} style={{
                padding: "8px 14px", borderRadius: "10px",
                border: `1px solid ${T.danger}44`,
                background: `${T.danger}0a`, color: T.danger,
                fontSize: "12px", cursor: "pointer",
              }}>إلغاء الحجز</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}