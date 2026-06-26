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

export default function OwnerDashboard() {
  const [washes, setWashes] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("washes");
  const [showAddWash, setShowAddWash] = useState(false);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [message, setMessage] = useState("");
  const [visible, setVisible] = useState(false);
  const [washForm, setWashForm] = useState({
    name: "", address: "", phone: "",
    latitude: "", longitude: "",
    opening_time: "08:00", closing_time: "22:00",
  });
  const [empForm, setEmpForm] = useState({ phone: "", name: "", role: "employee" });
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    if (!token) { router.push("/"); return; }
    if (role !== "owner" && role !== "super_admin") { router.push("/dashboard"); return; }
    setTimeout(() => setVisible(true), 100);
    fetchData(token);
  }, []);

  function fetchData(token) {
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch("http://127.0.0.1:8000/washes/my", { headers }).then(r => r.json()),
      fetch("http://127.0.0.1:8000/admin/my-employees", { headers }).then(r => r.json()),
      fetch("http://127.0.0.1:8000/leave/pending", { headers }).then(r => r.json()),
    ]).then(([w, e, l]) => {
      if (Array.isArray(w)) setWashes(w);
      if (Array.isArray(e)) setEmployees(e);
      if (Array.isArray(l)) setLeaves(l);
      setLoading(false);
    }).catch(() => setLoading(false));
  }

  async function addWash() {
    setMessage("");
    const token = localStorage.getItem("token");
    try {
      const res = await fetch("http://127.0.0.1:8000/washes/", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...washForm, latitude: parseFloat(washForm.latitude), longitude: parseFloat(washForm.longitude) }),
      });
      const data = await res.json();
      if (!res.ok) { setMessage(typeof data.detail === "string" ? data.detail : "حدث خطأ"); return; }
      setMessage("تم إضافة المغسلة بنجاح!");
      setShowAddWash(false);
      setWashForm({ name: "", address: "", phone: "", latitude: "", longitude: "", opening_time: "08:00", closing_time: "22:00" });
      fetchData(token);
    } catch { setMessage("فشل الاتصال"); }
  }

  async function addEmployee() {
    setMessage("");
    const token = localStorage.getItem("token");
    if (!empForm.phone) { setMessage("أدخل رقم الموظف"); return; }
    try {
      const res = await fetch("http://127.0.0.1:8000/admin/add-employee", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(empForm),
      });
      const data = await res.json();
      if (!res.ok) { setMessage(typeof data.detail === "string" ? data.detail : "حدث خطأ"); return; }
      setMessage("تم إضافة الموظف بنجاح!");
      setShowAddEmployee(false);
      setEmpForm({ phone: "", name: "", role: "employee" });
      fetchData(token);
    } catch { setMessage("فشل الاتصال"); }
  }

  async function removeEmployee(userId) {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`http://127.0.0.1:8000/admin/remove-employee/${userId}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) { setMessage("تم إزالة الموظف"); fetchData(token); setTimeout(() => setMessage(""), 2000); }
    } catch { setMessage("فشل الحذف"); }
  }

  async function respondLeave(leaveId, status) {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`http://127.0.0.1:8000/leave/${leaveId}/respond?status=${status}`, {
        method: "PATCH", headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setMessage(status === "approved" ? "تم الموافقة على الإجازة" : "تم رفض الإجازة");
        fetchData(token);
        setTimeout(() => setMessage(""), 2000);
      }
    } catch { setMessage("فشل التحديث"); }
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

  const tabs = [
    { id: "washes", label: `المغاسل (${washes.length})` },
    { id: "employees", label: `الموظفون (${employees.length})` },
    { id: "leaves", label: `الإجازات (${leaves.length})` },
  ];

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
            <button onClick={() => router.push("/dashboard")} style={{ background: "none", border: "none", color: T.sub, cursor: "pointer", fontSize: "13px", padding: 0 }}>←</button>
            <h1 style={{ color: T.accent, fontSize: "20px", fontWeight: "800", margin: 0, letterSpacing: "2px" }}>لوحة المالك</h1>
          </div>
          {activeTab !== "leaves" && (
            <button
              onClick={() => activeTab === "washes" ? setShowAddWash(!showAddWash) : setShowAddEmployee(!showAddEmployee)}
              style={{
                padding: "9px 16px", borderRadius: "10px",
                border: `1px solid ${T.accent}44`,
                background: `linear-gradient(135deg, ${T.accent}18, ${T.accent}08)`,
                color: T.accent, fontSize: "13px", fontWeight: "600", cursor: "pointer",
              }}
            >
              {activeTab === "washes" ? (showAddWash ? "إلغاء" : "+ مغسلة") : (showAddEmployee ? "إلغاء" : "+ موظف")}
            </button>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              padding: "8px 14px", borderRadius: "10px", border: "none",
              background: activeTab === tab.id ? `linear-gradient(135deg, ${T.accent}22, ${T.accent}0a)` : "rgba(176,196,216,0.04)",
              color: activeTab === tab.id ? T.accent : T.sub,
              fontSize: "12px", fontWeight: activeTab === tab.id ? "700" : "400",
              cursor: "pointer", borderWidth: "1px", borderStyle: "solid",
              borderColor: activeTab === tab.id ? `${T.accent}33` : T.border,
            }}>{tab.label}</button>
          ))}
        </div>

        {message && (
          <p style={{ color: message.includes("بنجاح") || message.includes("الموافقة") ? T.success : T.danger, marginBottom: "16px", fontSize: "13px", textAlign: "center" }}>
            {message}
          </p>
        )}

        {/* Washes Tab */}
        {activeTab === "washes" && (
          <div>
            {showAddWash && (
              <div style={{ background: T.card, borderRadius: "20px", padding: "24px", border: `1px solid ${T.border}`, marginBottom: "20px" }}>
                <p style={{ color: T.sub, fontSize: "10px", letterSpacing: "2px", marginBottom: "16px" }}>بيانات المغسلة الجديدة</p>
                <input style={inputStyle} placeholder="اسم المغسلة" value={washForm.name} onChange={e => setWashForm({ ...washForm, name: e.target.value })} />
                <input style={inputStyle} placeholder="العنوان" value={washForm.address} onChange={e => setWashForm({ ...washForm, address: e.target.value })} />
                <input style={inputStyle} placeholder="رقم التليفون" value={washForm.phone} onChange={e => setWashForm({ ...washForm, phone: e.target.value })} />
                <input style={inputStyle} placeholder="خط العرض (مثال: 30.0444)" value={washForm.latitude} onChange={e => setWashForm({ ...washForm, latitude: e.target.value })} />
                <input style={inputStyle} placeholder="خط الطول (مثال: 31.2357)" value={washForm.longitude} onChange={e => setWashForm({ ...washForm, longitude: e.target.value })} />
                <div style={{ display: "flex", gap: "10px" }}>
                  <input style={{ ...inputStyle, flex: 1 }} type="time" value={washForm.opening_time} onChange={e => setWashForm({ ...washForm, opening_time: e.target.value })} />
                  <input style={{ ...inputStyle, flex: 1 }} type="time" value={washForm.closing_time} onChange={e => setWashForm({ ...washForm, closing_time: e.target.value })} />
                </div>
                <button onClick={addWash} style={{
                  width: "100%", padding: "14px", borderRadius: "12px",
                  border: `1px solid ${T.accent}55`,
                  background: `linear-gradient(135deg, ${T.accent}cc, ${T.accent}88)`,
                  color: "#030508", fontSize: "14px", fontWeight: "800",
                  cursor: "pointer", boxSizing: "border-box",
                }}>حفظ المغسلة</button>
              </div>
            )}
            {washes.length === 0 && !showAddWash && (
              <div style={{ background: T.card, borderRadius: "20px", padding: "40px 20px", border: `1px solid ${T.border}`, textAlign: "center" }}>
                <p style={{ color: T.sub, fontSize: "13px" }}>لا توجد مغاسل مضافة بعد</p>
              </div>
            )}
            {washes.map((wash, i) => (
              <div key={wash.id} style={{
                background: T.card, borderRadius: "20px", padding: "20px",
                border: `1px solid ${T.border}`, marginBottom: "12px",
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(20px)",
                transition: `all 0.6s cubic-bezier(0.16,1,0.3,1) ${0.1 + i * 0.08}s`,
              }}>
                <h2 style={{ color: T.text, fontSize: "17px", fontWeight: "700", margin: "0 0 5px" }}>{wash.name}</h2>
                <p style={{ color: T.sub, fontSize: "13px", margin: "0 0 10px" }}>{wash.address}</p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "12px", borderTop: `1px solid ${T.border}` }}>
                  <span style={{ color: T.sub, fontSize: "11px" }}>{wash.opening_time} — {wash.closing_time}</span>
                  <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
                    <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: wash.is_open_now ? T.success : T.sub }} />
                    <span style={{ color: wash.is_open_now ? T.success : T.sub, fontSize: "12px" }}>{wash.is_open_now ? "مفتوح" : "مغلق"}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Employees Tab */}
        {activeTab === "employees" && (
          <div>
            {showAddEmployee && (
              <div style={{ background: T.card, borderRadius: "20px", padding: "24px", border: `1px solid ${T.border}`, marginBottom: "20px" }}>
                <p style={{ color: T.sub, fontSize: "10px", letterSpacing: "2px", marginBottom: "16px" }}>بيانات الموظف الجديد</p>
                <input style={inputStyle} placeholder="رقم تليفون الموظف" value={empForm.phone} onChange={e => setEmpForm({ ...empForm, phone: e.target.value })} />
                <input style={inputStyle} placeholder="اسم الموظف (اختياري)" value={empForm.name} onChange={e => setEmpForm({ ...empForm, name: e.target.value })} />
                <select value={empForm.role} onChange={e => setEmpForm({ ...empForm, role: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}>
                  <option value="employee">موظف عادي</option>
                  <option value="supervisor">كبير موظفين</option>
                </select>
                <button onClick={addEmployee} style={{
                  width: "100%", padding: "14px", borderRadius: "12px",
                  border: `1px solid ${T.accent}55`,
                  background: `linear-gradient(135deg, ${T.accent}cc, ${T.accent}88)`,
                  color: "#030508", fontSize: "14px", fontWeight: "800",
                  cursor: "pointer", boxSizing: "border-box",
                }}>إضافة الموظف</button>
              </div>
            )}
            {employees.length === 0 && !showAddEmployee && (
              <div style={{ background: T.card, borderRadius: "20px", padding: "40px 20px", border: `1px solid ${T.border}`, textAlign: "center" }}>
                <p style={{ color: T.sub, fontSize: "13px" }}>لا يوجد موظفون مضافون بعد</p>
              </div>
            )}
            {employees.map((emp, i) => (
              <div key={emp.id} style={{
                background: T.card, borderRadius: "20px", padding: "18px 20px",
                border: `1px solid ${T.border}`, marginBottom: "10px",
                display: "flex", justifyContent: "space-between", alignItems: "center",
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(16px)",
                transition: `all 0.5s ease ${i * 0.06}s`,
              }}>
                <div>
                  <p style={{ color: T.text, fontSize: "15px", fontWeight: "600", margin: "0 0 4px" }}>{emp.name || "بدون اسم"}</p>
                  <p style={{ color: T.sub, fontSize: "12px", margin: "0 0 3px" }}>{emp.phone}</p>
                  <p style={{ color: T.accent, fontSize: "11px", margin: 0 }}>{emp.role === "employee" ? "موظف عادي" : "كبير موظفين"}</p>
                </div>
                <button onClick={() => removeEmployee(emp.id)} style={{
                  padding: "7px 12px", borderRadius: "10px",
                  border: `1px solid ${T.danger}33`,
                  background: `${T.danger}0a`, color: T.danger,
                  fontSize: "12px", cursor: "pointer",
                }}>إزالة</button>
              </div>
            ))}
          </div>
        )}

        {/* Leaves Tab */}
        {activeTab === "leaves" && (
          <div>
            {leaves.length === 0 && (
              <div style={{ background: T.card, borderRadius: "20px", padding: "40px 20px", border: `1px solid ${T.border}`, textAlign: "center" }}>
                <p style={{ color: T.sub, fontSize: "13px" }}>لا توجد طلبات إجازة معلقة</p>
              </div>
            )}
            {leaves.map((leave, i) => (
              <div key={leave.id} style={{
                background: T.card, borderRadius: "20px", padding: "20px",
                border: `1px solid ${T.border}`, marginBottom: "12px",
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(16px)",
                transition: `all 0.5s ease ${i * 0.06}s`,
              }}>
                <p style={{ color: T.sub, fontSize: "10px", margin: "0 0 6px" }}>موظف رقم: {leave.employee_id}</p>
                <p style={{ color: T.text, fontSize: "15px", fontWeight: "600", margin: "0 0 6px" }}>تاريخ الإجازة: {leave.date}</p>
                <p style={{ color: T.sub, fontSize: "13px", margin: "0 0 14px" }}>{leave.reason}</p>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={() => respondLeave(leave.id, "approved")} style={{
                    padding: "8px 16px", borderRadius: "10px",
                    border: `1px solid ${T.success}44`,
                    background: `${T.success}11`, color: T.success,
                    fontSize: "13px", cursor: "pointer", fontWeight: "600",
                  }}>موافقة ✓</button>
                  <button onClick={() => respondLeave(leave.id, "rejected")} style={{
                    padding: "8px 16px", borderRadius: "10px",
                    border: `1px solid ${T.danger}44`,
                    background: `${T.danger}11`, color: T.danger,
                    fontSize: "13px", cursor: "pointer",
                  }}>رفض</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}