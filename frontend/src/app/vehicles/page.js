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
};

export default function Vehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [message, setMessage] = useState("");
  const [visible, setVisible] = useState(false);
  const [form, setForm] = useState({
    brand: "", model: "", year: "", plate_number: "", color: ""
  });
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/"); return; }
    setTimeout(() => setVisible(true), 100);
    fetchVehicles(token);
  }, []);

  function fetchVehicles(token) {
    fetch("http://127.0.0.1:8000/vehicles/", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setVehicles(data); setLoading(false); })
      .catch(() => setLoading(false));
  }

  async function addVehicle() {
    setMessage("");
    const token = localStorage.getItem("token");
    if (!form.brand || !form.model || !form.year || !form.plate_number) {
      setMessage("من فضلك أدخل كل البيانات المطلوبة");
      return;
    }
    try {
      const res = await fetch("http://127.0.0.1:8000/vehicles/", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, year: parseInt(form.year) }),
      });
      const data = await res.json();
      if (!res.ok) { setMessage(typeof data.detail === "string" ? data.detail : "حدث خطأ"); return; }
      setMessage("تم إضافة العربية بنجاح!");
      setShowAddForm(false);
      setForm({ brand: "", model: "", year: "", plate_number: "", color: "" });
      fetchVehicles(token);
    } catch { setMessage("فشل الاتصال"); }
  }

  async function deleteVehicle(id) {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`http://127.0.0.1:8000/vehicles/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) { setMessage("تم حذف العربية"); fetchVehicles(token); setTimeout(() => setMessage(""), 2000); }
    } catch { setMessage("فشل الحذف"); }
  }

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
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button onClick={() => router.push("/profile")} style={{ background: "none", border: "none", color: T.sub, cursor: "pointer", fontSize: "13px", padding: 0 }}>←</button>
            <h1 style={{ color: T.accent, fontSize: "20px", fontWeight: "800", margin: 0, letterSpacing: "2px" }}>عرباياتي</h1>
          </div>
          <button onClick={() => setShowAddForm(!showAddForm)} style={{
            padding: "9px 16px", borderRadius: "10px",
            border: `1px solid ${T.accent}44`,
            background: `linear-gradient(135deg, ${T.accent}18, ${T.accent}08)`,
            color: T.accent, fontSize: "13px", fontWeight: "600", cursor: "pointer",
          }}>
            {showAddForm ? "إلغاء" : "+ إضافة عربية"}
          </button>
        </div>

        {message && (
          <p style={{ color: message.includes("بنجاح") ? T.success : T.danger, marginBottom: "16px", fontSize: "13px", textAlign: "center" }}>
            {message}
          </p>
        )}

        {/* Add Form */}
        {showAddForm && (
          <div style={{
            background: T.card, borderRadius: "20px", padding: "24px",
            border: `1px solid ${T.border}`, marginBottom: "20px",
          }}>
            <p style={{ color: T.sub, fontSize: "10px", letterSpacing: "2px", marginBottom: "16px" }}>بيانات العربية الجديدة</p>
            <input style={inputStyle} placeholder="الماركة (مثال: Toyota)" value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} />
            <input style={inputStyle} placeholder="الموديل (مثال: Camry)" value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} />
            <input style={inputStyle} placeholder="سنة الصنع (مثال: 2022)" value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} type="number" />
            <input style={inputStyle} placeholder="رقم اللوحة" value={form.plate_number} onChange={e => setForm({ ...form, plate_number: e.target.value })} />
            <input style={inputStyle} placeholder="اللون (اختياري)" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} />
            <button onClick={addVehicle} style={{
              width: "100%", padding: "14px", borderRadius: "12px",
              border: `1px solid ${T.accent}55`,
              background: `linear-gradient(135deg, ${T.accent}cc, ${T.accent}88)`,
              color: "#030508", fontSize: "14px", fontWeight: "800",
              cursor: "pointer", boxSizing: "border-box",
            }}>حفظ العربية</button>
          </div>
        )}

        {vehicles.length === 0 && !showAddForm && (
          <div style={{
            background: T.card, borderRadius: "20px", padding: "40px 20px",
            border: `1px solid ${T.border}`, textAlign: "center",
          }}>
            <p style={{ color: T.sub, fontSize: "13px" }}>لا توجد عربيات مضافة بعد</p>
          </div>
        )}

        {vehicles.map((v, i) => (
          <div key={v.id} style={{
            background: T.card, borderRadius: "20px", padding: "18px 20px",
            border: `1px solid ${T.border}`, marginBottom: "10px",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(16px)",
            transition: `all 0.5s ease ${i * 0.06}s`,
          }}>
            <div>
              <h2 style={{ color: T.text, fontSize: "16px", fontWeight: "700", margin: "0 0 4px" }}>
                {v.brand} {v.model} — {v.year}
              </h2>
              <p style={{ color: T.sub, fontSize: "12px", margin: "0 0 3px" }}>لوحة: {v.plate_number}</p>
              {v.color && <p style={{ color: T.sub, fontSize: "12px", margin: 0 }}>اللون: {v.color}</p>}
            </div>
            <button onClick={() => deleteVehicle(v.id)} style={{
              padding: "7px 12px", borderRadius: "10px",
              border: `1px solid ${T.danger}33`,
              background: `${T.danger}0a`, color: T.danger,
              fontSize: "12px", cursor: "pointer",
            }}>حذف</button>
          </div>
        ))}
      </div>
    </div>
  );
}