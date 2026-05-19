import { useState, useCallback, useEffect, useRef } from "react";

// ─── Supabase Config ──────────────────────────────────────────────────────────
const SUPA_URL = "https://kimtygrehqodvbjruffo.supabase.co";
const SUPA_KEY = "sb_publishable_qTsoPaRVmsrg9YscbbQOwg_R5ataSpn";

const supa = async (method, table, body = null, query = "") => {
  const url = `${SUPA_URL}/rest/v1/${table}${query}`;
  const headers = {
    "apikey": SUPA_KEY,
    "Authorization": `Bearer ${SUPA_KEY}`,
    "Content-Type": "application/json",
    "Prefer": method === "POST" ? "return=representation" : "return=representation",
  };
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : null });
  if (!res.ok) { const e = await res.text(); throw new Error(e); }
  const text = await res.text();
  return text ? JSON.parse(text) : [];
};

const db = {
  get: (table, query = "") => supa("GET", table, null, query),
  post: (table, body) => supa("POST", table, body),
  patch: (table, id, body) => supa("PATCH", table, body, `?id=eq.${id}`),
  del: (table, id) => supa("DELETE", table, null, `?id=eq.${id}`),
  upsert: async (table, body) => {
    const res = await fetch(`${SUPA_URL}/rest/v1/${table}`, {
      method: "POST",
      headers: { "apikey": SUPA_KEY, "Authorization": `Bearer ${SUPA_KEY}`, "Content-Type": "application/json", "Prefer": "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(body)
    });
    const text = await res.text();
    return text ? JSON.parse(text) : [];
  }
};

// ─── Local storage fallback ───────────────────────────────────────────────────
const SK = "tricore-session";
const uid = () => Math.random().toString(36).slice(2, 9);
const todayStr = () => new Date().toISOString().split("T")[0];

// ─── Default seed data ────────────────────────────────────────────────────────
const SEED_USERS = [
  { id: "u1", name: "Moe",   role: "admin",     pin: "1234", phone: "0400 000 001", email: "moe@tricore.com.au",   color: "#1a6faf" },
  { id: "u2", name: "Jake",  role: "tradesman", pin: "2222", phone: "0400 000 002", email: "jake@tricore.com.au",  color: "#27ae60" },
  { id: "u3", name: "Tyler", role: "tradesman", pin: "3333", phone: "0400 000 003", email: "tyler@tricore.com.au", color: "#8e44ad" },
  { id: "u4", name: "Sam",   role: "apprentice",pin: "4444", phone: "0400 000 004", email: "sam@tricore.com.au",   color: "#e67e22" },
];
const SEED_DIVISIONS = [
  { id: "d1", name: "Projects" },
  { id: "d2", name: "Service & Maintenance" },
];
const SEED_CATEGORIES = [
  { id: "d1c1", division_id: "d1", name: "Commercial Electrical" },
  { id: "d1c2", division_id: "d1", name: "Domestic / Residential" },
  { id: "d2c1", division_id: "d2", name: "Gas Appliances" },
  { id: "d2c2", division_id: "d2", name: "Cool Rooms" },
  { id: "d2c3", division_id: "d2", name: "Electrical Appliances" },
  { id: "d2c4", division_id: "d2", name: "Preventative Maintenance Contracts" },
  { id: "d2c5", division_id: "d2", name: "Breakdown / Emergency Call-Outs" },
];
const SEED_CLIENTS = [
  { id: "c1", name: "Narrogin Shopping Centre", contact: "Brian Smith", phone: "08 9000 1111", email: "brian@narrogin.com.au",      address: "1 Mitchell St, Narrogin WA 6312" },
  { id: "c2", name: "UGG Innaloo",              contact: "Sarah Lee",   phone: "08 9000 2222", email: "sarah@ugg.com.au",           address: "Innaloo Shopping Centre, Perth WA 6018" },
  { id: "c3", name: "Pinjarra Bakery",          contact: "Dave Nguyen", phone: "08 9000 3333", email: "dave@pinjarrabakery.com.au", address: "12 George St, Pinjarra WA 6208" },
  { id: "c4", name: "17 Steffan Loop",          contact: "Anna White",  phone: "0411 000 004", email: "anna@gmail.com",            address: "17 Steffan Loop, Baldivis WA 6171" },
];
const SEED_SUPPLIERS = [
  { id: "s1", name: "Southwire Australia",  phone: "1800 111 222", email: "orders@southwire.com.au" },
  { id: "s2", name: "Clipsal / Schneider", phone: "1300 202 000", email: "orders@clipsal.com.au" },
  { id: "s3", name: "Avolo Lighting",      phone: "08 9444 0000", email: "sales@avolo.com.au" },
];
const SEED_JOBS = [
  { id: "j1", title: "Switchboard Upgrade", client_id: "c1", division_id: "d1", category_id: "d1c1", status: "in_progress", priority: "high",   assigned_to: ["u2"],      start_date: "2026-05-19", end_date: "2026-05-21", description: "Full MSB replacement, AS/NZS 3000 compliant", value: 12400, cost: 7800, invoiced: false, quote_status: "approved", takeoff: [], scope_of_works: "Supply and install new main switchboard.", extra_lines: [], po_number: "" },
  { id: "j2", title: "Lighting Fit-Out",    client_id: "c2", division_id: "d1", category_id: "d1c1", status: "scheduled",   priority: "medium", assigned_to: ["u2","u4"], start_date: "2026-05-22", end_date: "2026-05-23", description: "LED lighting throughout retail space",         value: 8750,  cost: 5200, invoiced: false, quote_status: "approved", takeoff: [], scope_of_works: "Supply and install LED lighting.", extra_lines: [], po_number: "" },
  { id: "j3", title: "Commercial Kitchen PM", client_id: "c3", division_id: "d2", category_id: "d2c4", status: "completed", priority: "low",  assigned_to: ["u3"],      start_date: "2026-05-15", end_date: "2026-05-15", description: "Preventative maintenance, cool room & gas",    value: 2200,  cost: 980,  invoiced: true,  quote_status: "approved", takeoff: [], scope_of_works: "Preventative maintenance completed.", extra_lines: [], po_number: "" },
];
const SEED_INVENTORY = [
  { id: "inv1", name: "6mm TPS Cable",   sku: "TPS-6MM",  unit: "m",  warehouse_qty: 450, reorder_at: 100, cost: 3.20, markup: 40, supplier_id: "s1", category: "Cable" },
  { id: "inv2", name: "20A Breaker",     sku: "BRK-20A",  unit: "ea", warehouse_qty: 45,  reorder_at: 20,  cost: 18.50,markup: 60, supplier_id: "s2", category: "Switchgear" },
  { id: "inv3", name: "LED Downlight",   sku: "LED-DL10", unit: "ea", warehouse_qty: 60,  reorder_at: 20,  cost: 14.00,markup: 65, supplier_id: "s3", category: "Lighting" },
];

// ─── Business constants ───────────────────────────────────────────────────────
const BUSINESS = {
  name: "Tri-Core Industries Pty Ltd", tradingAs: "tri-core Electrical Solutions",
  abn: "28 676 699 568", address: "25/110 Inspiration Drive", suburb: "Wangara WA 6065",
  phone: "08 6202 9597", email: "admin@tricoreelec.com.au",
  bsb: "036226", account: "699517",
  licences: "ELEC EC16293  ·  P&G GF171AR  ·  REFRIG AUD47606",
};

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  bg: "#080808", surf: "#0d0d0d", surf2: "#111", border: "#1c1c1c", border2: "#242424",
  text: "#f0f0f0", muted: "#666", dim: "#333",
  accent: "#1a6faf", accentL: "#2387d4",
  green: "#4ade80", red: "#f87171", yellow: "#fbbf24", blue: "#60a5fa",
};

const SC = {
  scheduled:   { bg: "rgba(96,165,250,0.1)",  border: "#60a5fa", text: "#60a5fa", label: "Scheduled" },
  in_progress: { bg: "rgba(74,222,128,0.1)",  border: "#4ade80", text: "#4ade80", label: "In Progress" },
  completed:   { bg: "rgba(134,239,172,0.08)",border: "#86efac", text: "#86efac", label: "Completed" },
  cancelled:   { bg: "rgba(248,113,113,0.1)", border: "#f87171", text: "#f87171", label: "Cancelled" },
  draft:       { bg: "rgba(251,191,36,0.1)",  border: "#fbbf24", text: "#fbbf24", label: "Draft" },
  sent:        { bg: "rgba(96,165,250,0.1)",  border: "#60a5fa", text: "#60a5fa", label: "Sent" },
  approved:    { bg: "rgba(74,222,128,0.1)",  border: "#4ade80", text: "#4ade80", label: "Approved" },
  paid:        { bg: "rgba(74,222,128,0.1)",  border: "#4ade80", text: "#4ade80", label: "Paid" },
  overdue:     { bg: "rgba(248,113,113,0.1)", border: "#f87171", text: "#f87171", label: "Overdue" },
  pending:     { bg: "rgba(251,191,36,0.1)",  border: "#fbbf24", text: "#fbbf24", label: "Pending" },
  lost:        { bg: "rgba(248,113,113,0.1)", border: "#f87171", text: "#f87171", label: "Lost" },
  expired:     { bg: "rgba(153,153,153,0.1)", border: "#888",    text: "#888",    label: "Expired" },
};

const PC = { high: T.red, medium: T.yellow, low: T.blue };
const RL = { admin: "Admin", tradesman: "Tradesman", apprentice: "Apprentice", "inventory-manager": "Inventory Manager" };
const RR = { admin: 150, tradesman: 150, assistant: 110, apprentice: 80, "inventory-manager": 0 };

const fmt = n => "$" + Number(n).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = d => { if (!d) return "—"; const [y, m, day] = d.split("-"); return `${day}/${m}/${y}`; };
const fmtDateLong = d => { if (!d) return "—"; return new Date(d + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" }); };

// ─── Shared UI ────────────────────────────────────────────────────────────────
function Badge({ status }) {
  const s = SC[status] || { bg: "#1a1a1a", border: "#333", text: "#888", label: status };
  return <span style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.text, padding: "2px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>{s.label}</span>;
}

function Av({ name, size = 32, color }) {
  const ini = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const cols = ["#1a6faf", "#27ae60", "#8e44ad", "#e67e22", "#c0392b", "#16a085"];
  return <div style={{ width: size, height: size, borderRadius: "50%", background: color || cols[name.charCodeAt(0) % cols.length], flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: Math.round(size * 0.36) }}>{ini}</div>;
}

function Card({ children, style = {}, onClick }) {
  return (
    <div onClick={onClick} style={{ background: T.surf2, border: `1px solid ${T.border}`, borderRadius: 14, padding: 16, transition: "border-color 0.15s", cursor: onClick ? "pointer" : "default", ...style }}
      onMouseEnter={e => { if (onClick) e.currentTarget.style.borderColor = T.accent; }}
      onMouseLeave={e => { if (onClick) e.currentTarget.style.borderColor = T.border; }}>
      {children}
    </div>
  );
}

function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const h = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: T.surf, border: `1px solid ${T.border2}`, borderRadius: 18, width: "100%", maxWidth: wide ? 740 : 560, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 24px 80px rgba(0,0,0,0.7)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: `1px solid ${T.border}` }}>
          <span style={{ fontWeight: 800, fontSize: 17, color: T.text }}>{title}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: T.muted, fontSize: 20, cursor: "pointer", fontFamily: "inherit" }}>✕</button>
        </div>
        <div style={{ padding: 22 }}>{children}</div>
      </div>
    </div>
  );
}

