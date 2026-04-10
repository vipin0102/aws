import React, { useState, useEffect, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Cell, LabelList } from "recharts";
import { Cloud, LogOut, BarChart3, Loader2, DollarSign, Settings, Key, Download, Printer, TrendingUp, Calendar, Hash } from "lucide-react";

const COLORS = [
  "#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6",
  "#06b6d4","#f97316","#84cc16","#ec4899","#14b8a6",
  "#a855f7","#eab308","#22c55e","#0ea5e9","#fb923c"
];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const pct = payload[0].payload.pct;
    return (
      <div className="custom-tooltip">
        <p className="custom-tooltip-label">{label}</p>
        <p className="custom-tooltip-value">${parseFloat(payload[0].value).toFixed(4)}</p>
        {pct !== undefined && (
          <p style={{ color: "var(--text-secondary)", fontSize: "0.75rem", marginTop: 2 }}>{pct}% of total</p>
        )}
      </div>
    );
  }
  return null;
};

export default function App() {
  const [authState, setAuthState] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [awsCreds, setAwsCreds] = useState({ accessKeyId: "", secretAccessKey: "", region: "us-east-1" });
  const [credsError, setCredsError] = useState("");

  const [services, setServices] = useState([]);
  const [selected, setSelected] = useState("ALL");
  const [startDate, setStartDate] = useState(() => {
    let d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);

  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingServices, setLoadingServices] = useState(false);

  const [showSettings, setShowSettings] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [settingMsg, setSettingMsg] = useState("");

  const chartData = useMemo(() => {
    const map = new Map();
    rawData.forEach(item => {
      const key = selected === "ALL" ? item.service : item.account;
      if (!map.has(key)) map.set(key, 0);
      map.set(key, map.get(key) + item.cost);
    });
    const total = Array.from(map.values()).reduce((a, b) => a + b, 0);
    return Array.from(map.entries())
      .map(([k, sum]) => ({
        name: k,
        cost: sum,
        pct: total > 0 ? ((sum / total) * 100).toFixed(1) : "0.0"
      }))
      .sort((a, b) => b.cost - a.cost);
  }, [rawData, selected]);

  const totalCost = useMemo(() => rawData.reduce((acc, c) => acc + c.cost, 0), [rawData]);
  const topService = useMemo(() => chartData.length > 0 ? chartData[0] : null, [chartData]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    try {
      const res = await fetch("/aws-cost/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.success) setAuthState("credentials");
      else setLoginError(data.error || "Invalid credentials");
    } catch {
      setLoginError("Failed to connect to server");
    }
  };

  const handleCredsSubmit = (e) => {
    e.preventDefault();
    if (!awsCreds.accessKeyId || !awsCreds.secretAccessKey || !awsCreds.region) {
      setCredsError("Please fill all fields");
      return;
    }
    setCredsError("");
    setAuthState("dashboard");
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("/aws-cost/api/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, oldPassword, newPassword })
      });
      const data = await res.json();
      if (data.success) {
        setSettingMsg("Password changed successfully!");
        setOldPassword(""); setNewPassword("");
      } else {
        setSettingMsg(data.error || "Failed to change password");
      }
    } catch {
      setSettingMsg("Server error");
    }
  };

  const getAwsHeaders = () => ({
    "x-aws-access-key": awsCreds.accessKeyId,
    "x-aws-secret-key": awsCreds.secretAccessKey,
    "x-aws-region": awsCreds.region
  });

  useEffect(() => {
    if (authState === "dashboard") {
      setLoadingServices(true);
      fetch("/aws-cost/api/services", { headers: getAwsHeaders() })
        .then(res => { if (!res.ok) throw new Error("Failed to fetch services."); return res.json(); })
        .then(data => { setServices(Array.isArray(data) ? data : []); setLoadingServices(false); })
        .catch(() => { setServices([]); setLoadingServices(false); });
    }
  }, [authState]);

  const fetchCost = () => {
    if (!selected) return;
    setLoading(true);
    const query = new URLSearchParams({ service: selected, start: startDate, end: endDate }).toString();
    fetch(`/aws-cost/api/cost?${query}`, { headers: getAwsHeaders() })
      .then(res => res.json())
      .then(data => { setRawData(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  const generateCSV = () => {
    if (rawData.length === 0) return;
    const headers = ["Date", "Service", "Account", "Cost (USD)"];
    const rows = rawData.map(r => [r.date, r.service, r.account, r.cost.toFixed(4)]);
    const csvContent = headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `aws_cost_report_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (authState === "login") {
    return (
      <div className="login-container">
        <form className="login-card" onSubmit={handleLogin}>
          <Cloud size={64} className="login-icon mx-auto" />
          <h2 className="login-title">AWS Cost Dashboard</h2>
          <p className="login-subtitle">Monitor and analyze your cloud costs</p>
          <input type="text" className="text-input" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required />
          <input type="password" className="text-input" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
          {loginError && <div className="form-error">{loginError}</div>}
          <button type="submit" className="btn btn-primary login-btn">Sign In</button>
        </form>
      </div>
    );
  }

  if (authState === "credentials") {
    return (
      <div className="login-container">
        <form className="login-card" onSubmit={handleCredsSubmit}>
          <Key size={64} className="login-icon mx-auto" />
          <h2 className="login-title">AWS Configuration</h2>
          <p className="login-subtitle">Provide IAM programmatic keys to query Cost Explorer</p>
          <input type="text" className="text-input" placeholder="AWS Access Key ID" value={awsCreds.accessKeyId} onChange={e => setAwsCreds({...awsCreds, accessKeyId: e.target.value})} required />
          <input type="password" className="text-input" placeholder="AWS Secret Access Key" value={awsCreds.secretAccessKey} onChange={e => setAwsCreds({...awsCreds, secretAccessKey: e.target.value})} required />
          <input type="text" className="text-input" placeholder="Region (default: us-east-1)" value={awsCreds.region} onChange={e => setAwsCreds({...awsCreds, region: e.target.value})} required />
          {credsError && <div className="form-error">{credsError}</div>}
          <button type="submit" className="btn btn-primary login-btn">Let's Go</button>
        </form>
      </div>
    );
  }

  return (
    <div className="app-container">
      <nav className="navbar">
        <div className="nav-brand">
          <Cloud className="icon" size={28} />
          AWS Cost Dashboard
        </div>
        <div style={{ display: "flex", gap: "1rem" }}>
          <button className="btn btn-outline" onClick={() => setShowSettings(true)}>
            <Settings size={16} /> Password Reset
          </button>
          <button className="btn btn-outline" onClick={() => { setAuthState("login"); setUsername(""); setPassword(""); setRawData([]); }}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </nav>

      {showSettings && (
        <div className="modal-overlay">
          <form className="modal-content" onSubmit={handlePasswordChange}>
            <h3 className="modal-header">Account Settings</h3>
            <label style={{ color: "var(--text-secondary)" }}>Old Password</label>
            <input type="password" className="text-input" value={oldPassword} onChange={e => setOldPassword(e.target.value)} required />
            <label style={{ color: "var(--text-secondary)" }}>New Password</label>
            <input type="password" className="text-input" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
            {settingMsg && <div style={{ color: settingMsg.includes("success") ? "var(--success)" : "var(--danger)", marginBottom: "1rem" }}>{settingMsg}</div>}
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => { setShowSettings(false); setSettingMsg(""); }}>Close</button>
              <button type="submit" className="btn btn-primary">Save Changes</button>
            </div>
          </form>
        </div>
      )}

      <main className="main-content">
        {/* Controls */}
        <div className="controls-card" style={{ flexWrap: "wrap" }}>
          <div className="control-group" style={{ minWidth: "200px" }}>
            <label>AWS Service Target</label>
            <select className="select-input" value={selected} onChange={e => setSelected(e.target.value)} disabled={loadingServices}>
              <option value="ALL">All Active Services</option>
              {services.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="control-group">
            <label>Start Date</label>
            <input type="date" className="select-input" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="control-group">
            <label>End Date</label>
            <input type="date" className="select-input" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={fetchCost} disabled={!selected || loading}>
            {loading ? <Loader2 className="spinner" size={18} /> : <BarChart3 size={18} />}
            Fetch Report
          </button>
        </div>

        {/* Report Card */}
        <div className="chart-card" style={{ height: "auto", minHeight: "500px" }}>
          <div className="chart-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 className="chart-title">AWS Cost Report</h3>
              <p className="chart-subtitle">
                {selected === "ALL" ? "All Services" : selected} &mdash; {startDate} to {endDate}
              </p>
            </div>
            {rawData.length > 0 && (
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button className="btn btn-outline" onClick={() => window.print()}>
                  <Printer size={16} /> Save PDF
                </button>
                <button className="btn btn-success" onClick={generateCSV}>
                  <Download size={16} /> Export CSV
                </button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="loading" style={{ height: "400px" }}>
              <Loader2 className="spinner" size={32} />
              <p>Aggregating daily cost data from AWS...</p>
            </div>
          ) : chartData.length > 0 ? (
            <>
              {/* Stat cards */}
              <div className="report-stats">
                <div className="stat-card">
                  <DollarSign size={20} className="stat-icon" />
                  <div>
                    <div className="stat-label">Total Cost</div>
                    <div className="stat-value">${totalCost.toFixed(4)}</div>
                  </div>
                </div>
                <div className="stat-card">
                  <TrendingUp size={20} className="stat-icon" />
                  <div>
                    <div className="stat-label">Top Service</div>
                    <div className="stat-value" style={{ fontSize: "1rem" }}>{topService?.name ?? "—"}</div>
                    <div className="stat-sub">${topService?.cost.toFixed(4) ?? "0"} ({topService?.pct ?? 0}%)</div>
                  </div>
                </div>
                <div className="stat-card">
                  <Hash size={20} className="stat-icon" />
                  <div>
                    <div className="stat-label">Services</div>
                    <div className="stat-value">{chartData.length}</div>
                  </div>
                </div>
                <div className="stat-card">
                  <Calendar size={20} className="stat-icon" />
                  <div>
                    <div className="stat-label">Date Range</div>
                    <div className="stat-value" style={{ fontSize: "0.9rem" }}>{startDate}</div>
                    <div className="stat-sub">to {endDate}</div>
                  </div>
                </div>
              </div>

              {/* Bar Chart */}
              <div style={{ height: "420px", marginBottom: "2rem" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 30, right: 30, left: 20, bottom: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
                      tickMargin={10}
                      angle={-35}
                      textAnchor="end"
                      interval={0}
                    />
                    <YAxis
                      tickFormatter={val => `$${val}`}
                      tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
                      tickMargin={8}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                    <Bar dataKey="cost" radius={[6, 6, 0, 0]} maxBarSize={60} animationDuration={900}>
                      {chartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                      <LabelList
                        dataKey="cost"
                        position="top"
                        formatter={v => `$${parseFloat(v).toFixed(2)}`}
                        style={{ fontSize: 10, fill: "var(--text-secondary)" }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Per-service summary */}
              <h4 style={{ color: "var(--text-primary)", marginBottom: "0.75rem" }}>
                Cost by {selected === "ALL" ? "Service" : "Account"}
              </h4>
              <div className="data-table-container" style={{ marginBottom: "2rem" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>{selected === "ALL" ? "Service" : "Account"}</th>
                      <th>Cost (USD)</th>
                      <th>% of Total</th>
                      <th>Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chartData.map((row, idx) => (
                      <tr key={idx}>
                        <td style={{ color: "var(--text-secondary)" }}>{idx + 1}</td>
                        <td>
                          <span className="svc-dot" style={{ background: COLORS[idx % COLORS.length] }} />
                          {row.name}
                        </td>
                        <td style={{ fontWeight: 600 }}>${row.cost.toFixed(4)}</td>
                        <td>{row.pct}%</td>
                        <td>
                          <div className="pct-bar-bg">
                            <div className="pct-bar-fill" style={{ width: `${row.pct}%`, background: COLORS[idx % COLORS.length] }} />
                          </div>
                        </td>
                      </tr>
                    ))}
                    <tr className="total-row">
                      <td colSpan={2} style={{ fontWeight: 700 }}>TOTAL</td>
                      <td style={{ fontWeight: 700, color: "var(--accent)" }}>${totalCost.toFixed(4)}</td>
                      <td>100%</td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Daily breakdown */}
              <h4 style={{ color: "var(--text-primary)", marginBottom: "0.75rem" }}>Daily Breakdown</h4>
              <div className="data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Service</th>
                      <th>Account</th>
                      <th>Cost (USD)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rawData.map((row, idx) => (
                      <tr key={idx}>
                        <td>{row.date}</td>
                        <td>{row.service}</td>
                        <td>{row.account}</td>
                        <td>${parseFloat(row.cost).toFixed(4)}</td>
                      </tr>
                    ))}
                    <tr className="total-row">
                      <td colSpan={3} style={{ fontWeight: 700 }}>TOTAL</td>
                      <td style={{ fontWeight: 700, color: "var(--accent)" }}>${totalCost.toFixed(4)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="empty-state" style={{ height: "400px" }}>
              <DollarSign size={48} opacity={0.2} />
              <p>No valid expenses found for this criteria.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
