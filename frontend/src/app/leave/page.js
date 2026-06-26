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

export default function LeaveRequest() {
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [visible, setVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    if (!token) { router.push("/"); return; }
    if (role !== "employee" && role !== "supervisor") { router.push("/dashboard"); return; }
    setTimeout(() => setVisible(true), 100);
  }, []);

  async function submitLeave() {
    setMessage("");
    if (!date || !reason) { setMessage("من فضلك أدخل التاريخ والسبب"); return; }
    const token = localStorage.getItem("token");
    try {
      const res = await fetch("http://127.0.0.1:8000/leave/request", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ date, reason }),
      });
      const data = await res.json();
      if (!res.ok) { setMessage(typeof data.detail === "string" ? data.detail : "حدث خطأ"); return; }
      setMessage("تم إرسال طلب الإجازة بنجاح!");
      setDate("");
      setReason("");
    } catch { setMessage("فشل الاتصال"); }
  }

  const inputStyle = {
    width: "100%", padding: "14px 16px", borderRadius: "12px",
    border: `1px solid ${T.border}`, background: "rgba(4,8,12,0.8)",
    color: T.text, fontSize: "15px", outline: "none",
    boxSizing: "border-box", backdropFilter: "blur(8px)", fontFamily: "inherit",
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #030508 0%, #080d12 30%, #030508 70%, #050810 100%)",
      padding: "24px 20px 40px",
    }}>
      <div style={{ maxWidth: "500px", margin: "0 auto" }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: "28px",
          opacity: visible ? 1 : 0, transition: "all 0.6s ease",
        }}>
          <h1 style={{ color: T.accent, fontSize: "20px", fontWeight: "800", margin: 0, letterSpacing: "2px" }}>طلب إجازة</h1>
          <button onClick={() => router.push("/employee")} style={{ background: "none", border: "none", color: T.sub, cursor: "pointer", fontSize: "13px" }}>← رجوع</button>
        </div>

        <div style={{
          background: T.card, borderRadius: "20px", padding: "24px",
          border: `1px solid ${T.border}`,
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(20px)",
          transition: "all 0.6s cubic-bezier(0.16,1,0.3,1) 0.1s",
        }}>
          <p style={{ color: T.sub, fontSize: "10px", letterSpacing: "2px", marginBottom: "20px" }}>بيانات الإجازة</p>

          <label style={{ color: T.sub, fontSize: "10px", display: "block", marginBottom: "8px", letterSpacing: "1.5px" }}>تاريخ الإجازة</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...inputStyle, marginBottom: "14px" }} />

          <label style={{ color: T.sub, fontSize: "10px", display: "block", marginBottom: "8px", letterSpacing: "1.5px" }}>سبب الإجازة</label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="اكتب سبب الإجازة..."
            rows={4}
            style={{ ...inputStyle, marginBottom: "20px", resize: "vertical" }}
          />

          <button onClick={submitLeave} style={{
            width: "100%", padding: "15px", borderRadius: "12px",
            border: `1px solid ${T.accent}55`,
            background: `linear-gradient(135deg, ${T.accent}cc, ${T.accent}88)`,
            color: "#030508", fontSize: "14px", fontWeight: "800",
            letterSpacing: "1px", cursor: "pointer", boxSizing: "border-box",
            boxShadow: `0 8px 24px ${T.accentGlow}`,
          }}>إرسال الطلب</button>

          {message && (
            <p style={{ color: message.includes("بنجاح") ? T.success : T.danger, textAlign: "center", marginTop: "12px", fontSize: "13px" }}>
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}