function Inp({ label, value, onChange, type = "text", options, required, placeholder, disabled }) {
  const base = { width: "100%", background: "#070707", border: `1px solid ${T.border2}`, borderRadius: 9, padding: "9px 13px", color: disabled ? "#444" : T.text, fontSize: 14, boxSizing: "border-box", outline: "none", fontFamily: "inherit" };
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={{ display: "block", color: T.muted, fontSize: 11, marginBottom: 5, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase" }}>{label}{required && " *"}</label>}
      {options
        ? <select value={value || ""} onChange={e => onChange(e.target.value)} style={base} disabled={disabled}>{options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
        : <input type={type} value={value || ""} placeholder={placeholder} onChange={e => onChange(e.target.value)} style={base} disabled={disabled} />}
    </div>
  );
}

function Btn({ children, onClick, variant = "primary", style = {}, disabled }) {
  const v = {
    primary: { background: T.accent, border: "none", color: "#fff" },
    danger: { background: "transparent", border: `1px solid ${T.red}`, color: T.red },
    ghost: { background: "transparent", border: `1px solid ${T.border2}`, color: T.muted },
    success: { background: "rgba(74,222,128,0.15)", border: `1px solid ${T.green}`, color: T.green },
  };
  return <button onClick={onClick} disabled={disabled} style={{ ...v[variant], borderRadius: 10, padding: "10px 18px", fontWeight: 700, fontSize: 14, cursor: disabled ? "not-allowed" : "pointer", transition: "opacity 0.15s", fontFamily: "inherit", opacity: disabled ? 0.4 : 1, ...style }} onMouseEnter={e => { if (!disabled) e.currentTarget.style.opacity = "0.82"; }} onMouseLeave={e => e.currentTarget.style.opacity = "1"}>{children}</button>;
}

function Divider() { return <div style={{ borderTop: `1px solid ${T.border}`, margin: "16px 0" }} />; }
function SectionHead({ children }) { return <div style={{ color: T.muted, fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 12 }}>{children}</div>; }

function LogoMark({ size = 40, dark = false }) {
  const col = dark ? "#111" : "#fff";
  return (
    <svg width={size} height={size * 0.9} viewBox="0 0 100 90" fill="none">
      <line x1="10" y1="35" x2="90" y2="35" stroke={col} strokeWidth="7" strokeLinecap="round" />
      <line x1="35" y1="10" x2="35" y2="60" stroke={col} strokeWidth="7" strokeLinecap="round" />
      <line x1="58" y1="20" x2="58" y2="50" stroke={col} strokeWidth="7" strokeLinecap="round" />
    </svg>
  );
}

// ─── Loading screen ───────────────────────────────────────────────────────────
function LoadingScreen({ message }) {
  return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 }}>
      <div style={{ background: T.surf2, border: `1px solid ${T.border}`, borderRadius: 14, padding: "8px 10px" }}><LogoMark size={40} /></div>
      <div style={{ fontWeight: 900, fontSize: 20, color: T.text }}>tri-core</div>
      <div style={{ color: T.muted, fontSize: 13 }}>{message || "Connecting to cloud..."}</div>
      <div style={{ width: 40, height: 40, border: `3px solid ${T.border2}`, borderTop: `3px solid ${T.accent}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ─── AI Helper ────────────────────────────────────────────────────────────────
async function callAI(system, user) {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, system, messages: [{ role: "user", content: user }] })
    });
    const data = await res.json();
    return data.content?.[0]?.text || "";
  } catch { return ""; }
}

// ─── Login Screen ─────────────────────────────────────────────────────────────
function LoginScreen({ users, onLogin }) {
  const [selected, setSelected] = useState(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

  const attempt = p => {
    if (selected && p === selected.pin) { onLogin(selected); }
    else { setError(true); setShake(true); setPin(""); setTimeout(() => setShake(false), 500); }
  };
  const addDigit = d => {
    if (pin.length >= 4) return;
    const next = pin + d; setPin(next);
    if (next.length === 4) setTimeout(() => attempt(next), 150);
  };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'Barlow','Helvetica Neue',sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 48 }}>
        <div style={{ background: T.surf2, border: `1px solid ${T.border}`, borderRadius: 14, padding: "8px 10px" }}><LogoMark size={36} /></div>
        <div>
          <div style={{ fontWeight: 900, fontSize: 20, color: T.text }}>tri-core</div>
          <div style={{ fontSize: 10, color: T.muted, fontWeight: 600, letterSpacing: 1 }}>ELECTRICAL SOLUTIONS</div>
        </div>
      </div>
      {!selected ? (
        <div style={{ width: "100%", maxWidth: 360 }}>
          <p style={{ textAlign: "center", color: T.muted, fontSize: 14, marginBottom: 24 }}>Select your profile</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {users.map(u => (
              <button key={u.id} onClick={() => { setSelected(u); setPin(""); setError(false); }}
                style={{ display: "flex", alignItems: "center", gap: 16, background: T.surf2, border: `1px solid ${T.border}`, borderRadius: 14, padding: "14px 18px", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}
                onMouseEnter={e => e.currentTarget.style.borderColor = u.color || T.accent}
                onMouseLeave={e => e.currentTarget.style.borderColor = T.border}>
                <Av name={u.name} size={44} color={u.color} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 16, color: T.text }}>{u.name}</div>
                  <div style={{ fontSize: 12, color: T.muted }}>{RL[u.role]}</div>
                </div>
                <span style={{ color: T.dim }}>›</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ width: "100%", maxWidth: 300, textAlign: "center" }}>
          <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: 13, marginBottom: 24, display: "flex", alignItems: "center", gap: 6, margin: "0 auto 24px", fontFamily: "inherit" }}>‹ Back</button>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}><Av name={selected.name} size={64} color={selected.color} /></div>
          <div style={{ fontWeight: 800, fontSize: 20, color: T.text, marginBottom: 2 }}>{selected.name}</div>
          <div style={{ fontSize: 12, color: T.muted, marginBottom: 32 }}>{RL[selected.role]}</div>
          <div style={{ display: "flex", justifyContent: "center", gap: 14, marginBottom: 8, animation: shake ? "shake 0.4s ease" : undefined }}>
            {[0, 1, 2, 3].map(i => <div key={i} style={{ width: 14, height: 14, borderRadius: "50%", background: i < pin.length ? (error ? T.red : T.accent) : T.border2, border: `2px solid ${i < pin.length ? (error ? T.red : T.accent) : T.dim}` }} />)}
          </div>
          {error && <div style={{ color: T.red, fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Incorrect PIN</div>}
          <div style={{ marginBottom: 28 }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
            {KEYS.map((k, i) => (
              <button key={i} onClick={() => { if (k === "⌫") { setPin(p => p.slice(0, -1)); setError(false); } else if (k) addDigit(k); }} disabled={!k}
                style={{ height: 62, borderRadius: 14, border: `1px solid ${T.border2}`, background: k ? T.surf2 : "transparent", color: k === "⌫" ? T.muted : T.text, fontSize: k === "⌫" ? 20 : 22, fontWeight: 700, cursor: k ? "pointer" : "default", fontFamily: "inherit" }}
                onMouseEnter={e => { if (k) { e.currentTarget.style.background = "#1a1a1a"; e.currentTarget.style.borderColor = T.accent; } }}
                onMouseLeave={e => { if (k) { e.currentTarget.style.background = T.surf2; e.currentTarget.style.borderColor = T.border2; } }}>
                {k}
              </button>
            ))}
          </div>
        </div>
      )}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700;800;900&display=swap');@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-5px)}80%{transform:translateX(5px)}}`}</style>
    </div>
  );
}

