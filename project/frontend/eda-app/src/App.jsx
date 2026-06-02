import { useState, useCallback, useRef } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, CartesianGrid, Cell,
  LineChart, Line
} from "recharts";

// ─── Palette ────────────────────────────────────────────────────────────────
const C = {
  bg: "#0a0a0f",
  surface: "#12121a",
  border: "#1e1e2e",
  accent: "#7c6aff",
  accentSoft: "#7c6aff22",
  green: "#22d3a0",
  red: "#ff5e7e",
  yellow: "#f5c542",
  text: "#e8e6f0",
  muted: "#6e6a88",
};

const COLORS = ["#7c6aff","#22d3a0","#ff5e7e","#f5c542","#4fc3f7","#f48fb1","#aed581","#ff8a65"];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (v, d = 3) => (v == null ? "—" : typeof v === "number" ? v.toFixed(d) : v);
// const pct = v => `${v}%`;

// ─── Small components ────────────────────────────────────────────────────────
function Badge({ children, color = C.accent }) {
  return (
    <span style={{
      background: color + "22", color, border: `1px solid ${color}55`,
      borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 600,
      letterSpacing: ".04em", textTransform: "uppercase",
    }}>{children}</span>
  );
}

function StatCard({ label, value, sub, color = C.accent }) {
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10,
      padding: "18px 22px", flex: 1, minWidth: 130,
    }}>
      <div style={{ color: C.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>{label}</div>
      <div style={{ color, fontSize: 26, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{value}</div>
      {sub && <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "32px 0 16px" }}>
      <div style={{ width: 3, height: 20, background: C.accent, borderRadius: 2 }} />
      <h2 style={{ color: C.text, fontSize: 15, fontWeight: 700, margin: 0, letterSpacing: ".04em", textTransform: "uppercase" }}>{children}</h2>
    </div>
  );
}

function MiniBar({ value, max, color = C.accent }) {
  return (
    <div style={{ background: C.border, borderRadius: 3, height: 6, flex: 1 }}>
      <div style={{ width: `${Math.min(100, (value / max) * 100)}%`, background: color, height: "100%", borderRadius: 3, transition: "width .4s" }} />
    </div>
  );
}

// ─── Missing Values ──────────────────────────────────────────────────────────
function MissingTable({ data }) {
  const maxPct = Math.max(...data.map(d => d.pct), 1);
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: C.border }}>
            {["Column", "Type", "Missing", "%", "Bar"].map(h => (
              <th key={h} style={{ padding: "10px 16px", textAlign: "left", color: C.muted, fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: ".06em" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={row.column} style={{ borderTop: `1px solid ${C.border}`, background: i % 2 === 0 ? "transparent" : "#ffffff04" }}>
              <td style={{ padding: "10px 16px", color: C.text, fontFamily: "monospace" }}>{row.column}</td>
              <td style={{ padding: "10px 16px" }}><Badge color={row.dtype.includes("int") || row.dtype.includes("float") ? C.accent : C.green}>{row.dtype}</Badge></td>
              <td style={{ padding: "10px 16px", color: row.missing > 0 ? C.red : C.green, fontFamily: "monospace" }}>{row.missing}</td>
              <td style={{ padding: "10px 16px", color: row.pct > 20 ? C.red : row.pct > 5 ? C.yellow : C.muted, fontFamily: "monospace" }}>{row.pct}%</td>
              <td style={{ padding: "10px 16px", width: 120 }}><MiniBar value={row.pct} max={maxPct} color={row.pct > 20 ? C.red : row.pct > 5 ? C.yellow : C.green} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Numeric Stats Table ──────────────────────────────────────────────────────
function NumericTable({ data, onSelect, selected }) {
  const cols = ["column","count","mean","median","std","min","max","skewness","outliers"];
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ background: C.border }}>
            {cols.map(h => (
              <th key={h} style={{ padding: "10px 16px", textAlign: "left", color: C.muted, fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", whiteSpace: "nowrap" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={row.column}
              onClick={() => onSelect(row)}
              style={{
                borderTop: `1px solid ${C.border}`,
                background: selected?.column === row.column ? C.accentSoft : i % 2 === 0 ? "transparent" : "#ffffff04",
                cursor: "pointer", transition: "background .15s",
              }}
            >
              <td style={{ padding: "10px 16px", color: C.accent, fontFamily: "monospace", fontWeight: 600 }}>{row.column}</td>
              {["count","mean","median","std","min","max","skewness"].map(k => (
                <td key={k} style={{ padding: "10px 16px", color: C.text, fontFamily: "monospace" }}>{fmt(row[k])}</td>
              ))}
              <td style={{ padding: "10px 16px", color: row.outliers > 0 ? C.yellow : C.muted, fontFamily: "monospace" }}>{row.outliers}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Histogram ───────────────────────────────────────────────────────────────
function Histogram({ stat }) {
  const data = stat.histogram.counts.map((count, i) => ({
    name: fmt(stat.histogram.bins[i], 2),
    count,
  }));
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
      <div style={{ color: C.muted, fontSize: 11, marginBottom: 12, textTransform: "uppercase", letterSpacing: ".06em" }}>Distribution — {stat.column}</div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <XAxis dataKey="name" tick={{ fill: C.muted, fontSize: 9 }} />
          <YAxis tick={{ fill: C.muted, fontSize: 9 }} />
          <Tooltip contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 12 }} />
          <Bar dataKey="count" radius={[3, 3, 0, 0]}>
            {data.map((_, i) => <Cell key={i} fill={C.accent} fillOpacity={0.7 + (i / data.length) * 0.3} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Categorical Bar ─────────────────────────────────────────────────────────
function CatBar({ stat }) {
  const data = stat.bar.labels.map((l, i) => ({ name: String(l), value: stat.bar.values[i] }));
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ color: C.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: ".06em" }}>{stat.column}</div>
        <div style={{ display: "flex", gap: 8 }}>
          <Badge color={C.green}>{stat.unique} unique</Badge>
          <Badge color={C.accent}>{stat.count} total</Badge>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
          <XAxis type="number" tick={{ fill: C.muted, fontSize: 9 }} />
          <YAxis type="category" dataKey="name" tick={{ fill: C.text, fontSize: 10 }} width={100} />
          <Tooltip contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 12 }} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Correlation Heatmap ─────────────────────────────────────────────────────
function CorrelationHeatmap({ corr }) {
  const { columns, matrix } = corr;
  const n = columns.length;
  const cellSize = Math.min(56, Math.floor(560 / n));

  function color(v) {
    if (v == null) return C.border;
    const abs = Math.abs(v);
    if (v > 0) return `rgba(124,106,255,${abs})`;
    return `rgba(255,94,126,${abs})`;
  }

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, overflowX: "auto" }}>
      <div style={{ color: C.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 16 }}>Correlation Matrix</div>
      <div style={{ display: "inline-block" }}>
        {/* Header row */}
        <div style={{ display: "flex", marginLeft: cellSize * 2 }}>
          {columns.map(c => (
            <div key={c} style={{ width: cellSize, textAlign: "center", color: C.muted, fontSize: 9, transform: "rotate(-45deg)", transformOrigin: "50% 90%", height: 50, overflow: "hidden", padding: "2px 0" }}>{c}</div>
          ))}
        </div>
        {matrix.map((row, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center" }}>
            <div style={{ width: cellSize * 2, color: C.muted, fontSize: 9, textAlign: "right", paddingRight: 8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{columns[i]}</div>
            {row.map((v, j) => (
              <div
                key={j}
                title={`${columns[i]} × ${columns[j]}: ${fmt(v, 3)}`}
                style={{
                  width: cellSize, height: cellSize, background: color(v),
                  border: `1px solid ${C.bg}`, display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 8, color: Math.abs(v || 0) > 0.4 ? "#fff" : C.muted, fontFamily: "monospace",
                  transition: "opacity .2s", cursor: "default",
                }}
              >
                {v != null ? v.toFixed(2) : ""}
              </div>
            ))}
          </div>
        ))}
        {/* Legend */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, marginLeft: cellSize * 2 }}>
          <div style={{ width: 40, height: 8, background: "linear-gradient(to right, rgba(255,94,126,1), rgba(255,94,126,0))", borderRadius: 4 }} />
          <span style={{ color: C.muted, fontSize: 10 }}>-1</span>
          <div style={{ width: 40, height: 8, background: C.border, borderRadius: 4 }} />
          <span style={{ color: C.muted, fontSize: 10 }}>0</span>
          <div style={{ width: 40, height: 8, background: "linear-gradient(to right, rgba(124,106,255,0), rgba(124,106,255,1))", borderRadius: 4 }} />
          <span style={{ color: C.muted, fontSize: 10 }}>+1</span>
        </div>
      </div>
    </div>
  );
}

// ─── Scatter Plot ─────────────────────────────────────────────────────────────
function ScatterPlot({ pair }) {
  const data = pair.x.map((x, i) => ({ x, y: pair.y[i] }));
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
      <div style={{ color: C.muted, fontSize: 11, marginBottom: 12, textTransform: "uppercase", letterSpacing: ".06em" }}>
        {pair.x_col} vs {pair.y_col}
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <ScatterChart margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
          <XAxis dataKey="x" type="number" name={pair.x_col} tick={{ fill: C.muted, fontSize: 9 }} />
          <YAxis dataKey="y" type="number" name={pair.y_col} tick={{ fill: C.muted, fontSize: 9 }} />
          <Tooltip cursor={{ strokeDasharray: "3 3" }} contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 11 }} />
          <Scatter data={data} fill={C.accent} fillOpacity={0.5} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Normality ───────────────────────────────────────────────────────────────
function NormalityTable({ data }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: C.border }}>
            {["Column", "Statistic", "p-value", "Normal?"].map(h => (
              <th key={h} style={{ padding: "10px 16px", textAlign: "left", color: C.muted, fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: ".06em" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={row.column} style={{ borderTop: `1px solid ${C.border}`, background: i % 2 === 0 ? "transparent" : "#ffffff04" }}>
              <td style={{ padding: "10px 16px", color: C.accent, fontFamily: "monospace" }}>{row.column}</td>
              <td style={{ padding: "10px 16px", color: C.text, fontFamily: "monospace" }}>{row.statistic}</td>
              <td style={{ padding: "10px 16px", color: C.text, fontFamily: "monospace" }}>{row.p_value}</td>
              <td style={{ padding: "10px 16px" }}>
                <Badge color={row.normal ? C.green : C.red}>{row.normal ? "Yes" : "No"}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Upload Zone ─────────────────────────────────────────────────────────────
function UploadZone({ onUpload, loading }) {
  const [drag, setDrag] = useState(false);
  const ref = useRef();

  const handle = useCallback(file => {
    if (!file) return;
    onUpload(file);
  }, [onUpload]);

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files[0]); }}
      onClick={() => ref.current.click()}
      style={{
        border: `2px dashed ${drag ? C.accent : C.border}`,
        borderRadius: 16, padding: "60px 40px", textAlign: "center",
        cursor: "pointer", transition: "all .2s",
        background: drag ? C.accentSoft : C.surface,
        maxWidth: 540, margin: "0 auto",
      }}
    >
      <input ref={ref} type="file" accept=".csv,.xlsx,.xls,.json,.parquet" style={{ display: "none" }}
        onChange={e => handle(e.target.files[0])} />
      <div style={{ fontSize: 40, marginBottom: 16 }}>{loading ? "⏳" : "📂"}</div>
      <div style={{ color: C.text, fontSize: 17, fontWeight: 600, marginBottom: 8 }}>
        {loading ? "Analyzing dataset…" : "Drop your dataset here"}
      </div>
      <div style={{ color: C.muted, fontSize: 13 }}>CSV · Excel · JSON · Parquet</div>
      {!loading && (
        <div style={{ marginTop: 20, background: C.accent, color: "#fff", display: "inline-block", padding: "8px 24px", borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
          Browse file
        </div>
      )}
    </div>
  );
}

// ─── Nav Tabs ────────────────────────────────────────────────────────────────
function NavTabs({ tabs, active, onChange }) {
  return (
    <div style={{ display: "flex", gap: 2, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 4, flexWrap: "wrap" }}>
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          style={{
            padding: "7px 16px", borderRadius: 7, border: "none", cursor: "pointer",
            background: active === t.id ? C.accent : "transparent",
            color: active === t.id ? "#fff" : C.muted,
            fontSize: 13, fontWeight: 600, transition: "all .15s",
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────
const API = "http://localhost:8000";
const TABS = [
  { id: "overview", label: "Overview" },
  { id: "missing", label: "Missing Values" },
  { id: "numeric", label: "Numeric Stats" },
  { id: "categorical", label: "Categorical" },
  { id: "correlation", label: "Correlation" },
  { id: "scatter", label: "Scatter Plots" },
  { id: "normality", label: "Normality" },
];

export default function App() {
  const [tab, setTab] = useState("overview");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedNumeric, setSelectedNumeric] = useState(null);

  const handleUpload = async (file) => {
    setLoading(true);
    setError(null);
    setData(null);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch(`${API}/upload`, { method: "POST", body: form });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Upload failed");
      }
      const json = await res.json();
      setData(json);
      setTab("overview");
      setSelectedNumeric(json.numeric_stats[0] || null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const ov = data?.overview;

  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: "'Inter', 'Segoe UI', sans-serif", color: C.text }}>
      {/* Header */}
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 28, height: 28, background: `linear-gradient(135deg, ${C.accent}, ${C.green})`, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>⚡</div>
          <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: "-.01em" }}>EDA Studio</span>
          {ov && <Badge color={C.green}>{ov.filename}</Badge>}
        </div>
        {data && (
          <button onClick={() => { setData(null); setError(null); }} style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 7, padding: "5px 14px", cursor: "pointer", fontSize: 12 }}>
            New Dataset
          </button>
        )}
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>

        {/* Error */}
        {error && (
          <div style={{ background: "#ff5e7e22", border: `1px solid ${C.red}44`, borderRadius: 10, padding: "14px 20px", marginBottom: 24, color: C.red, fontSize: 14 }}>
            ⚠️ {error}
          </div>
        )}

        {/* Upload */}
        {!data && !loading && (
          <div>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <h1 style={{ fontSize: 36, fontWeight: 800, margin: "0 0 10px", background: `linear-gradient(135deg, ${C.accent}, ${C.green})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Exploratory Data Analysis
              </h1>
              <p style={{ color: C.muted, fontSize: 15 }}>Upload any dataset and get instant insights — stats, distributions, correlations & more</p>
            </div>
            <UploadZone onUpload={handleUpload} loading={loading} />
          </div>
        )}

        {loading && (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔬</div>
            <div style={{ color: C.muted, fontSize: 16 }}>Running EDA analysis…</div>
          </div>
        )}

        {/* Results */}
        {data && (
          <>
            {/* Top stats */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
              <StatCard label="Rows" value={ov.rows.toLocaleString()} />
              <StatCard label="Columns" value={ov.cols} />
              <StatCard label="Numeric" value={ov.numeric_cols.length} color={C.accent} />
              <StatCard label="Categorical" value={ov.categorical_cols.length} color={C.green} />
              <StatCard label="Duplicates" value={ov.duplicated_rows} color={ov.duplicated_rows > 0 ? C.yellow : C.green} />
              <StatCard label="Memory" value={`${ov.memory_mb} MB`} color={C.muted} />
            </div>

            <NavTabs tabs={TABS} active={tab} onChange={setTab} />

            {/* ── OVERVIEW ── */}
            {tab === "overview" && (
              <>
                <SectionTitle>Column Summary</SectionTitle>
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: C.border }}>
                        {["Column", "Dtype", "Kind"].map(h => (
                          <th key={h} style={{ padding: "10px 16px", textAlign: "left", color: C.muted, fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: ".06em" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {ov.columns.map((col, i) => (
                        <tr key={col} style={{ borderTop: `1px solid ${C.border}`, background: i % 2 === 0 ? "transparent" : "#ffffff04" }}>
                          <td style={{ padding: "10px 16px", color: C.text, fontFamily: "monospace" }}>{col}</td>
                          <td style={{ padding: "10px 16px" }}>
                            <Badge color={ov.dtypes[col].includes("int") || ov.dtypes[col].includes("float") ? C.accent : ov.dtypes[col].includes("object") ? C.green : C.yellow}>
                              {ov.dtypes[col]}
                            </Badge>
                          </td>
                          <td style={{ padding: "10px 16px", color: C.muted, fontSize: 12 }}>
                            {ov.numeric_cols.includes(col) ? "Numeric" : ov.categorical_cols.includes(col) ? "Categorical" : "Datetime"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <SectionTitle>Data Preview (first 10 rows)</SectionTitle>
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflowX: "auto" }}>
                  <table style={{ borderCollapse: "collapse", fontSize: 12, minWidth: "100%" }}>
                    <thead>
                      <tr style={{ background: C.border }}>
                        {ov.columns.map(c => (
                          <th key={c} style={{ padding: "10px 14px", textAlign: "left", color: C.muted, fontWeight: 600, fontSize: 10, textTransform: "uppercase", whiteSpace: "nowrap" }}>{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {ov.preview.map((row, i) => (
                        <tr key={i} style={{ borderTop: `1px solid ${C.border}`, background: i % 2 === 0 ? "transparent" : "#ffffff04" }}>
                          {ov.columns.map(c => (
                            <td key={c} style={{ padding: "8px 14px", color: row[c] == null ? C.red : C.text, fontFamily: "monospace", whiteSpace: "nowrap" }}>
                              {row[c] == null ? "null" : String(row[c]).slice(0, 40)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* ── MISSING ── */}
            {tab === "missing" && (
              <>
                <SectionTitle>Missing Value Analysis</SectionTitle>
                <MissingTable data={data.missing} />
              </>
            )}

            {/* ── NUMERIC ── */}
            {tab === "numeric" && (
              <>
                <SectionTitle>Numeric Column Statistics</SectionTitle>
                <NumericTable data={data.numeric_stats} onSelect={setSelectedNumeric} selected={selectedNumeric} />
                {selectedNumeric && (
                  <>
                    <SectionTitle>Distribution — {selectedNumeric.column}</SectionTitle>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                      <Histogram stat={selectedNumeric} />
                      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
                        <div style={{ color: C.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 16 }}>Detailed Stats</div>
                        {[
                          ["Mean", fmt(selectedNumeric.mean)],
                          ["Median", fmt(selectedNumeric.median)],
                          ["Std Dev", fmt(selectedNumeric.std)],
                          ["Min", fmt(selectedNumeric.min)],
                          ["Max", fmt(selectedNumeric.max)],
                          ["Q1", fmt(selectedNumeric.q1)],
                          ["Q3", fmt(selectedNumeric.q3)],
                          ["IQR", fmt(selectedNumeric.iqr)],
                          ["Skewness", fmt(selectedNumeric.skewness)],
                          ["Kurtosis", fmt(selectedNumeric.kurtosis)],
                          ["Outliers", selectedNumeric.outliers],
                        ].map(([k, v]) => (
                          <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${C.border}` }}>
                            <span style={{ color: C.muted, fontSize: 12 }}>{k}</span>
                            <span style={{ color: C.text, fontFamily: "monospace", fontSize: 12 }}>{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

            {/* ── CATEGORICAL ── */}
            {tab === "categorical" && (
              <>
                <SectionTitle>Categorical Columns</SectionTitle>
                {data.categorical_stats.length === 0 ? (
                  <div style={{ color: C.muted, padding: 24 }}>No categorical columns found.</div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: 16 }}>
                    {data.categorical_stats.map(s => <CatBar key={s.column} stat={s} />)}
                  </div>
                )}
              </>
            )}

            {/* ── CORRELATION ── */}
            {tab === "correlation" && (
              <>
                <SectionTitle>Correlation Analysis</SectionTitle>
                {!data.correlation ? (
                  <div style={{ color: C.muted, padding: 24 }}>Need at least 2 numeric columns.</div>
                ) : (
                  <CorrelationHeatmap corr={data.correlation} />
                )}
              </>
            )}

            {/* ── SCATTER ── */}
            {tab === "scatter" && (
              <>
                <SectionTitle>Pairwise Scatter Plots (top 5 numeric cols)</SectionTitle>
                {data.scatter_pairs.length === 0 ? (
                  <div style={{ color: C.muted, padding: 24 }}>Need at least 2 numeric columns.</div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
                    {data.scatter_pairs.map((p, i) => <ScatterPlot key={i} pair={p} />)}
                  </div>
                )}
              </>
            )}

            {/* ── NORMALITY ── */}
            {tab === "normality" && (
              <>
                <SectionTitle>Normality Tests (Shapiro-Wilk / D'Agostino)</SectionTitle>
                {data.normality.length === 0 ? (
                  <div style={{ color: C.muted, padding: 24 }}>No numeric columns available for normality test.</div>
                ) : (
                  <NormalityTable data={data.normality} />
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