// ─── Takeoff Sheet ────────────────────────────────────────────────────────────
function TakeoffSheet({ takeoff = [], onChange, readOnly }) {
  const addRow = () => onChange([...takeoff, { id: uid(), desc: "", qty: 1, unit: "ea", cost: 0, markup: 0 }]);
  const upd = (idx, k, v) => onChange(takeoff.map((r, i) => i === idx ? { ...r, [k]: v } : r));
  const del = idx => onChange(takeoff.filter((_, i) => i !== idx));
  const totalCost = takeoff.reduce((s, r) => s + Number(r.qty) * Number(r.cost), 0);
  const totalSell = takeoff.reduce((s, r) => s + Number(r.qty) * Number(r.cost) * (1 + Number(r.markup) / 100), 0);
  const margin = totalSell > 0 ? ((totalSell - totalCost) / totalSell * 100).toFixed(1) : 0;
  const inp = (v, k, idx, w) => (
    <input value={v} onChange={e => upd(idx, k, e.target.value)} readOnly={readOnly}
      style={{ width: w || "100%", background: "#070707", border: `1px solid ${T.border2}`, borderRadius: 6, padding: "5px 7px", color: T.text, fontSize: 12, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
  );
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 48px 48px 64px 70px 60px 70px 24px", gap: 4, marginBottom: 6 }}>
        {["Description", "Qty", "Unit", "Cost($)", "Markup%", "Sell($)", "Total($)", ""].map((h, i) => (
          <div key={i} style={{ color: T.dim, fontSize: 9, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>{h}</div>
        ))}
      </div>
      {takeoff.map((row, idx) => {
        const sellUnit = (Number(row.cost) * (1 + Number(row.markup) / 100)).toFixed(2);
        const total = (Number(row.qty) * Number(sellUnit)).toFixed(2);
        return (
          <div key={row.id || idx} style={{ display: "grid", gridTemplateColumns: "1fr 48px 48px 64px 70px 60px 70px 24px", gap: 4, marginBottom: 4, alignItems: "center" }}>
            {inp(row.desc, "desc", idx)}
            {inp(row.qty, "qty", idx, "48px")}
            <input value={row.unit} onChange={e => upd(idx, "unit", e.target.value)} style={{ width: 48, background: "#070707", border: `1px solid ${T.border2}`, borderRadius: 6, padding: "5px 5px", color: T.text, fontSize: 11, outline: "none", fontFamily: "inherit" }} />
            {inp(row.cost, "cost", idx, "64px")}
            {inp(row.markup, "markup", idx, "70px")}
            <div style={{ fontSize: 12, color: T.muted, textAlign: "right" }}>{fmt(sellUnit)}</div>
            <div style={{ fontSize: 12, color: T.accent, fontWeight: 700, textAlign: "right" }}>{fmt(total)}</div>
            {!readOnly && <button onClick={() => del(idx)} style={{ background: "none", border: "none", color: T.red, cursor: "pointer", fontSize: 13, padding: 0, fontFamily: "inherit" }}>✕</button>}
          </div>
        );
      })}
      {!readOnly && <button onClick={addRow} style={{ background: "none", border: `1px dashed ${T.border2}`, borderRadius: 6, padding: "5px 0", color: T.muted, cursor: "pointer", fontSize: 12, width: "100%", marginTop: 4, fontFamily: "inherit" }}>+ Add Line</button>}
      <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${T.border}`, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {[["TOTAL COST", fmt(totalCost), T.red], ["SELL PRICE", fmt(totalSell), T.accent], ["MARGIN", `${margin}%`, Number(margin) > 20 ? T.green : T.yellow]].map(([l, v, c]) => (
          <div key={l} style={{ textAlign: "center" }}>
            <div style={{ color: T.muted, fontSize: 10, fontWeight: 700, letterSpacing: 0.5 }}>{l}</div>
            <div style={{ color: c, fontWeight: 800, fontSize: 15, marginTop: 2 }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Document Preview ─────────────────────────────────────────────────────────
function DocumentPreview({ doc, type, onClose }) {
  const totalExGST = doc.amount_ex_gst || doc.total_ex_gst || doc.totalExGST || doc.amountExGST || 0;
  const gst = totalExGST * 0.1;
  const totalIncGST = totalExGST + gst;
  const isInvoice = type === "invoice";
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, overflowY: "auto" }}>
      <div style={{ background: "#fff", color: "#111", width: "100%", maxWidth: 680, borderRadius: 4, fontFamily: "'Georgia','Times New Roman',serif", fontSize: 13, lineHeight: 1.5 }}>
        <div style={{ padding: "32px 40px 20px", borderBottom: "2px solid #e0e0e0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <LogoMark size={50} dark />
            <div style={{ fontFamily: "sans-serif", fontSize: 15, fontWeight: 700 }}>tri-core</div>
            <div style={{ fontFamily: "sans-serif", fontSize: 11, color: "#555" }}>Electrical Solutions</div>
            <div style={{ fontFamily: "sans-serif", fontSize: 9, color: "#888", marginTop: 4 }}>{BUSINESS.licences}</div>
          </div>
          <div style={{ textAlign: "right", fontFamily: "sans-serif" }}>
            <div style={{ fontSize: 12, color: "#555" }}>{BUSINESS.address}</div>
            <div style={{ fontSize: 12, color: "#555" }}>{BUSINESS.suburb}</div>
            <div style={{ fontSize: 12, color: "#555" }}>{BUSINESS.phone}</div>
            <div style={{ fontSize: 12, color: "#555", marginBottom: 10 }}>{BUSINESS.email}</div>
            <div style={{ fontWeight: 800, fontSize: 15 }}>Tax Invoice</div>
            <div style={{ fontSize: 12, color: "#555" }}>ABN: {BUSINESS.abn}</div>
            {isInvoice && <><div style={{ fontSize: 12, marginTop: 6 }}>Invoice # {doc.invoice_no || doc.invoiceNo}</div><div style={{ fontSize: 12, color: "#555" }}>{fmtDateLong(doc.issued_date || doc.issuedDate)}</div></>}
            {!isInvoice && <><div style={{ fontSize: 12, marginTop: 6 }}>Quote # {doc.id?.slice(-4).toUpperCase()}</div><div style={{ fontSize: 12, color: "#555" }}>{fmtDateLong(doc.created_date || doc.createdDate)}</div></>}
          </div>
        </div>
        <div style={{ padding: "20px 40px", borderBottom: "1px solid #e8e8e8" }}>
          <div style={{ fontFamily: "sans-serif", fontWeight: 700, fontSize: 12, marginBottom: 4 }}>{doc.clientName}</div>
          <div style={{ fontFamily: "sans-serif", fontSize: 12, color: "#555" }}>{doc.clientAddress}</div>
        </div>
        <div style={{ padding: "20px 40px" }}>
          <div style={{ fontFamily: "sans-serif", fontWeight: 700, fontSize: 12, marginBottom: 6 }}>{isInvoice ? "WORK COMPLETED:" : "SCOPE OF WORKS:"}</div>
          <div style={{ fontFamily: "sans-serif", fontSize: 12, color: "#333", marginBottom: 16, lineHeight: 1.7 }}>{doc.scope_of_works || doc.scopeOfWorks}</div>
          {!isInvoice && totalExGST >= 1000 && (
            <div style={{ fontFamily: "sans-serif", fontSize: 11, color: "#555", background: "#f8f8f8", border: "1px solid #e0e0e0", padding: "10px 14px", borderRadius: 4, marginBottom: 16 }}>
              <strong>DEPOSIT CLAUSE</strong><br />Due to quotation value exceeding $1,000 ex GST, a deposit of 50% will be required prior to works proceeding.
            </div>
          )}
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 16 }}>
            <thead>
              <tr style={{ background: "#f0f0f0" }}>
                {["DESCRIPTION", "QTY", "UNIT PRICE", "TOTAL PRICE"].map(h => <th key={h} style={{ padding: "8px 10px", textAlign: h === "DESCRIPTION" ? "left" : "right", fontFamily: "sans-serif", fontSize: 11, fontWeight: 700, borderBottom: "2px solid #ccc" }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: "10px", fontFamily: "sans-serif", fontSize: 12, borderBottom: "1px solid #e8e8e8" }}>Total</td>
                <td style={{ padding: "10px", textAlign: "right", fontFamily: "sans-serif", fontSize: 12, borderBottom: "1px solid #e8e8e8" }}>1</td>
                <td style={{ padding: "10px", textAlign: "right", fontFamily: "sans-serif", fontSize: 12, borderBottom: "1px solid #e8e8e8" }}>{fmt(totalExGST)}</td>
                <td style={{ padding: "10px", textAlign: "right", fontFamily: "sans-serif", fontSize: 12, borderBottom: "1px solid #e8e8e8" }}>{fmt(totalExGST)}</td>
              </tr>
            </tbody>
          </table>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
            <table style={{ width: 280 }}>
              <tbody>
                {[["SUBTOTAL:", fmt(totalExGST)], ["GST:", fmt(gst)], ["TOTAL:", fmt(totalIncGST)], ["PAID:", fmt(0)]].map(([l, v]) => (
                  <tr key={l}><td style={{ padding: "4px 8px", fontFamily: "sans-serif", fontSize: 12, textAlign: "right", color: "#555" }}>{l}</td><td style={{ padding: "4px 8px", fontFamily: "sans-serif", fontSize: 12, textAlign: "right" }}>{v}</td></tr>
                ))}
                <tr style={{ background: "#111" }}>
                  <td style={{ padding: "8px", fontFamily: "sans-serif", fontSize: 13, fontWeight: 700, textAlign: "right", color: "#fff" }}>BALANCE DUE:</td>
                  <td style={{ padding: "8px", fontFamily: "sans-serif", fontSize: 13, fontWeight: 700, textAlign: "right", color: "#fff" }}>{fmt(totalIncGST)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div style={{ fontSize: 11, color: "#777", fontFamily: "sans-serif", fontStyle: "italic" }}>A detailed breakdown is available upon request. An administration fee applies.</div>
        </div>
        <div style={{ borderTop: "1px solid #e0e0e0", padding: "20px 40px", background: "#fafafa" }}>
          <div style={{ fontFamily: "sans-serif", fontWeight: 700, fontSize: 13, marginBottom: 8 }}>How to Pay</div>
          <div style={{ fontFamily: "sans-serif", fontSize: 11, color: "#555", marginBottom: 6 }}>We accept payment by: Bank Deposit, Credit Card</div>
          <div style={{ fontFamily: "sans-serif", fontSize: 11 }}><strong>Name:</strong> {BUSINESS.name} &nbsp; <strong>BSB:</strong> {BUSINESS.bsb} &nbsp; <strong>Account:</strong> {BUSINESS.account}</div>
          <div style={{ textAlign: "center", fontFamily: "sans-serif", fontSize: 12, color: "#777", marginTop: 16, fontStyle: "italic" }}>Thank you for your business, have a great day!</div>
        </div>
        <div style={{ padding: "12px 40px", background: "#f0f0f0", display: "flex", justifyContent: "center", gap: 12 }}>
          <button onClick={onClose} style={{ background: "#111", border: "none", borderRadius: 8, padding: "10px 24px", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 13, fontFamily: "sans-serif" }}>Close</button>
          <button onClick={() => window.print()} style={{ background: "#fff", border: "1px solid #ccc", borderRadius: 8, padding: "10px 24px", color: "#111", cursor: "pointer", fontWeight: 700, fontSize: 13, fontFamily: "sans-serif" }}>Print / Save PDF</button>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function DashboardView({ appData, currentUser, setNav }) {
  const { jobs, invoices, forms, inventory } = appData;
  const [alerts, setAlerts] = useState([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);

  const active = jobs.filter(j => j.status === "in_progress").length;
  const sched = jobs.filter(j => j.status === "scheduled").length;
  const overdueInvs = invoices.filter(i => i.status === "overdue");
  const overdueAmt = overdueInvs.reduce((s, i) => s + (i.amount_ex_gst || 0), 0);
  const pendForms = forms.filter(f => f.status === "pending").length;
  const pipeline = jobs.filter(j => !j.invoiced).reduce((s, j) => s + (j.value || 0), 0);
  const lowStock = inventory.filter(i => i.warehouse_qty <= i.reorder_at);
  const hrs = new Date().getHours();
  const greet = hrs < 12 ? "Good morning" : hrs < 17 ? "Good afternoon" : "G'day";

  const runAlerts = async () => {
    setLoadingAlerts(true);
    const r = await callAI(
      `You are a business intelligence assistant for tri-core Electrical Solutions Perth. Analyse data and return 3-4 short actionable alerts, each on a new line starting with an emoji. Be direct and specific.`,
      `Active jobs: ${active}, Scheduled: ${sched}, Overdue invoices: ${overdueInvs.length} totalling ${fmt(overdueAmt)}, Pending forms: ${pendForms}, Low stock: ${lowStock.length}, Pipeline: ${fmt(pipeline)}`
    );
    setAlerts(r.split("\n").filter(Boolean));
    setLoadingAlerts(false);
  };

  return (
    <div>
      <div style={{ marginBottom: 26 }}>
        <div style={{ color: T.muted, fontSize: 14 }}>{greet},</div>
        <h2 style={{ margin: "3px 0 0", fontSize: 26, fontWeight: 900, letterSpacing: -0.5 }}>{currentUser.name} <span style={{ fontWeight: 400 }}>👋</span></h2>
      </div>

      {currentUser.role === "admin" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
            {[
              { label: "ACTIVE JOBS", val: active, color: T.green, sub: `${sched} scheduled`, nav: "jobs" },
              { label: "PIPELINE", val: fmt(pipeline), color: T.accent, sub: "uninvoiced work", nav: "invoices" },
              { label: "OVERDUE", val: fmt(overdueAmt), color: T.red, sub: `${overdueInvs.length} invoices`, nav: "invoices" },
              { label: "PENDING FORMS", val: pendForms, color: T.yellow, sub: "need completion", nav: "forms" },
            ].map(s => (
              <Card key={s.label} onClick={() => setNav(s.nav)}>
                <div style={{ color: T.dim, fontSize: 9, fontWeight: 700, letterSpacing: 1.2, marginBottom: 6 }}>{s.label}</div>
                <div style={{ color: s.color, fontSize: 24, fontWeight: 900, letterSpacing: -0.5, marginBottom: 3 }}>{s.val}</div>
                <div style={{ color: T.muted, fontSize: 11 }}>{s.sub}</div>
              </Card>
            ))}
          </div>

          {lowStock.length > 0 && (
            <div style={{ background: "rgba(251,191,36,0.08)", border: `1px solid ${T.yellow}`, borderRadius: 12, padding: "10px 14px", marginBottom: 16, cursor: "pointer" }} onClick={() => setNav("inventory")}>
              <div style={{ color: T.yellow, fontWeight: 700, fontSize: 13 }}>⚠ {lowStock.length} item{lowStock.length !== 1 ? "s" : ""} need restocking — tap to view</div>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <SectionHead>AI Business Alerts</SectionHead>
            <button onClick={runAlerts} disabled={loadingAlerts} style={{ background: "rgba(26,111,175,0.1)", border: `1px solid ${T.accent}`, borderRadius: 8, padding: "5px 12px", color: T.accent, cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "inherit" }}>
              {loadingAlerts ? "Analysing..." : "🤖 Run Analysis"}
            </button>
          </div>
          {alerts.length > 0 && (
            <Card style={{ marginBottom: 20 }}>
              {alerts.map((a, i) => <div key={i} style={{ fontSize: 13, color: T.text, padding: "6px 0", borderBottom: i < alerts.length - 1 ? `1px solid ${T.border}` : "none", lineHeight: 1.5 }}>{a}</div>)}
            </Card>
          )}
        </>
      )}

      <SectionHead>{currentUser.role === "admin" ? "Recent Jobs" : "Your Jobs"}</SectionHead>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {(currentUser.role !== "admin" ? jobs.filter(j => (j.assigned_to || []).includes(currentUser.id)) : jobs).slice(0, 5).map(job => {
          const cl = appData.clients.find(c => c.id === job.client_id);
          return (
            <Card key={job.id} onClick={() => setNav("jobs")}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{job.title}</div>
                  <div style={{ color: T.muted, fontSize: 12, marginTop: 2 }}>{cl?.name} · {fmtDate(job.start_date)}</div>
                </div>
                <Badge status={job.status} />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─── Schedule ─────────────────────────────────────────────────────────────────
function ScheduleView({ appData, setAppData, currentUser }) {
  const [offset, setOffset] = useState(0);
  const [modal, setModal] = useState(false);
  const [editJob, setEditJob] = useState(null);
  const TODAY = todayStr();

  const days = (() => {
    const base = new Date(TODAY), mon = new Date(base);
    mon.setDate(base.getDate() - base.getDay() + 1 + offset * 7);
    return Array.from({ length: 7 }, (_, i) => { const d = new Date(mon); d.setDate(mon.getDate() + i); return d; });
  })();

  const jobsOn = day => {
    const ds = day.toISOString().split("T")[0];
    const mine = currentUser.role !== "admin" ? appData.jobs.filter(j => (j.assigned_to || []).includes(currentUser.id)) : appData.jobs;
    return mine.filter(j => j.start_date <= ds && j.end_date >= ds);
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: -0.5 }}>Schedule</h2>
        {currentUser.role === "admin" && <Btn onClick={() => { setEditJob(null); setModal(true); }}>+ New Job</Btn>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        <Btn variant="ghost" onClick={() => setOffset(o => o - 1)} style={{ padding: "6px 14px" }}>‹</Btn>
        <span style={{ color: T.muted, fontSize: 13, fontWeight: 600 }}>{days[0].toLocaleDateString("en-AU", { day: "numeric", month: "short" })} — {days[6].toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}</span>
        <Btn variant="ghost" onClick={() => setOffset(o => o + 1)} style={{ padding: "6px 14px" }}>›</Btn>
        <button onClick={() => setOffset(0)} style={{ background: "none", border: `1px solid ${T.accent}`, borderRadius: 8, padding: "5px 12px", color: T.accent, cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit" }}>Today</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6 }}>
        {days.map((day, i) => {
          const ds = day.toISOString().split("T")[0];
          const isToday = ds === TODAY;
          const jobs = jobsOn(day);
          return (
            <div key={i} style={{ minHeight: 110 }}>
              <div style={{ textAlign: "center", marginBottom: 5 }}>
                <div style={{ fontSize: 10, color: T.muted, fontWeight: 700 }}>{"MTWTFSS"[i]}</div>
                <div style={{ fontSize: 17, fontWeight: 900, color: isToday ? T.accent : T.text, background: isToday ? "rgba(26,111,175,0.15)" : "none", borderRadius: 7, padding: "1px 0" }}>{day.getDate()}</div>
              </div>
              {jobs.map(job => {
                const s = SC[job.status];
                return (
                  <div key={job.id} onClick={() => { setEditJob(job); setModal(true); }}
                    style={{ background: s.bg, borderLeft: `3px solid ${s.border}`, borderRadius: 5, padding: "3px 5px", cursor: "pointer", marginBottom: 3 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: s.text, lineHeight: 1.3 }}>{job.title}</div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      {modal && <JobModal appData={appData} setAppData={setAppData} job={editJob} onClose={() => setModal(false)} />}
    </div>
  );
}

// ─── Job Modal ────────────────────────────────────────────────────────────────
function JobModal({ appData, setAppData, job, onClose }) {
  const blank = { title: "", client_id: appData.clients[0]?.id || "", division_id: "d1", category_id: "d1c1", status: "scheduled", priority: "medium", assigned_to: [], start_date: todayStr(), end_date: todayStr(), description: "", value: 0, cost: 0, invoiced: false, quote_status: "pending", takeoff: [], scope_of_works: "", extra_lines: [], po_number: "" };
  const [f, setF] = useState(job ? { ...job, takeoff: job.takeoff || [], extra_lines: job.extra_lines || [], assigned_to: job.assigned_to || [] } : blank);
  const [tab, setTab] = useState("details");
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(null);
  const [showAI, setShowAI] = useState(false);
  const [aiResult, setAiResult] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const isNew = !job;
  const set = k => v => setF(p => ({ ...p, [k]: v }));

  const divObj = appData.divisions.find(d => d.id === f.division_id);
  const cats = appData.categories.filter(c => c.division_id === f.division_id);
  const totalSell = (f.takeoff || []).reduce((s, r) => s + Number(r.qty) * Number(r.cost) * (1 + Number(r.markup) / 100), 0);
  const totalCost = (f.takeoff || []).reduce((s, r) => s + Number(r.qty) * Number(r.cost), 0);

  const save = async () => {
    if (!f.title) return;
    setSaving(true);
    try {
      const payload = { ...f, value: f.takeoff?.length ? totalSell : Number(f.value), cost: f.takeoff?.length ? totalCost : Number(f.cost), assigned_to: JSON.stringify(f.assigned_to), takeoff: JSON.stringify(f.takeoff || []), extra_lines: JSON.stringify(f.extra_lines || []) };
      if (isNew) {
        const newJob = { ...payload, id: "j" + uid() };
        await db.post("jobs", newJob);
        setAppData(p => ({ ...p, jobs: [...p.jobs, { ...newJob, assigned_to: f.assigned_to, takeoff: f.takeoff, extra_lines: f.extra_lines }] }));
      } else {
        await db.patch("jobs", job.id, payload);
        setAppData(p => ({ ...p, jobs: p.jobs.map(j => j.id === job.id ? { ...f, value: payload.value, cost: payload.cost } : j) }));
      }
      onClose();
    } catch (e) { alert("Save failed: " + e.message); }
    setSaving(false);
  };

  const del = async () => {
    setSaving(true);
    await db.del("jobs", job.id);
    setAppData(p => ({ ...p, jobs: p.jobs.filter(j => j.id !== job.id) }));
    onClose();
  };

  const runAI = async type => {
    setAiLoading(true); setAiResult("");
    const sys = `You are an AI assistant for tri-core Electrical Solutions, Perth WA electrical contractors. Rates: $150/hr tradesman, $110/hr assistant, $80/hr apprentice.`;
    let usr = "";
    if (type === "scope") { usr = `Write a 2-3 sentence professional scope of works for a client-facing quote. Job: ${f.title}, Category: ${appData.categories.find(c => c.id === f.category_id)?.name}, Notes: ${f.description}. No prices or quantities.`; }
    else if (type === "risk") { usr = `Analyse this job for risks: over budget, tight timeline, compliance gaps. Be brief. Job: ${JSON.stringify(f)}`; }
    const r = await callAI(sys, usr);
    setAiResult(r); setAiLoading(false);
  };

  return (
    <>
      <Modal title={isNew ? "New Job" : "Edit Job"} onClose={onClose} wide>
        <div style={{ display: "flex", gap: 0, marginBottom: 18, borderBottom: `1px solid ${T.border}` }}>
          {["details", "takeoff", "document"].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ background: "none", border: "none", borderBottom: tab === t ? `2px solid ${T.accent}` : "2px solid transparent", color: tab === t ? T.accent : T.muted, padding: "8px 14px", cursor: "pointer", fontSize: 13, fontWeight: tab === t ? 700 : 500, fontFamily: "inherit", textTransform: "capitalize" }}>
              {t === "document" ? "Client Doc" : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {tab === "details" && (
          <>
            <Inp label="Job Title" value={f.title} onChange={set("title")} required />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Inp label="Client" value={f.client_id} onChange={set("client_id")} options={appData.clients.map(c => ({ value: c.id, label: c.name }))} />
              <Inp label="P.O. Number" value={f.po_number} onChange={set("po_number")} placeholder="Optional" />
              <Inp label="Division" value={f.division_id} onChange={v => { set("division_id")(v); set("category_id")(appData.categories.find(c => c.division_id === v)?.id || ""); }} options={appData.divisions.map(d => ({ value: d.id, label: d.name }))} />
              <Inp label="Category" value={f.category_id} onChange={set("category_id")} options={cats.map(c => ({ value: c.id, label: c.name }))} />
              <Inp label="Status" value={f.status} onChange={set("status")} options={["scheduled", "in_progress", "completed", "cancelled"].map(s => ({ value: s, label: SC[s].label }))} />
              <Inp label="Priority" value={f.priority} onChange={set("priority")} options={["high", "medium", "low"].map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))} />
              <Inp label="Start Date" value={f.start_date} onChange={set("start_date")} type="date" />
              <Inp label="End Date" value={f.end_date} onChange={set("end_date")} type="date" />
            </div>
            <Inp label="Description / Notes" value={f.description} onChange={set("description")} />
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", color: T.muted, fontSize: 11, marginBottom: 8, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase" }}>Assign Staff</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {appData.users.map(u => (
                  <label key={u.id} style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", color: "#ccc", fontSize: 13 }}>
                    <input type="checkbox" checked={(f.assigned_to || []).includes(u.id)} onChange={e => { const at = e.target.checked ? [...(f.assigned_to || []), u.id] : (f.assigned_to || []).filter(id => id !== u.id); set("assigned_to")(at); }} />
                    {u.name}
                  </label>
                ))}
              </div>
            </div>
          </>
        )}

        {tab === "takeoff" && (
          <>
            <div style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: T.red }}>
              🔒 <strong>Internal only</strong> — clients never see this. Each line has its own markup you can adjust individually.
            </div>
            <TakeoffSheet takeoff={f.takeoff || []} onChange={set("takeoff")} />
          </>
        )}

        {tab === "document" && (
          <>
            <div style={{ background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: T.green }}>
              ✅ <strong>Client-facing</strong> — scope + lump sum only. No quantities or unit prices shown.
            </div>
            <Inp label="Scope of Works" value={f.scope_of_works} onChange={set("scope_of_works")} placeholder="Describe works in plain English..." />
            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              <button onClick={() => runAI("scope")} style={{ background: "rgba(26,111,175,0.1)", border: `1px solid ${T.accent}`, borderRadius: 8, padding: "6px 12px", color: T.accent, cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit" }}>🤖 AI: Write Scope</button>
              <button onClick={() => runAI("risk")} style={{ background: "rgba(248,113,113,0.1)", border: `1px solid ${T.red}`, borderRadius: 8, padding: "6px 12px", color: T.red, cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit" }}>🤖 AI: Risk Check</button>
            </div>
            {aiLoading && <div style={{ color: T.muted, fontSize: 13, fontStyle: "italic", marginBottom: 12 }}>AI thinking...</div>}
            {aiResult && (
              <div style={{ background: "#070707", border: `1px solid ${T.border}`, borderRadius: 10, padding: 14, fontSize: 13, color: T.text, lineHeight: 1.6, marginBottom: 14 }}>
                {aiResult}
                <button onClick={() => set("scope_of_works")(aiResult)} style={{ display: "block", marginTop: 8, background: "rgba(26,111,175,0.2)", border: `1px solid ${T.accent}`, borderRadius: 7, padding: "4px 12px", color: T.accent, cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit" }}>Use this ↑</button>
              </div>
            )}
            <Btn onClick={() => { const cl = appData.clients.find(c => c.id === f.client_id); setPreview({ ...f, clientName: cl?.name, clientAddress: cl?.address, totalExGST: totalSell || f.value }); }} variant="ghost" style={{ width: "100%", marginTop: 4 }}>👁 Preview Client Document</Btn>
          </>
        )}

        <Divider />
        <div style={{ display: "flex", gap: 10 }}>
          <Btn onClick={save} disabled={saving} style={{ flex: 1 }}>{saving ? "Saving..." : isNew ? "Create Job" : "Save Changes"}</Btn>
          {!isNew && <Btn onClick={del} variant="danger" disabled={saving}>Delete</Btn>}
        </div>
      </Modal>
      {preview && <DocumentPreview doc={preview} type="quote" onClose={() => setPreview(null)} />}
    </>
  );
}

// ─── Jobs View ────────────────────────────────────────────────────────────────
function JobsView({ appData, setAppData, currentUser }) {
  const [filter, setFilter] = useState("all");
  const [divFilter, setDivFilter] = useState("all");
  const [modal, setModal] = useState(false);
  const [editJob, setEditJob] = useState(null);
  const mine = currentUser.role !== "admin" ? appData.jobs.filter(j => (j.assigned_to || []).includes(currentUser.id)) : appData.jobs;
  const list = mine.filter(j => (filter === "all" || j.status === filter) && (divFilter === "all" || j.division_id === divFilter));

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: -0.5 }}>Jobs</h2>
        {currentUser.role === "admin" && <Btn onClick={() => { setEditJob(null); setModal(true); }}>+ New Job</Btn>}
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
        {["all", "scheduled", "in_progress", "completed", "cancelled"].map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{ background: filter === s ? T.accent : "transparent", border: `1px solid ${filter === s ? T.accent : T.border2}`, borderRadius: 99, padding: "5px 12px", color: filter === s ? "#fff" : T.muted, cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit" }}>
            {s === "all" ? "All" : SC[s]?.label}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        <button onClick={() => setDivFilter("all")} style={{ background: divFilter === "all" ? "rgba(26,111,175,0.2)" : "transparent", border: `1px solid ${divFilter === "all" ? T.accent : T.border2}`, borderRadius: 99, padding: "4px 12px", color: divFilter === "all" ? T.accent : T.muted, cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "inherit" }}>All Divisions</button>
        {appData.divisions.map(d => (
          <button key={d.id} onClick={() => setDivFilter(d.id)} style={{ background: divFilter === d.id ? "rgba(26,111,175,0.2)" : "transparent", border: `1px solid ${divFilter === d.id ? T.accent : T.border2}`, borderRadius: 99, padding: "4px 12px", color: divFilter === d.id ? T.accent : T.muted, cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "inherit" }}>{d.name}</button>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {list.map(job => {
          const cl = appData.clients.find(c => c.id === job.client_id);
          const staff = appData.users.filter(u => (job.assigned_to || []).includes(u.id));
          const div = appData.divisions.find(d => d.id === job.division_id);
          const cat = appData.categories.find(c => c.id === job.category_id);
          const margin = job.value > 0 && job.cost > 0 ? ((job.value - job.cost) / job.value * 100).toFixed(0) : null;
          return (
            <Card key={job.id} onClick={() => { setEditJob(job); setModal(true); }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: PC[job.priority], flexShrink: 0 }} />
                    <span style={{ fontWeight: 800, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{job.title}</span>
                  </div>
                  <div style={{ color: T.muted, fontSize: 12, marginBottom: 8 }}>{cl?.name} · {fmtDate(job.start_date)}</div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    <Badge status={job.status} />
                    {div && <span style={{ fontSize: 11, color: T.muted, background: T.surf, border: `1px solid ${T.border}`, borderRadius: 6, padding: "1px 7px" }}>{div.name}</span>}
                    {cat && <span style={{ fontSize: 11, color: T.dim }}>{cat.name}</span>}
                    <span style={{ color: T.accent, fontWeight: 700, fontSize: 13 }}>{fmt(job.value || 0)}</span>
                    {margin && <span style={{ fontSize: 11, fontWeight: 700, color: Number(margin) > 20 ? T.green : T.yellow }}>{margin}% margin</span>}
                  </div>
                </div>
                <div style={{ display: "flex", flexShrink: 0 }}>
                  {staff.map((u, i) => <div key={u.id} style={{ marginLeft: i > 0 ? -8 : 0, zIndex: staff.length - i }}><Av name={u.name} size={28} color={u.color} /></div>)}
                </div>
              </div>
            </Card>
          );
        })}
        {list.length === 0 && <div style={{ textAlign: "center", color: T.muted, padding: "40px 0", fontSize: 14 }}>No jobs found</div>}
      </div>
      {modal && <JobModal appData={appData} setAppData={setAppData} job={editJob} onClose={() => setModal(false)} />}
    </div>
  );
}

// ─── Clients View ─────────────────────────────────────────────────────────────
function ClientsView({ appData, setAppData, currentUser }) {
  const [modal, setModal] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const f = k => v => setForm(p => ({ ...p, [k]: v }));
  const open = c => { setEdit(c || null); setForm(c || { name: "", contact: "", phone: "", email: "", address: "" }); setModal(true); };
  const save = async () => {
    if (!form.name) return; setSaving(true);
    try {
      if (!edit) { const nc = { ...form, id: "c" + uid() }; await db.post("clients", nc); setAppData(p => ({ ...p, clients: [...p.clients, nc] })); }
      else { await db.patch("clients", edit.id, form); setAppData(p => ({ ...p, clients: p.clients.map(c => c.id === edit.id ? { ...form, id: c.id } : c) })); }
      setModal(false);
    } catch (e) { alert("Save failed: " + e.message); }
    setSaving(false);
  };
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: -0.5 }}>Clients</h2>
        {currentUser.role === "admin" && <Btn onClick={() => open(null)}>+ New Client</Btn>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {appData.clients.map(cl => {
          const jobs = appData.jobs.filter(j => j.client_id === cl.id);
          const val = jobs.reduce((s, j) => s + (j.value || 0), 0);
          return (
            <Card key={cl.id} onClick={() => open(cl)}>
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <Av name={cl.name} size={44} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cl.name}</div>
                  <div style={{ color: T.muted, fontSize: 13, marginTop: 2 }}>{cl.contact} · {cl.phone}</div>
                  <div style={{ color: T.dim, fontSize: 12, marginTop: 2 }}>{cl.address}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ color: T.accent, fontWeight: 800, fontSize: 15 }}>{fmt(val)}</div>
                  <div style={{ color: T.muted, fontSize: 11 }}>{jobs.length} job{jobs.length !== 1 ? "s" : ""}</div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      {modal && (
        <Modal title={edit ? "Edit Client" : "New Client"} onClose={() => setModal(false)}>
          <Inp label="Business Name" value={form.name} onChange={f("name")} required />
          <Inp label="Contact Person" value={form.contact} onChange={f("contact")} />
          <Inp label="Phone" value={form.phone} onChange={f("phone")} />
          <Inp label="Email" value={form.email} onChange={f("email")} type="email" />
          <Inp label="Address" value={form.address} onChange={f("address")} />
          <Divider /><Btn onClick={save} disabled={saving} style={{ width: "100%" }}>{saving ? "Saving..." : edit ? "Save Changes" : "Create Client"}</Btn>
        </Modal>
      )}
    </div>
  );
}

// ─── Invoices View ────────────────────────────────────────────────────────────
function InvoicesView({ appData, setAppData, currentUser }) {
  const [modal, setModal] = useState(false);
  const [edit, setEdit] = useState(null);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const outstanding = appData.invoices.filter(i => i.status !== "paid").reduce((s, i) => s + (i.amount_ex_gst || 0), 0);
  const overdue = appData.invoices.filter(i => i.status === "overdue").reduce((s, i) => s + (i.amount_ex_gst || 0), 0);
  const collected = appData.invoices.filter(i => i.status === "paid").reduce((s, i) => s + (i.amount_ex_gst || 0), 0);

  const blank = { client_id: appData.clients[0]?.id || "", title: "", status: "draft", amount_ex_gst: "", issued_date: todayStr(), due_date: "", paid_date: null, invoice_no: String(appData.nextInvoiceNo || 1602), scope_of_works: "", po_number: "" };
  const [form, setForm] = useState(blank);
  const fset = k => v => setForm(p => ({ ...p, [k]: v }));

  const openEdit = inv => { setEdit(inv); setForm(inv ? { ...inv } : blank); setModal(true); };

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...form, amount_ex_gst: Number(form.amount_ex_gst) };
      if (!edit) { const ni = { ...payload, id: "i" + uid() }; await db.post("invoices", ni); setAppData(p => ({ ...p, invoices: [...p.invoices, ni], nextInvoiceNo: (p.nextInvoiceNo || 1602) + 1 })); }
      else { await db.patch("invoices", edit.id, payload); setAppData(p => ({ ...p, invoices: p.invoices.map(x => x.id === edit.id ? payload : x) })); }
      setModal(false);
    } catch (e) { alert("Save failed: " + e.message); }
    setSaving(false);
  };

  const openPreview = inv => { const cl = appData.clients.find(c => c.id === inv.client_id); setPreview({ ...inv, clientName: cl?.name, clientAddress: cl?.address }); };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: -0.5 }}>Invoices</h2>
        {currentUser.role === "admin" && <Btn onClick={() => { setEdit(null); setForm(blank); setModal(true); }}>+ New Invoice</Btn>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 22 }}>
        {[{ label: "OUTSTANDING", val: outstanding, color: T.blue }, { label: "OVERDUE", val: overdue, color: T.red }, { label: "COLLECTED", val: collected, color: T.green }].map(s => (
          <Card key={s.label} style={{ padding: 14 }}>
            <div style={{ color: T.muted, fontSize: 9, fontWeight: 700, letterSpacing: 1, marginBottom: 5 }}>{s.label}</div>
            <div style={{ color: s.color, fontSize: 18, fontWeight: 900 }}>{fmt(s.val)}</div>
            <div style={{ color: T.dim, fontSize: 10, marginTop: 2 }}>+GST {fmt(s.val * 0.1)}</div>
          </Card>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {appData.invoices.map(inv => {
          const cl = appData.clients.find(c => c.id === inv.client_id);
          return (
            <Card key={inv.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>#{inv.invoice_no} — {inv.title}</div>
                  <div style={{ color: T.muted, fontSize: 12, marginBottom: 8 }}>{cl?.name} · Due {fmtDate(inv.due_date)}</div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <Badge status={inv.status} />
                    {inv.paid_date && <span style={{ color: T.green, fontSize: 11, fontWeight: 600 }}>Paid {fmtDate(inv.paid_date)}</span>}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ color: inv.status === "paid" ? T.green : inv.status === "overdue" ? T.red : T.accent, fontWeight: 900, fontSize: 18 }}>{fmt(inv.amount_ex_gst || 0)}</div>
                  <div style={{ color: T.muted, fontSize: 10, marginTop: 2 }}>+GST {fmt((inv.amount_ex_gst || 0) * 0.1)}</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 8, justifyContent: "flex-end" }}>
                    <button onClick={() => openPreview(inv)} style={{ background: "transparent", border: `1px solid ${T.border2}`, borderRadius: 7, padding: "4px 10px", color: T.muted, cursor: "pointer", fontSize: 11, fontFamily: "inherit" }}>Preview</button>
                    <button onClick={() => openEdit(inv)} style={{ background: T.accent, border: "none", borderRadius: 7, padding: "4px 10px", color: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "inherit" }}>Edit</button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      {modal && (
        <Modal title={edit ? "Edit Invoice" : "New Invoice"} onClose={() => setModal(false)}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Inp label="Invoice #" value={form.invoice_no} onChange={fset("invoice_no")} />
            <Inp label="Client" value={form.client_id} onChange={fset("client_id")} options={appData.clients.map(c => ({ value: c.id, label: c.name }))} />
            <Inp label="Title" value={form.title} onChange={fset("title")} required />
            <Inp label="Amount ex GST ($)" value={form.amount_ex_gst} onChange={fset("amount_ex_gst")} type="number" />
            <Inp label="Status" value={form.status} onChange={fset("status")} options={["draft", "sent", "paid", "overdue"].map(s => ({ value: s, label: SC[s]?.label || s }))} />
            <Inp label="Due Date" value={form.due_date} onChange={fset("due_date")} type="date" />
          </div>
          {form.status === "paid" && <Inp label="Paid Date" value={form.paid_date || ""} onChange={fset("paid_date")} type="date" />}
          <Inp label="Scope of Works (shown on invoice)" value={form.scope_of_works} onChange={fset("scope_of_works")} placeholder="Works completed..." />
          <Divider /><Btn onClick={save} disabled={saving} style={{ width: "100%" }}>{saving ? "Saving..." : edit ? "Save Changes" : "Create Invoice"}</Btn>
        </Modal>
      )}
      {preview && <DocumentPreview doc={preview} type="invoice" onClose={() => setPreview(null)} />}
    </div>
  );
}

// ─── Forms View ───────────────────────────────────────────────────────────────
function FormsView({ appData, setAppData, currentUser }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ title: "", job_id: "", assigned_to: "" });
  const mine = currentUser.role !== "admin" ? appData.forms.filter(f => f.assigned_to === currentUser.id) : appData.forms;

  const complete = async f => {
    await db.patch("forms", f.id, { status: "completed", completed_date: todayStr() });
    setAppData(p => ({ ...p, forms: p.forms.map(x => x.id === f.id ? { ...x, status: "completed", completed_date: todayStr() } : x) }));
  };

  const save = async () => {
    if (!form.title) return;
    const nf = { ...form, id: "f" + uid(), status: "pending", completed_date: null };
    await db.post("forms", nf);
    setAppData(p => ({ ...p, forms: [...p.forms, nf] }));
    setModal(false);
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: -0.5 }}>Forms & Checklists</h2>
        {currentUser.role === "admin" && <Btn onClick={() => setModal(true)}>+ New Form</Btn>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {mine.map(f => {
          const job = appData.jobs.find(j => j.id === f.job_id);
          const user = appData.users.find(u => u.id === f.assigned_to);
          return (
            <Card key={f.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>{f.title}</div>
                  <div style={{ color: T.muted, fontSize: 12, marginBottom: 8 }}>{job?.title} · {user?.name}</div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <Badge status={f.status} />
                    {f.completed_date && <span style={{ color: T.muted, fontSize: 11 }}>Completed {fmtDate(f.completed_date)}</span>}
                  </div>
                </div>
                {f.status === "pending" && <button onClick={() => complete(f)} style={{ background: "rgba(74,222,128,0.1)", border: `1px solid ${T.green}`, borderRadius: 9, padding: "8px 14px", color: T.green, cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit", whiteSpace: "nowrap" }}>✓ Complete</button>}
              </div>
            </Card>
          );
        })}
        {mine.length === 0 && <div style={{ textAlign: "center", color: T.muted, padding: "40px 0" }}>No forms assigned</div>}
      </div>
      {modal && (
        <Modal title="New Form / Checklist" onClose={() => setModal(false)}>
          <Inp label="Form Title" value={form.title} onChange={v => setForm(p => ({ ...p, title: v }))} required />
          <Inp label="Linked Job" value={form.job_id} onChange={v => setForm(p => ({ ...p, job_id: v }))} options={[{ value: "", label: "No job" }, ...appData.jobs.map(j => ({ value: j.id, label: j.title }))]} />
          <Inp label="Assign To" value={form.assigned_to} onChange={v => setForm(p => ({ ...p, assigned_to: v }))} options={[{ value: "", label: "Select..." }, ...appData.users.map(u => ({ value: u.id, label: u.name }))]} />
          <Divider /><Btn onClick={save} style={{ width: "100%" }}>Create Form</Btn>
        </Modal>
      )}
    </div>
  );
}

// ─── Timesheets ───────────────────────────────────────────────────────────────
function TimesheetsView({ appData, setAppData, currentUser }) {
  const [userFilter, setUserFilter] = useState(currentUser.role === "admin" ? "all" : currentUser.id);
  const [showAdd, setShowAdd] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [form, setForm] = useState({ user_id: currentUser.id, job_id: "", date: todayStr(), clock_in: "07:00", clock_out: "17:00", break_mins: 30, notes: "" });
  const [saving, setSaving] = useState(false);
  const fset = k => v => setForm(p => ({ ...p, [k]: v }));

  const entries = (userFilter === "all" ? appData.timesheets : appData.timesheets.filter(t => t.user_id === userFilter)).sort((a, b) => b.date.localeCompare(a.date));
  const hrs = t => { const [ih, im] = (t.clock_in || "0:0").split(":").map(Number), [oh, om] = (t.clock_out || "0:0").split(":").map(Number); return Math.max(0, ((oh * 60 + om) - (ih * 60 + im) - Number(t.break_mins || 0)) / 60); };
  const totalHrs = entries.reduce((s, t) => s + hrs(t), 0);
  const totalVal = entries.reduce((s, t) => { const u = appData.users.find(u => u.id === t.user_id); return s + hrs(t) * RR[u?.role || "tradesman"]; }, 0);

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...form, break_mins: Number(form.break_mins) };
      if (editEntry) { await db.patch("timesheets", editEntry.id, payload); setAppData(p => ({ ...p, timesheets: p.timesheets.map(t => t.id === editEntry.id ? { ...payload, id: t.id } : t) })); }
      else { const nt = { ...payload, id: "t" + uid() }; await db.post("timesheets", nt); setAppData(p => ({ ...p, timesheets: [...p.timesheets, nt] })); }
      setShowAdd(false); setEditEntry(null);
    } catch (e) { alert("Save failed: " + e.message); }
    setSaving(false);
  };

  const del = async id => { await db.del("timesheets", id); setAppData(p => ({ ...p, timesheets: p.timesheets.filter(t => t.id !== id) })); };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: -0.5 }}>Timesheets</h2>
        <Btn onClick={() => { setEditEntry(null); setForm({ user_id: currentUser.id, job_id: "", date: todayStr(), clock_in: "07:00", clock_out: "17:00", break_mins: 30, notes: "" }); setShowAdd(s => !s); }}>+ Add Entry</Btn>
      </div>
      {currentUser.role === "admin" && (
        <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
          <button onClick={() => setUserFilter("all")} style={{ background: userFilter === "all" ? T.accent : "transparent", border: `1px solid ${userFilter === "all" ? T.accent : T.border2}`, borderRadius: 99, padding: "5px 12px", color: userFilter === "all" ? "#fff" : T.muted, cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit" }}>All Staff</button>
          {appData.users.map(u => <button key={u.id} onClick={() => setUserFilter(u.id)} style={{ background: userFilter === u.id ? u.color : "transparent", border: `1px solid ${userFilter === u.id ? u.color : T.border2}`, borderRadius: 99, padding: "5px 12px", color: userFilter === u.id ? "#fff" : T.muted, cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit" }}>{u.name}</button>)}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        <Card style={{ padding: 14 }}><div style={{ color: T.muted, fontSize: 9, fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>TOTAL HOURS</div><div style={{ color: T.accent, fontSize: 22, fontWeight: 900 }}>{totalHrs.toFixed(1)}h</div></Card>
        <Card style={{ padding: 14 }}><div style={{ color: T.muted, fontSize: 9, fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>LABOUR VALUE</div><div style={{ color: T.green, fontSize: 22, fontWeight: 900 }}>{fmt(totalVal)}</div></Card>
      </div>
      {showAdd && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>{editEntry ? "Edit Entry" : "New Entry"}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Inp label="Staff Member" value={form.user_id} onChange={fset("user_id")} options={appData.users.map(u => ({ value: u.id, label: u.name }))} disabled={currentUser.role !== "admin" && !editEntry} />
            <Inp label="Date" value={form.date} onChange={fset("date")} type="date" />
            <Inp label="Clock In" value={form.clock_in} onChange={fset("clock_in")} type="time" />
            <Inp label="Clock Out" value={form.clock_out} onChange={fset("clock_out")} type="time" />
            <Inp label="Break (mins)" value={form.break_mins} onChange={fset("break_mins")} type="number" />
            <Inp label="Linked Job" value={form.job_id} onChange={fset("job_id")} options={[{ value: "", label: "No job" }, ...appData.jobs.map(j => ({ value: j.id, label: j.title }))]} />
          </div>
          <Inp label="Notes" value={form.notes} onChange={fset("notes")} placeholder="What was worked on?" />
          <div style={{ display: "flex", gap: 10 }}>
            <Btn onClick={save} disabled={saving} style={{ flex: 1 }}>{saving ? "Saving..." : editEntry ? "Save Changes" : "Add Entry"}</Btn>
            <Btn variant="ghost" onClick={() => { setShowAdd(false); setEditEntry(null); }}>Cancel</Btn>
          </div>
        </Card>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {entries.map(t => {
          const user = appData.users.find(u => u.id === t.user_id);
          const job = appData.jobs.find(j => j.id === t.job_id);
          const h = hrs(t);
          const rate = RR[user?.role || "tradesman"];
          return (
            <Card key={t.id}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {user && <Av name={user.name} size={36} color={user.color} />}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{user?.name} <span style={{ color: T.muted, fontWeight: 400, fontSize: 12 }}>· {fmtDate(t.date)}</span></div>
                  <div style={{ color: T.muted, fontSize: 12, marginTop: 2 }}>{t.clock_in} → {t.clock_out} · Break {t.break_mins}min · <strong style={{ color: T.accent }}>{h.toFixed(1)}hrs</strong>{job ? ` · ${job.title}` : ""}</div>
                  {t.notes && <div style={{ color: T.dim, fontSize: 11, marginTop: 2 }}>{t.notes}</div>}
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ color: T.accent, fontWeight: 800, fontSize: 15 }}>{fmt(h * rate)}</div>
                  <div style={{ color: T.muted, fontSize: 10 }}>{fmt(rate)}/hr</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <button onClick={() => { setEditEntry(t); setForm({ ...t }); setShowAdd(true); }} style={{ background: "none", border: `1px solid ${T.border2}`, borderRadius: 6, padding: "3px 8px", color: T.muted, cursor: "pointer", fontSize: 11, fontFamily: "inherit" }}>Edit</button>
                  <button onClick={() => del(t.id)} style={{ background: "none", border: "none", color: T.red, cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>✕</button>
                </div>
              </div>
            </Card>
          );
        })}
        {entries.length === 0 && <div style={{ textAlign: "center", color: T.muted, padding: "40px 0" }}>No timesheet entries</div>}
      </div>
    </div>
  );
}

// ─── Inventory ────────────────────────────────────────────────────────────────
function InventoryView({ appData, setAppData, currentUser }) {
  const [modal, setModal] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const f = k => v => setForm(p => ({ ...p, [k]: v }));
  const canEdit = ["admin", "inventory-manager"].includes(currentUser.role);
  const lowStock = appData.inventory.filter(i => i.warehouse_qty <= i.reorder_at);

  const open = item => { setEdit(item || null); setForm(item || { name: "", sku: "", unit: "ea", warehouse_qty: 0, reorder_at: 10, cost: 0, markup: 0, supplier_id: appData.suppliers[0]?.id || "", category: "" }); setModal(true); };
  const save = async () => {
    if (!form.name) return; setSaving(true);
    try {
      const payload = { ...form, warehouse_qty: Number(form.warehouse_qty), reorder_at: Number(form.reorder_at), cost: Number(form.cost), markup: Number(form.markup) };
      if (!edit) { const ni = { ...payload, id: "inv" + uid() }; await db.post("inventory", ni); setAppData(p => ({ ...p, inventory: [...p.inventory, ni] })); }
      else { await db.patch("inventory", edit.id, payload); setAppData(p => ({ ...p, inventory: p.inventory.map(i => i.id === edit.id ? { ...payload, id: i.id } : i) })); }
      setModal(false);
    } catch (e) { alert("Save failed: " + e.message); }
    setSaving(false);
  };
  const del = async () => { await db.del("inventory", edit.id); setAppData(p => ({ ...p, inventory: p.inventory.filter(i => i.id !== edit.id) })); setModal(false); };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: -0.5 }}>Inventory</h2>
        {canEdit && <Btn onClick={() => open(null)}>+ Add Item</Btn>}
      </div>
      {lowStock.length > 0 && (
        <div style={{ background: "rgba(251,191,36,0.08)", border: `1px solid ${T.yellow}`, borderRadius: 12, padding: "12px 16px", marginBottom: 16 }}>
          <div style={{ color: T.yellow, fontWeight: 700, fontSize: 13, marginBottom: 6 }}>⚠ Reorder Alert — {lowStock.length} item{lowStock.length !== 1 ? "s" : ""} low</div>
          {lowStock.map(i => <div key={i.id} style={{ color: T.muted, fontSize: 12 }}>{i.name} — {i.warehouse_qty} {i.unit} remaining</div>)}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {appData.inventory.map(item => {
          const low = item.warehouse_qty <= item.reorder_at;
          const sell = Number(item.cost) * (1 + Number(item.markup) / 100);
          return (
            <Card key={item.id} onClick={canEdit ? () => open(item) : undefined}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{item.name} <span style={{ color: T.dim, fontSize: 11 }}>#{item.sku}</span></div>
                  <div style={{ color: T.muted, fontSize: 12 }}>{item.category} · Cost {fmt(item.cost)} · Sell {fmt(sell)} · Markup {item.markup}%</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ color: low ? T.red : T.green, fontWeight: 800, fontSize: 18 }}>{item.warehouse_qty}</div>
                  <div style={{ color: T.muted, fontSize: 11 }}>{item.unit}</div>
                  {low && <div style={{ color: T.yellow, fontSize: 10, fontWeight: 700 }}>REORDER</div>}
                </div>
              </div>
            </Card>
          );
        })}
        {appData.inventory.length === 0 && <div style={{ textAlign: "center", color: T.muted, padding: "40px 0" }}>No inventory items yet — add your first item above</div>}
      </div>
      {modal && (
        <Modal title={edit ? "Edit Item" : "Add Item"} onClose={() => setModal(false)}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Inp label="Item Name" value={form.name} onChange={f("name")} required />
            <Inp label="SKU / Part No." value={form.sku} onChange={f("sku")} />
            <Inp label="Category" value={form.category} onChange={f("category")} placeholder="e.g. Cable, Switchgear" />
            <Inp label="Unit" value={form.unit} onChange={f("unit")} placeholder="ea, m, roll" />
            <Inp label="Warehouse Qty" value={form.warehouse_qty} onChange={f("warehouse_qty")} type="number" />
            <Inp label="Reorder At" value={form.reorder_at} onChange={f("reorder_at")} type="number" />
            <Inp label="Cost Price ($)" value={form.cost} onChange={f("cost")} type="number" />
            <Inp label="Markup (%)" value={form.markup} onChange={f("markup")} type="number" />
          </div>
          <div style={{ color: T.muted, fontSize: 12, marginBottom: 14 }}>Sell price: {fmt(Number(form.cost || 0) * (1 + Number(form.markup || 0) / 100))} per {form.unit || "ea"}</div>
          <Divider />
          <div style={{ display: "flex", gap: 10 }}>
            <Btn onClick={save} disabled={saving} style={{ flex: 1 }}>{saving ? "Saving..." : edit ? "Save Changes" : "Add Item"}</Btn>
            {edit && <Btn onClick={del} variant="danger">Remove</Btn>}
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Reports ──────────────────────────────────────────────────────────────────
function ReportsView({ appData }) {
  const [divF, setDivF] = useState("all");
  const [catF, setCatF] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const jobs = appData.jobs.filter(j => (divF === "all" || j.division_id === divF) && (catF === "all" || j.category_id === catF) && (!dateFrom || j.start_date >= dateFrom) && (!dateTo || j.start_date <= dateTo));
  const quotes = appData.quotes?.filter(q => (divF === "all" || q.division_id === divF) && (!dateFrom || q.created_date >= dateFrom) && (!dateTo || q.created_date <= dateTo)) || [];

  const revenue = jobs.reduce((s, j) => s + (j.value || 0), 0);
  const cost = jobs.reduce((s, j) => s + (j.cost || 0), 0);
  const profit = revenue - cost;
  const margin = revenue > 0 ? (profit / revenue * 100).toFixed(1) : 0;
  const won = quotes.filter(q => q.status === "approved").length;
  const lost = quotes.filter(q => ["lost", "expired"].includes(q.status)).length;
  const winRate = (won + lost) > 0 ? (won / (won + lost) * 100).toFixed(0) : 0;
  const cats = appData.categories.filter(c => divF === "all" || c.division_id === divF);

  return (
    <div>
      <h2 style={{ margin: "0 0 22px", fontSize: 22, fontWeight: 900, letterSpacing: -0.5 }}>Reports</h2>
      <Card style={{ marginBottom: 20, padding: 16 }}>
        <SectionHead>Filters</SectionHead>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
          <div>
            <label style={{ display: "block", color: T.muted, fontSize: 11, marginBottom: 5, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase" }}>Division</label>
            <select value={divF} onChange={e => { setDivF(e.target.value); setCatF("all"); }} style={{ width: "100%", background: "#070707", border: `1px solid ${T.border2}`, borderRadius: 8, padding: "8px 12px", color: T.text, fontSize: 13, outline: "none", fontFamily: "inherit" }}>
              <option value="all">All Divisions</option>
              {appData.divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: "block", color: T.muted, fontSize: 11, marginBottom: 5, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase" }}>Category</label>
            <select value={catF} onChange={e => setCatF(e.target.value)} style={{ width: "100%", background: "#070707", border: `1px solid ${T.border2}`, borderRadius: 8, padding: "8px 12px", color: T.text, fontSize: 13, outline: "none", fontFamily: "inherit" }}>
              <option value="all">All Categories</option>
              {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <Inp label="Date From" value={dateFrom} onChange={setDateFrom} type="date" />
          <Inp label="Date To" value={dateTo} onChange={setDateTo} type="date" />
        </div>
      </Card>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        {[{ label: "REVENUE", val: fmt(revenue), color: T.accent, sub: `${jobs.length} jobs` }, { label: "GROSS PROFIT", val: fmt(profit), color: profit > 0 ? T.green : T.red, sub: `${margin}% margin` }, { label: "WIN RATE", val: `${winRate}%`, color: Number(winRate) > 60 ? T.green : T.yellow, sub: `${won} won · ${lost} lost` }, { label: "AVG JOB VALUE", val: fmt(jobs.length ? revenue / jobs.length : 0), color: T.blue, sub: `across ${jobs.length} jobs` }].map(s => (
          <Card key={s.label} style={{ padding: 16 }}>
            <div style={{ color: T.dim, fontSize: 9, fontWeight: 700, letterSpacing: 1.2, marginBottom: 6 }}>{s.label}</div>
            <div style={{ color: s.color, fontSize: 22, fontWeight: 900, letterSpacing: -0.5, marginBottom: 3 }}>{s.val}</div>
            <div style={{ color: T.muted, fontSize: 11 }}>{s.sub}</div>
          </Card>
        ))}
      </div>
      <SectionHead>Breakdown by Division</SectionHead>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {appData.divisions.map(div => {
          const divJobs = jobs.filter(j => j.division_id === div.id);
          const divRev = divJobs.reduce((s, j) => s + (j.value || 0), 0);
          const divCost = divJobs.reduce((s, j) => s + (j.cost || 0), 0);
          const divMargin = divRev > 0 ? ((divRev - divCost) / divRev * 100).toFixed(1) : 0;
          return (
            <Card key={div.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontWeight: 800, fontSize: 14 }}>{div.name}</div>
                <div style={{ color: T.accent, fontWeight: 800, fontSize: 15 }}>{fmt(divRev)}</div>
              </div>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {[["Jobs", divJobs.length, T.text], ["Cost", fmt(divCost), T.red], ["Profit", fmt(divRev - divCost), T.green], ["Margin", `${divMargin}%`, Number(divMargin) > 20 ? T.green : T.yellow]].map(([l, v, c]) => (
                  <span key={l} style={{ color: T.muted, fontSize: 12 }}>{l}: <strong style={{ color: c }}>{v}</strong></span>
                ))}
              </div>
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${T.border}` }}>
                {appData.categories.filter(c => c.division_id === div.id).map(cat => {
                  const catJobs = divJobs.filter(j => j.category_id === cat.id);
                  if (!catJobs.length) return null;
                  return <div key={cat.id} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: 12 }}><span style={{ color: T.muted }}>{cat.name}</span><span style={{ color: T.text, fontWeight: 600 }}>{fmt(catJobs.reduce((s, j) => s + (j.value || 0), 0))} <span style={{ color: T.dim }}>({catJobs.length})</span></span></div>;
                })}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─── Staff View ───────────────────────────────────────────────────────────────
function StaffView({ appData, setAppData, currentUser }) {
  const [modal, setModal] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const f = k => v => setForm(p => ({ ...p, [k]: v }));
  const open = u => { setEdit(u || null); setForm(u || { name: "", role: "tradesman", pin: "", phone: "", email: "", color: "#2980b9" }); setModal(true); };
  const save = async () => {
    if (!form.name || !form.pin) return; setSaving(true);
    try {
      if (!edit) { const nu = { ...form, id: "u" + uid() }; await db.post("users", nu); setAppData(p => ({ ...p, users: [...p.users, nu] })); }
      else { await db.patch("users", edit.id, form); setAppData(p => ({ ...p, users: p.users.map(u => u.id === edit.id ? { ...form, id: u.id } : u) })); }
      setModal(false);
    } catch (e) { alert("Save failed: " + e.message); }
    setSaving(false);
  };
  const del = async () => { await db.del("users", edit.id); setAppData(p => ({ ...p, users: p.users.filter(u => u.id !== edit.id) })); setModal(false); };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: -0.5 }}>Staff</h2>
        {currentUser.role === "admin" && <Btn onClick={() => open(null)}>+ Add Staff</Btn>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {appData.users.map(u => {
          const active = appData.jobs.filter(j => (j.assigned_to || []).includes(u.id) && j.status !== "completed");
          const hours = appData.timesheets.filter(t => t.user_id === u.id).reduce((s, t) => { const [ih, im] = (t.clock_in || "0:0").split(":").map(Number), [oh, om] = (t.clock_out || "0:0").split(":").map(Number); return s + Math.max(0, ((oh * 60 + om) - (ih * 60 + im) - Number(t.break_mins || 0)) / 60); }, 0);
          return (
            <Card key={u.id} onClick={() => currentUser.role === "admin" && open(u)}>
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <Av name={u.name} size={46} color={u.color} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>{u.name}</div>
                  <div style={{ color: T.muted, fontSize: 13, marginTop: 2 }}>{RL[u.role]} · {u.phone || "—"}</div>
                  <div style={{ color: T.dim, fontSize: 12, marginTop: 2 }}>{active.length} active · {hours.toFixed(1)}hrs logged</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: T.accent, fontWeight: 800, fontSize: 15 }}>{RR[u.role] ? fmt(RR[u.role]) + "/hr" : "—"}</div>
                  <div style={{ fontSize: 11, marginTop: 3, color: u.id === currentUser.id ? T.green : T.dim }}>{u.id === currentUser.id ? "● You" : "● Active"}</div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      {modal && (
        <Modal title={edit ? "Edit Staff Member" : "Add Staff Member"} onClose={() => setModal(false)}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Inp label="Full Name" value={form.name} onChange={f("name")} required />
            <Inp label="Role" value={form.role} onChange={f("role")} options={Object.entries(RL).map(([v, label]) => ({ value: v, label }))} />
            <Inp label="PIN (4 digits)" value={form.pin} onChange={f("pin")} type="password" placeholder="e.g. 1234" />
            <Inp label="Phone" value={form.phone} onChange={f("phone")} />
          </div>
          <Inp label="Email" value={form.email} onChange={f("email")} type="email" />
          <Divider />
          <div style={{ display: "flex", gap: 10 }}>
            <Btn onClick={save} disabled={saving} style={{ flex: 1 }}>{saving ? "Saving..." : edit ? "Save Changes" : "Add Staff Member"}</Btn>
            {edit && edit.id !== "u1" && <Btn onClick={del} variant="danger">Remove</Btn>}
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Settings ─────────────────────────────────────────────────────────────────
function SettingsView({ appData, setAppData }) {
  const [divForm, setDivForm] = useState("");
  const [catForms, setCatForms] = useState({});

  const addDiv = async () => {
    if (!divForm.trim()) return;
    const nd = { id: "d" + uid(), name: divForm.trim() };
    await db.post("divisions", nd);
    setAppData(p => ({ ...p, divisions: [...p.divisions, nd] }));
    setDivForm("");
  };

  const delDiv = async id => {
    await db.del("divisions", id);
    setAppData(p => ({ ...p, divisions: p.divisions.filter(d => d.id !== id) }));
  };

  const addCat = async divId => {
    const n = catForms[divId]?.trim(); if (!n) return;
    const nc = { id: "d" + uid() + "c", division_id: divId, name: n };
    await db.post("categories", nc);
    setAppData(p => ({ ...p, categories: [...p.categories, nc] }));
    setCatForms(p => ({ ...p, [divId]: "" }));
  };

  const delCat = async id => {
    await db.del("categories", id);
    setAppData(p => ({ ...p, categories: p.categories.filter(c => c.id !== id) }));
  };

  return (
    <div>
      <h2 style={{ margin: "0 0 22px", fontSize: 22, fontWeight: 900, letterSpacing: -0.5 }}>Settings</h2>
      <Card style={{ marginBottom: 16 }}>
        <SectionHead>Divisions & Categories</SectionHead>
        <div style={{ color: T.muted, fontSize: 12, marginBottom: 16 }}>Add or remove divisions and categories. Changes apply to jobs, quotes, and reports immediately.</div>
        {appData.divisions.map(div => (
          <div key={div.id} style={{ marginBottom: 16, background: "#070707", border: `1px solid ${T.border2}`, borderRadius: 10, padding: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ fontWeight: 800, fontSize: 14, flex: 1 }}>{div.name}</div>
              <button onClick={() => delDiv(div.id)} style={{ background: "none", border: "none", color: T.red, cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>Remove Division</button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
              {appData.categories.filter(c => c.division_id === div.id).map(cat => (
                <div key={cat.id} style={{ display: "flex", alignItems: "center", gap: 4, background: T.surf, border: `1px solid ${T.border2}`, borderRadius: 20, padding: "3px 10px" }}>
                  <span style={{ fontSize: 12, color: T.text }}>{cat.name}</span>
                  <button onClick={() => delCat(cat.id)} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: 12, padding: "0 0 0 4px", fontFamily: "inherit" }}>✕</button>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <input value={catForms[div.id] || ""} onChange={e => setCatForms(p => ({ ...p, [div.id]: e.target.value }))} onKeyDown={e => e.key === "Enter" && addCat(div.id)} placeholder="New category..." style={{ flex: 1, background: T.surf, border: `1px solid ${T.border2}`, borderRadius: 8, padding: "6px 10px", color: T.text, fontSize: 12, outline: "none", fontFamily: "inherit" }} />
              <button onClick={() => addCat(div.id)} style={{ background: T.accent, border: "none", borderRadius: 8, padding: "6px 14px", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit" }}>Add</button>
            </div>
          </div>
        ))}
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          <input value={divForm} onChange={e => setDivForm(e.target.value)} onKeyDown={e => e.key === "Enter" && addDiv()} placeholder="New division name..." style={{ flex: 1, background: "#070707", border: `1px solid ${T.border2}`, borderRadius: 8, padding: "8px 12px", color: T.text, fontSize: 13, outline: "none", fontFamily: "inherit" }} />
          <Btn onClick={addDiv}>Add Division</Btn>
        </div>
      </Card>
      <Card>
        <SectionHead>Business Details</SectionHead>
        {Object.entries({ Name: BUSINESS.name, ABN: BUSINESS.abn, Address: BUSINESS.address + " " + BUSINESS.suburb, Phone: BUSINESS.phone, Email: BUSINESS.email, Licences: BUSINESS.licences, Bank: `BSB ${BUSINESS.bsb} · Account ${BUSINESS.account}` }).map(([k, v]) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${T.border}`, fontSize: 13 }}>
            <span style={{ color: T.muted, fontWeight: 600 }}>{k}</span>
            <span style={{ color: T.text, textAlign: "right", maxWidth: "60%" }}>{v}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ─── Nav config ───────────────────────────────────────────────────────────────
const NAV_ADMIN = [
  { id: "dashboard", icon: "⚡", label: "Home" },
  { id: "schedule",  icon: "📅", label: "Schedule" },
  { id: "jobs",      icon: "🔧", label: "Jobs" },
  { id: "clients",   icon: "👤", label: "Clients" },
  { id: "invoices",  icon: "💰", label: "Invoices" },
  { id: "timesheets",icon: "⏱",  label: "Timesheets" },
  { id: "inventory", icon: "📦", label: "Inventory" },
  { id: "reports",   icon: "📊", label: "Reports" },
  { id: "staff",     icon: "👷", label: "Staff" },
  { id: "forms",     icon: "✅", label: "Forms" },
  { id: "settings",  icon: "⚙️", label: "Settings" },
];
const NAV_FIELD = [
  { id: "dashboard",  icon: "⚡", label: "Home" },
  { id: "schedule",   icon: "📅", label: "Schedule" },
  { id: "jobs",       icon: "🔧", label: "Jobs" },
  { id: "forms",      icon: "✅", label: "Forms" },
  { id: "timesheets", icon: "⏱",  label: "Timesheets" },
];
const NAV_INV = [
  { id: "dashboard", icon: "⚡", label: "Home" },
  { id: "inventory", icon: "📦", label: "Inventory" },
];

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [loading, setLoading] = useState(true);
  const [loadMsg, setLoadMsg] = useState("Connecting to cloud...");
  const [currentUser, setCurrentUser] = useState(null);
  const [nav, setNav] = useState("schedule");
  const [appData, setAppData] = useState({
    users: [], clients: [], divisions: [], categories: [],
    jobs: [], quotes: [], invoices: [], forms: [],
    timesheets: [], inventory: [], vanStock: [], suppliers: [],
    nextInvoiceNo: 1602,
  });

  // Load all data from Supabase on mount
  useEffect(() => {
    const init = async () => {
      try {
        setLoadMsg("Loading staff...");
        let users = await db.get("users");

        // Seed if empty
        if (!users.length) {
          setLoadMsg("First run — seeding data...");
          await Promise.all(SEED_USERS.map(u => db.upsert("users", u)));
          await Promise.all(SEED_DIVISIONS.map(d => db.upsert("divisions", d)));
          await Promise.all(SEED_CATEGORIES.map(c => db.upsert("categories", c)));
          await Promise.all(SEED_CLIENTS.map(c => db.upsert("clients", c)));
          await Promise.all(SEED_SUPPLIERS.map(s => db.upsert("suppliers", s)));
          await Promise.all(SEED_JOBS.map(j => db.upsert("jobs", { ...j, assigned_to: JSON.stringify(j.assigned_to), takeoff: JSON.stringify([]), extra_lines: JSON.stringify([]) })));
          await Promise.all(SEED_INVENTORY.map(i => db.upsert("inventory", i)));
          users = await db.get("users");
        }

        setLoadMsg("Loading all data...");
        const [clients, divisions, categories, jobs, quotes, invoices, forms, timesheets, inventory, suppliers] = await Promise.all([
          db.get("clients"), db.get("divisions"), db.get("categories"),
          db.get("jobs"), db.get("quotes"), db.get("invoices"),
          db.get("forms"), db.get("timesheets"), db.get("inventory"), db.get("suppliers"),
        ]);

        // Parse JSON fields
        const parseJob = j => ({ ...j, assigned_to: typeof j.assigned_to === "string" ? JSON.parse(j.assigned_to || "[]") : (j.assigned_to || []), takeoff: typeof j.takeoff === "string" ? JSON.parse(j.takeoff || "[]") : (j.takeoff || []), extra_lines: typeof j.extra_lines === "string" ? JSON.parse(j.extra_lines || "[]") : (j.extra_lines || []) });

        setAppData({ users, clients, divisions, categories, jobs: jobs.map(parseJob), quotes: quotes || [], invoices: invoices || [], forms: forms || [], timesheets: timesheets || [], inventory: inventory || [], suppliers: suppliers || [], vanStock: [], nextInvoiceNo: 1602 });
        setLoading(false);
      } catch (e) {
        setLoadMsg("Connection error — " + e.message);
        setTimeout(() => setLoading(false), 3000);
      }
    };
    init();
  }, []);

  const logout = () => { setCurrentUser(null); setNav("schedule"); };

  if (loading) return <LoadingScreen message={loadMsg} />;
  if (!currentUser) return <LoginScreen users={appData.users} onLogin={u => { setCurrentUser(u); setNav("dashboard"); }} />;

  const navItems = currentUser.role === "admin" ? NAV_ADMIN : currentUser.role === "inventory-manager" ? NAV_INV : NAV_FIELD;

  const VIEWS = {
    dashboard: DashboardView, schedule: ScheduleView, jobs: JobsView,
    clients: ClientsView, invoices: InvoicesView, forms: FormsView,
    timesheets: TimesheetsView, inventory: InventoryView, reports: ReportsView,
    staff: StaffView, settings: SettingsView,
  };
  const View = VIEWS[nav] || DashboardView;

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "'Barlow','Helvetica Neue',sans-serif", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ background: T.surf, borderBottom: `1px solid ${T.border}`, padding: "0 18px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ background: T.surf2, border: `1px solid ${T.border}`, borderRadius: 12, padding: "6px 8px", display: "flex", alignItems: "center", justifyContent: "center" }}><LogoMark size={28} /></div>
          <div>
            <div style={{ fontWeight: 900, fontSize: 14, letterSpacing: -0.5, lineHeight: 1 }}>tri-core</div>
            <div style={{ fontSize: 9, color: T.muted, fontWeight: 600, letterSpacing: 0.8 }}>ELECTRICAL SOLUTIONS</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#0a0a0a", border: `1px solid ${T.border}`, borderRadius: 20, padding: "4px 12px 4px 6px" }}>
            <Av name={currentUser.name} size={24} color={currentUser.color} />
            <span style={{ color: "#ccc", fontSize: 12, fontWeight: 700 }}>{currentUser.name}</span>
          </div>
          <button onClick={logout} style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: 9, padding: "5px 12px", color: T.muted, cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit" }} onMouseEnter={e => { e.currentTarget.style.borderColor = T.red; e.currentTarget.style.color = T.red; }} onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.muted; }}>Lock</button>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1 }}>
        {/* Sidebar */}
        <div className="sidebar" style={{ width: 196, background: T.surf, borderRight: `1px solid ${T.border}`, padding: "12px 0", display: "flex", flexDirection: "column", position: "sticky", top: 56, height: "calc(100vh - 56px)", overflowY: "auto" }}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => setNav(item.id)} style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 18px", background: nav === item.id ? "rgba(26,111,175,0.12)" : "none", border: "none", borderLeft: nav === item.id ? `3px solid ${T.accent}` : "3px solid transparent", color: nav === item.id ? T.accent : T.muted, cursor: "pointer", fontSize: 13, fontWeight: nav === item.id ? 800 : 500, width: "100%", textAlign: "left", transition: "all 0.12s", fontFamily: "inherit" }}>
              <span style={{ fontSize: 16 }}>{item.icon}</span>{item.label}
            </button>
          ))}
          <div style={{ marginTop: "auto", padding: "14px 18px", borderTop: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 9, color: T.dim, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>CHARGE RATES</div>
            <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.9 }}>Tradesman <strong style={{ color: "#777" }}>$150/hr</strong><br />Assistant <strong style={{ color: "#777" }}>$110/hr</strong><br />Apprentice <strong style={{ color: "#777" }}>$80/hr</strong></div>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: "24px 20px 100px", maxWidth: 900, width: "100%" }}>
          <View appData={appData} setAppData={setAppData} currentUser={currentUser} setNav={setNav} />
        </div>
      </div>

      {/* Mobile bottom nav */}
      <div className="bottomnav" style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: T.surf, borderTop: `1px solid ${T.border}`, display: "flex", zIndex: 50, padding: "6px 0 env(safe-area-inset-bottom,8px)" }}>
        {navItems.slice(0, 5).map(item => (
          <button key={item.id} onClick={() => setNav(item.id)} style={{ flex: 1, background: "none", border: "none", color: nav === item.id ? T.accent : T.muted, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "4px 0", fontFamily: "inherit" }}>
            <span style={{ fontSize: 18 }}>{item.icon}</span>
            <span style={{ fontSize: 9, fontWeight: 700 }}>{item.label}</span>
          </button>
        ))}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-track{background:${T.bg};}::-webkit-scrollbar-thumb{background:${T.border2};border-radius:4px;}
        input[type=checkbox]{accent-color:${T.accent};}
        select option{background:#0d0d0d;color:${T.text};}
        @media(min-width:768px){.bottomnav{display:none!important;}}
        @media(max-width:767px){.sidebar{display:none!important;}}
        @media print{.sidebar,.bottomnav,button{display:none!important;}}
      `}</style>
    </div>
  );
}
