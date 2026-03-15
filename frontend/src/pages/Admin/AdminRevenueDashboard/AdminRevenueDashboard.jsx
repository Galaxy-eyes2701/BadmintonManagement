import { useState, useEffect, useCallback, useMemo } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import styles from "./AdminRevenueDashboard.module.css";
import SidebarMenu from "../../../components/Admin/SidebarMenu";
import { useNavigate } from "react-router-dom";

const API_BASE = "http://localhost:5043/api/admin/revenue";

const api = {
  getSummary: (p) => fetch(`${API_BASE}/summary?${p}`),
  getByBranch: (p) => fetch(`${API_BASE}/by-branch?${p}`),
  getByCourtType: (p) => fetch(`${API_BASE}/by-court-type?${p}`),
  getByPeriod: (p) => fetch(`${API_BASE}/by-period?${p}`),
  getTopCourts: (p) => fetch(`${API_BASE}/top-courts?${p}&top=8`),
  getBookingStats: (p) => fetch(`${API_BASE}/booking-stats?${p}`),
  exportCsv: (p) => fetch(`${API_BASE}/export?${p}`),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatMoney = (n) =>
  n != null ? new Intl.NumberFormat("vi-VN").format(Math.round(n)) + "đ" : "—";

const formatMoneyShort = (n) => {
  if (n == null) return "—";
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + " tỷ";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + " tr";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "k";
  return String(n);
};

const toDateStr = (d) => d.toISOString().slice(0, 10);

const PRESETS = [
  { label: "7 ngày", days: 7 },
  { label: "30 ngày", days: 30 },
  { label: "3 tháng", days: 90 },
  { label: "6 tháng", days: 180 },
  { label: "1 năm", days: 365 },
];

const PERIOD_OPTS = [
  { value: "day", label: "Theo ngày" },
  { value: "month", label: "Theo tháng" },
  { value: "year", label: "Theo năm" },
];

const C = {
  primary: "#0f766e",
  light: "#14b8a6",
  dark: "#0d5e58",
  tealXL: "#5eead4",
  amber: "#f59e0b",
  blue: "#3b82f6",
  purple: "#8b5cf6",
  green: "#10b981",
  red: "#ef4444",
  slate: "#94a3b8",
};
const PIE_COLORS = [C.primary, C.amber, C.blue, C.purple, "#ec4899", C.green];

// ─── Tooltip components ───────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipLabel}>{label}</p>
      {payload.map((p, i) => (
        <p
          key={i}
          style={{
            color: p.color,
            margin: "3px 0",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {p.name}: {formatMoneyShort(p.value)}
        </p>
      ))}
    </div>
  );
};

const PieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipLabel}>{p.name}</p>
      <p
        style={{
          color: p.payload.fill ?? C.primary,
          margin: "3px 0",
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        {formatMoneyShort(p.value)} ({p.payload.percentage?.toFixed(1)}%)
      </p>
    </div>
  );
};

const renderDonutLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="#fff"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={11}
      fontWeight={800}
      fontFamily="Nunito, sans-serif"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

// ════════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════════
const RevenueDashboard = () => {
  const navigate = useNavigate();

  // ── Filter state ─────────────────────────────────────────────────────────────
  const [endDate, setEndDate] = useState(toDateStr(new Date()));
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return toDateStr(d);
  });
  const [period, setPeriod] = useState("month");
  const [activePreset, setActivePreset] = useState(1);

  // ── Data state ────────────────────────────────────────────────────────────────
  const [summary, setSummary] = useState(null);
  const [byBranch, setByBranch] = useState([]);
  const [byCourtType, setByCourtType] = useState([]);
  const [byPeriodData, setByPeriodData] = useState([]);
  const [topCourts, setTopCourts] = useState([]);
  const [bookingStats, setBookingStats] = useState(null);

  // ── UI state ──────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  const handleLogout = () => {
    if (window.confirm("Bạn có chắc chắn muốn đăng xuất?")) {
      localStorage.removeItem("adminLoggedIn");
      navigate("/admin/login");
    }
  };

  const qs = useMemo(
    () => new URLSearchParams({ startDate, endDate, period }).toString(),
    [startDate, endDate, period],
  );

  // ── Fetch ─────────────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [r1, r2, r3, r4, r5, r6] = await Promise.all([
        api.getSummary(qs),
        api.getByBranch(qs),
        api.getByCourtType(qs),
        api.getByPeriod(qs),
        api.getTopCourts(qs),
        api.getBookingStats(qs),
      ]);
      if (!r1.ok) throw new Error(`Lỗi tải tổng quan (${r1.status})`);
      const [d1, d2, d3, d4, d5, d6] = await Promise.all([
        r1.json(),
        r2.ok ? r2.json() : [],
        r3.ok ? r3.json() : [],
        r4.ok ? r4.json() : [],
        r5.ok ? r5.json() : [],
        r6.ok ? r6.json() : null,
      ]);
      setSummary(d1);
      setByBranch(d2);
      setByCourtType(d3);
      setByPeriodData(d4);
      setTopCourts(d5);
      setBookingStats(d6);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [qs]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const applyPreset = (days, idx) => {
    const end = new Date(),
      start = new Date();
    start.setDate(start.getDate() - days);
    setEndDate(toDateStr(end));
    setStartDate(toDateStr(start));
    setActivePreset(idx);
    setPeriod(days <= 30 ? "day" : "month");
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await api.exportCsv(qs);
      if (!res.ok) throw new Error("Export thất bại");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `revenue_${startDate}_${endDate}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.message);
    } finally {
      setExporting(false);
    }
  };

  // ── Derived data ──────────────────────────────────────────────────────────────
  const pieCourtType = useMemo(() => {
    const total = byCourtType.reduce((s, d) => s + (d.totalRevenue ?? 0), 0);
    return byCourtType.map((d) => ({
      name: d.courtTypeName,
      value: d.totalRevenue ?? 0,
      percentage: total === 0 ? 0 : ((d.totalRevenue ?? 0) / total) * 100,
    }));
  }, [byCourtType]);

  // ✅ SỬA: 3 trạng thái thực tế — bỏ "Hoàn thành", chỉ giữ confirmed/pending/cancelled
  const bookingPie = useMemo(() => {
    if (!bookingStats) return [];
    return [
      {
        name: "Đã xác nhận",
        value: bookingStats.confirmedBookings,
        fill: C.blue,
      },
      {
        name: "Chờ xác nhận",
        value: bookingStats.pendingBookings,
        fill: C.amber,
      },
      { name: "Đã hủy", value: bookingStats.cancelledBookings, fill: C.red },
    ].filter((d) => d.value > 0);
  }, [bookingStats]);

  const peakData = useMemo(() => {
    if (!bookingStats?.peakHours) return [];
    const maxVal = Math.max(
      ...bookingStats.peakHours.map((d) => d.totalBookings),
      1,
    );
    return Array.from({ length: 24 }, (_, h) => {
      const found = bookingStats.peakHours.find((d) => d.hour === h);
      return {
        hour: `${String(h).padStart(2, "0")}h`,
        bookings: found?.totalBookings ?? 0,
        maxVal,
      };
    });
  }, [bookingStats]);

  const topCourtsBar = useMemo(
    () =>
      [...topCourts].reverse().map((c) => ({
        name:
          c.courtName.length > 14
            ? c.courtName.slice(0, 14) + "…"
            : c.courtName,
        fullName: c.courtName,
        revenue: c.totalRevenue,
        bookings: c.totalBookings,
      })),
    [topCourts],
  );

  const radialData = useMemo(
    () =>
      topCourts.slice(0, 5).map((c, i) => ({
        name: c.courtName,
        occupancy: Math.min(c.occupancyRate ?? 0, 100),
        fill: [C.primary, C.light, C.tealXL, C.amber, C.blue][i],
      })),
    [topCourts],
  );

  const GrowthBadge = ({ value }) => {
    if (value == null) return null;
    const pos = value >= 0;
    return (
      <span className={pos ? styles.growthPos : styles.growthNeg}>
        {pos ? "▲" : "▼"} {Math.abs(value).toFixed(1)}%
      </span>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className={styles.layout}>
      <SidebarMenu />

      <div className={styles.mainArea}>
        {/* ══ HEADER ══ */}
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <span className={styles.headerIcon}>📊</span>
            <div>
              <h1 className={styles.headerTitle}>Thống kê Doanh thu</h1>
              <p className={styles.headerSub}>
                Admin · Báo cáo & phân tích tổng hợp
              </p>
            </div>
          </div>
          <div className={styles.headerRight}>
            {summary && (
              <div className={styles.headerStats}>
                <div className={styles.statChip}>
                  <span className={styles.statNum}>
                    {formatMoneyShort(summary.totalRevenue)}
                  </span>
                  <span className={styles.statLabel}>Tổng DT</span>
                </div>
                <div className={styles.statChipSuccess}>
                  <span className={styles.statNum}>
                    {summary.totalBookings}
                  </span>
                  <span className={styles.statLabel}>Booking</span>
                </div>
                <div className={styles.statChipWarn}>
                  <span className={styles.statNum}>
                    {summary.totalCustomers}
                  </span>
                  <span className={styles.statLabel}>Khách hàng</span>
                </div>
              </div>
            )}
            <button
              className={styles.btnExport}
              onClick={handleExport}
              disabled={exporting || loading}
            >
              <span>{exporting ? "⏳" : "⬇️"}</span>
              <span>Xuất CSV</span>
            </button>
            <button className={styles.btnLogout} onClick={handleLogout}>
              <span>🚪</span>
              <span>Đăng xuất</span>
            </button>
          </div>
        </header>

        {error && (
          <div className={styles.errorBanner}>
            <span>⚠️ {error}</span>
            <button
              className={styles.bannerClose}
              onClick={() => setError(null)}
            >
              ✕
            </button>
          </div>
        )}

        <main className={styles.content}>
          {/* ══ FILTER BAR ══ */}
          <div className={styles.toolbar}>
            <div className={styles.toolbarLeft}>
              <span className={styles.filterLabel}>🗓️ Khoảng thời gian:</span>
              <div className={styles.presets}>
                {PRESETS.map((p, i) => (
                  <button
                    key={i}
                    className={`${styles.presetBtn} ${activePreset === i ? styles.presetActive : ""}`}
                    onClick={() => applyPreset(p.days, i)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div className={styles.dateRange}>
                <input
                  type="date"
                  className={styles.filterSelect}
                  value={startDate}
                  max={endDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setActivePreset(null);
                  }}
                />
                <span className={styles.dateSep}>→</span>
                <input
                  type="date"
                  className={styles.filterSelect}
                  value={endDate}
                  min={startDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setActivePreset(null);
                  }}
                />
              </div>
              <select
                className={styles.filterSelect}
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              >
                {PERIOD_OPTS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              className={styles.btnPrimary}
              onClick={fetchAll}
              disabled={loading}
            >
              {loading ? <span className={styles.spinnerSm} /> : "🔄"} Làm mới
            </button>
          </div>

          {loading ? (
            <div className={styles.loadingWrap}>
              <div className={styles.spinner} />
              <p>Đang tải dữ liệu thống kê...</p>
            </div>
          ) : (
            <>
              {/* ══ 4 SUMMARY CARDS ══ */}
              {summary && (
                <div className={styles.summaryGrid}>
                  <div
                    className={`${styles.summaryCard} ${styles.cardRevenue}`}
                  >
                    <div className={styles.cardIcon}>💰</div>
                    <div className={styles.cardBody}>
                      <p className={styles.cardLabel}>Tổng doanh thu</p>
                      <p className={styles.cardValue}>
                        {formatMoney(summary.totalRevenue)}
                      </p>
                      <GrowthBadge value={summary.revenueGrowthRate} />
                    </div>
                  </div>
                  <div
                    className={`${styles.summaryCard} ${styles.cardBooking}`}
                  >
                    <div className={styles.cardIcon}>🏸</div>
                    <div className={styles.cardBody}>
                      <p className={styles.cardLabel}>Booking revenue</p>
                      <p className={styles.cardValue}>
                        {formatMoney(summary.bookingRevenue)}
                      </p>
                      {/* ✅ SỬA: "hoàn thành" → "đã xác nhận" */}
                      <span className={styles.cardSub}>
                        {summary.completedBookings} đã xác nhận
                      </span>
                    </div>
                  </div>
                  <div className={`${styles.summaryCard} ${styles.cardOrder}`}>
                    <div className={styles.cardIcon}>🛒</div>
                    <div className={styles.cardBody}>
                      <p className={styles.cardLabel}>Doanh thu đơn hàng</p>
                      <p className={styles.cardValue}>
                        {formatMoney(summary.orderRevenue)}
                      </p>
                      <span className={styles.cardSub}>
                        {summary.totalOrders} đơn hàng
                      </span>
                    </div>
                  </div>
                  <div className={`${styles.summaryCard} ${styles.cardAvg}`}>
                    <div className={styles.cardIcon}>📈</div>
                    <div className={styles.cardBody}>
                      <p className={styles.cardLabel}>Trung bình / ngày</p>
                      <p className={styles.cardValue}>
                        {formatMoney(summary.avgRevenuePerDay)}
                      </p>
                      <span className={styles.cardSub}>
                        {summary.cancelledBookings} booking hủy
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* ══ TABS ══ */}
              <div className={styles.tabs}>
                {[
                  { id: "overview", label: "📊 Tổng quan" },
                  { id: "courts", label: "🏸 Top sân" },
                  { id: "bookings", label: "📋 Booking" },
                ].map((t) => (
                  <button
                    key={t.id}
                    className={`${styles.tab} ${activeTab === t.id ? styles.tabActive : ""}`}
                    onClick={() => setActiveTab(t.id)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* ══════════════ TAB: TỔNG QUAN ══════════════ */}
              {activeTab === "overview" && (
                <div className={styles.tabContent}>
                  {/* [1] Area chart */}
                  <div className={`${styles.tableWrapper} ${styles.cardFull}`}>
                    <div className={styles.cardHeader}>
                      <h2 className={styles.cardTitle}>
                        📈 Doanh thu theo{" "}
                        {PERIOD_OPTS.find(
                          (o) => o.value === period,
                        )?.label.toLowerCase()}
                      </h2>
                      <div className={styles.chartLegend}>
                        <span className={styles.legendDotTeal} /> Booking
                        <span className={styles.legendDotAmber} /> Đơn hàng
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart
                        data={byPeriodData}
                        margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient
                            id="gTeal"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor={C.primary}
                              stopOpacity={0.22}
                            />
                            <stop
                              offset="95%"
                              stopColor={C.primary}
                              stopOpacity={0}
                            />
                          </linearGradient>
                          <linearGradient
                            id="gAmber"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor={C.amber}
                              stopOpacity={0.22}
                            />
                            <stop
                              offset="95%"
                              stopColor={C.amber}
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                          dataKey="label"
                          tick={{
                            fontSize: 11,
                            fill: C.slate,
                            fontFamily: "Nunito",
                          }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          tickFormatter={formatMoneyShort}
                          tick={{
                            fontSize: 11,
                            fill: C.slate,
                            fontFamily: "Nunito",
                          }}
                          tickLine={false}
                          axisLine={false}
                          width={60}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                          wrapperStyle={{
                            fontSize: 12,
                            fontFamily: "Nunito",
                            fontWeight: 700,
                            paddingTop: 8,
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="bookingRevenue"
                          name="Booking"
                          stroke={C.primary}
                          strokeWidth={2.5}
                          fill="url(#gTeal)"
                          dot={false}
                          activeDot={{ r: 5 }}
                        />
                        <Area
                          type="monotone"
                          dataKey="orderRevenue"
                          name="Đơn hàng"
                          stroke={C.amber}
                          strokeWidth={2.5}
                          fill="url(#gAmber)"
                          dot={false}
                          activeDot={{ r: 5 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* [2] Stacked bar + [3] Donut */}
                  <div className={styles.twoCol}>
                    <div className={styles.tableWrapper}>
                      <div className={styles.cardHeader}>
                        <h2 className={styles.cardTitle}>
                          🏢 Doanh thu theo chi nhánh
                        </h2>
                      </div>
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart
                          data={byBranch}
                          margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
                          barCategoryGap="30%"
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#e2e8f0"
                            vertical={false}
                          />
                          <XAxis
                            dataKey="branchName"
                            tick={{
                              fontSize: 11,
                              fill: C.slate,
                              fontFamily: "Nunito",
                            }}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            tickFormatter={formatMoneyShort}
                            tick={{
                              fontSize: 11,
                              fill: C.slate,
                              fontFamily: "Nunito",
                            }}
                            tickLine={false}
                            axisLine={false}
                            width={55}
                          />
                          <Tooltip
                            content={<CustomTooltip />}
                            cursor={{ fill: "rgba(15,118,110,0.05)" }}
                          />
                          <Legend
                            wrapperStyle={{
                              fontSize: 12,
                              fontFamily: "Nunito",
                              fontWeight: 700,
                            }}
                          />
                          <Bar
                            dataKey="bookingRevenue"
                            name="Booking"
                            stackId="a"
                            fill={C.primary}
                            radius={[0, 0, 0, 0]}
                          />
                          <Bar
                            dataKey="orderRevenue"
                            name="Đơn hàng"
                            stackId="a"
                            fill={C.amber}
                            radius={[6, 6, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className={styles.tableWrapper}>
                      <div className={styles.cardHeader}>
                        <h2 className={styles.cardTitle}>
                          🎯 Tỉ trọng theo loại sân
                        </h2>
                      </div>
                      {pieCourtType.length === 0 ? (
                        <div className={styles.chartEmpty}>Chưa có dữ liệu</div>
                      ) : (
                        <ResponsiveContainer width="100%" height={260}>
                          <PieChart>
                            <Pie
                              data={pieCourtType}
                              cx="50%"
                              cy="50%"
                              innerRadius={65}
                              outerRadius={105}
                              paddingAngle={3}
                              dataKey="value"
                              labelLine={false}
                              label={renderDonutLabel}
                            >
                              {pieCourtType.map((_, i) => (
                                <Cell
                                  key={i}
                                  fill={PIE_COLORS[i % PIE_COLORS.length]}
                                />
                              ))}
                            </Pie>
                            <Tooltip content={<PieTooltip />} />
                            <Legend
                              formatter={(v) => (
                                <span
                                  style={{
                                    fontSize: 12,
                                    fontFamily: "Nunito",
                                    fontWeight: 700,
                                  }}
                                >
                                  {v}
                                </span>
                              )}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>

                  {/* [4] Line chart */}
                  <div className={`${styles.tableWrapper} ${styles.cardFull}`}>
                    <div className={styles.cardHeader}>
                      <h2 className={styles.cardTitle}>
                        📉 So sánh Booking vs Đơn hàng theo kỳ
                      </h2>
                    </div>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart
                        data={byPeriodData}
                        margin={{ top: 8, right: 20, left: 10, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                          dataKey="label"
                          tick={{
                            fontSize: 11,
                            fill: C.slate,
                            fontFamily: "Nunito",
                          }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          tickFormatter={formatMoneyShort}
                          tick={{
                            fontSize: 11,
                            fill: C.slate,
                            fontFamily: "Nunito",
                          }}
                          tickLine={false}
                          axisLine={false}
                          width={60}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                          wrapperStyle={{
                            fontSize: 12,
                            fontFamily: "Nunito",
                            fontWeight: 700,
                            paddingTop: 4,
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="bookingRevenue"
                          name="Booking"
                          stroke={C.primary}
                          strokeWidth={2.5}
                          dot={{ r: 3, fill: C.primary }}
                          activeDot={{ r: 6 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="orderRevenue"
                          name="Đơn hàng"
                          stroke={C.amber}
                          strokeWidth={2.5}
                          dot={{ r: 3, fill: C.amber }}
                          activeDot={{ r: 6 }}
                          strokeDasharray="5 3"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* ══════════════ TAB: TOP SÂN ══════════════ */}
              {activeTab === "courts" && (
                <div className={styles.tabContent}>
                  <div className={styles.twoCol}>
                    {/* [5] Horizontal bar */}
                    <div className={styles.tableWrapper}>
                      <div className={styles.cardHeader}>
                        <h2 className={styles.cardTitle}>
                          🏆 Top sân theo doanh thu
                        </h2>
                      </div>
                      {topCourtsBar.length === 0 ? (
                        <div className={styles.chartEmpty}>Chưa có dữ liệu</div>
                      ) : (
                        <ResponsiveContainer width="100%" height={320}>
                          <BarChart
                            data={topCourtsBar}
                            layout="vertical"
                            margin={{ top: 4, right: 60, left: 8, bottom: 4 }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="#e2e8f0"
                              horizontal={false}
                            />
                            <XAxis
                              type="number"
                              tickFormatter={formatMoneyShort}
                              tick={{
                                fontSize: 11,
                                fill: C.slate,
                                fontFamily: "Nunito",
                              }}
                              tickLine={false}
                              axisLine={false}
                            />
                            <YAxis
                              type="category"
                              dataKey="name"
                              width={95}
                              tick={{
                                fontSize: 11,
                                fill: "#334155",
                                fontFamily: "Nunito",
                                fontWeight: 700,
                              }}
                              tickLine={false}
                              axisLine={false}
                            />
                            <Tooltip
                              formatter={(v, _n, p) => [
                                formatMoneyShort(v),
                                p.payload.fullName,
                              ]}
                              cursor={{ fill: "rgba(15,118,110,0.05)" }}
                            />
                            <Bar
                              dataKey="revenue"
                              name="Doanh thu"
                              radius={[0, 6, 6, 0]}
                            >
                              {topCourtsBar.map((_, i) => (
                                <Cell
                                  key={i}
                                  fill={
                                    i >= topCourtsBar.length - 1
                                      ? C.primary
                                      : i >= topCourtsBar.length - 2
                                        ? C.light
                                        : i >= topCourtsBar.length - 3
                                          ? C.tealXL
                                          : "#cbd5e1"
                                  }
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>

                    {/* [6] Radial */}
                    <div className={styles.tableWrapper}>
                      <div className={styles.cardHeader}>
                        <h2 className={styles.cardTitle}>
                          ⭕ Tỉ lệ lấp đầy Top 5
                        </h2>
                      </div>
                      {radialData.length === 0 ? (
                        <div className={styles.chartEmpty}>Chưa có dữ liệu</div>
                      ) : (
                        <ResponsiveContainer width="100%" height={320}>
                          <RadialBarChart
                            cx="50%"
                            cy="50%"
                            innerRadius="20%"
                            outerRadius="90%"
                            data={radialData}
                            startAngle={180}
                            endAngle={-180}
                          >
                            <RadialBar
                              dataKey="occupancy"
                              cornerRadius={6}
                              label={false}
                              background={{ fill: "#f1f5f9" }}
                            />
                            <Tooltip
                              formatter={(v) => [`${v.toFixed(1)}%`, "Lấp đầy"]}
                            />
                            <Legend
                              iconSize={10}
                              formatter={(v) => (
                                <span
                                  style={{
                                    fontSize: 11,
                                    fontFamily: "Nunito",
                                    fontWeight: 700,
                                  }}
                                >
                                  {v}
                                </span>
                              )}
                            />
                          </RadialBarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>

                  {/* Bảng chi tiết */}
                  <div className={styles.tableWrapper}>
                    <div
                      className={styles.cardHeader}
                      style={{ padding: "16px 18px 0" }}
                    >
                      <h2 className={styles.cardTitle}>📋 Bảng chi tiết</h2>
                    </div>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Sân</th>
                          <th>Chi nhánh</th>
                          <th>Loại sân</th>
                          <th>Booking</th>
                          <th>Doanh thu</th>
                          <th>Lấp đầy</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topCourts.length === 0 && (
                          <tr>
                            <td colSpan={7} className={styles.emptyTd}>
                              Chưa có dữ liệu
                            </td>
                          </tr>
                        )}
                        {topCourts.map((c, i) => (
                          <tr
                            key={c.courtId}
                            className={styles.tableRow}
                            style={{ animationDelay: `${i * 0.05}s` }}
                          >
                            <td className={styles.tdId}>
                              {i === 0
                                ? "🥇"
                                : i === 1
                                  ? "🥈"
                                  : i === 2
                                    ? "🥉"
                                    : `#${i + 1}`}
                            </td>
                            <td>
                              <span className={styles.courtName}>
                                {c.courtName}
                              </span>
                            </td>
                            <td className={styles.mutedCell}>{c.branchName}</td>
                            <td>
                              <span className={styles.limitBadge}>
                                {c.courtTypeName}
                              </span>
                            </td>
                            <td style={{ fontWeight: 800 }}>
                              {c.totalBookings}
                            </td>
                            <td className={styles.tdDiscount}>
                              {formatMoney(c.totalRevenue)}
                            </td>
                            <td>
                              <div className={styles.occupancyWrap}>
                                <div className={styles.occupancyBar}>
                                  <div
                                    className={styles.occupancyFill}
                                    style={{
                                      width: `${Math.min(c.occupancyRate ?? 0, 100)}%`,
                                    }}
                                  />
                                </div>
                                <span className={styles.occupancyPct}>
                                  {c.occupancyRate?.toFixed(1)}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ══════════════ TAB: BOOKING ══════════════ */}
              {activeTab === "bookings" && bookingStats && (
                <div className={styles.tabContent}>
                  {/* ✅ SỬA: 4 cards đúng với 3 trạng thái thực tế — bỏ "Hoàn thành", thêm "Đã hủy" */}
                  <div className={styles.summaryGrid}>
                    {[
                      {
                        label: "Tổng booking",
                        value: bookingStats.totalBookings,
                        color: C.primary,
                        icon: "📊",
                      },
                      {
                        label: "Chờ xác nhận",
                        value: bookingStats.pendingBookings,
                        color: C.amber,
                        icon: "⏳",
                      },
                      {
                        label: "Đã xác nhận",
                        value: bookingStats.confirmedBookings,
                        color: C.blue,
                        icon: "✅",
                      },
                      {
                        label: "Đã hủy",
                        value: bookingStats.cancelledBookings,
                        color: C.red,
                        icon: "🚫",
                      },
                    ].map((s, i) => (
                      <div
                        key={i}
                        className={styles.summaryCard}
                        style={{
                          borderLeftColor: s.color,
                          animationDelay: `${i * 0.07}s`,
                        }}
                      >
                        <div className={styles.cardIcon}>{s.icon}</div>
                        <div className={styles.cardBody}>
                          <p className={styles.cardLabel}>{s.label}</p>
                          <p
                            className={styles.cardValue}
                            style={{ color: s.color }}
                          >
                            {s.value}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className={styles.twoCol}>
                    {/* [7] Donut trạng thái */}
                    <div className={styles.tableWrapper}>
                      <div className={styles.cardHeader}>
                        <h2 className={styles.cardTitle}>
                          🥧 Tỉ lệ trạng thái booking
                        </h2>
                      </div>
                      {bookingPie.length === 0 ? (
                        <div className={styles.chartEmpty}>Chưa có dữ liệu</div>
                      ) : (
                        <ResponsiveContainer width="100%" height={260}>
                          <PieChart>
                            <Pie
                              data={bookingPie}
                              cx="50%"
                              cy="50%"
                              outerRadius={95}
                              innerRadius={50}
                              paddingAngle={4}
                              dataKey="value"
                              labelLine={false}
                              label={renderDonutLabel}
                            >
                              {bookingPie.map((entry, i) => (
                                <Cell key={i} fill={entry.fill} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(v, n) => [v, n]} />
                            <Legend
                              formatter={(v) => (
                                <span
                                  style={{
                                    fontSize: 12,
                                    fontFamily: "Nunito",
                                    fontWeight: 700,
                                  }}
                                >
                                  {v}
                                </span>
                              )}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                      {/* ✅ SỬA: "hoàn thành" → "đã xác nhận" */}
                      <div className={styles.avgRow}>
                        <span className={styles.avgLabel}>
                          TB / booking đã xác nhận:
                        </span>
                        <span className={styles.avgValue}>
                          {formatMoney(bookingStats.avgBookingValue)}
                        </span>
                      </div>
                    </div>

                    {/* [8] Bar giờ cao điểm */}
                    <div className={styles.tableWrapper}>
                      <div className={styles.cardHeader}>
                        <h2 className={styles.cardTitle}>
                          🕐 Phân bổ booking theo giờ
                        </h2>
                      </div>
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart
                          data={peakData}
                          margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
                          barCategoryGap="10%"
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#e2e8f0"
                            vertical={false}
                          />
                          <XAxis
                            dataKey="hour"
                            tick={{
                              fontSize: 9,
                              fill: C.slate,
                              fontFamily: "Nunito",
                            }}
                            tickLine={false}
                            axisLine={false}
                            interval={1}
                          />
                          <YAxis
                            tick={{
                              fontSize: 10,
                              fill: C.slate,
                              fontFamily: "Nunito",
                            }}
                            tickLine={false}
                            axisLine={false}
                            allowDecimals={false}
                            width={28}
                          />
                          <Tooltip
                            formatter={(v) => [v, "Booking"]}
                            cursor={{ fill: "rgba(15,118,110,0.06)" }}
                          />
                          <Bar
                            dataKey="bookings"
                            name="Booking"
                            radius={[4, 4, 0, 0]}
                          >
                            {peakData.map((entry, i) => (
                              <Cell
                                key={i}
                                fill={
                                  entry.bookings === 0
                                    ? "#e2e8f0"
                                    : entry.bookings >= entry.maxVal * 0.75
                                      ? C.primary
                                      : entry.bookings >= entry.maxVal * 0.4
                                        ? C.light
                                        : C.tealXL
                                }
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* [9] Xu hướng booking */}
                  <div className={`${styles.tableWrapper} ${styles.cardFull}`}>
                    <div className={styles.cardHeader}>
                      <h2 className={styles.cardTitle}>
                        📊 Xu hướng số lượng booking theo kỳ
                      </h2>
                    </div>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart
                        data={byPeriodData}
                        margin={{ top: 8, right: 20, left: 10, bottom: 0 }}
                        barCategoryGap="25%"
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#e2e8f0"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="label"
                          tick={{
                            fontSize: 11,
                            fill: C.slate,
                            fontFamily: "Nunito",
                          }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          tick={{
                            fontSize: 11,
                            fill: C.slate,
                            fontFamily: "Nunito",
                          }}
                          tickLine={false}
                          axisLine={false}
                          allowDecimals={false}
                          width={35}
                        />
                        <Tooltip
                          content={<CustomTooltip />}
                          cursor={{ fill: "rgba(15,118,110,0.05)" }}
                        />
                        <Legend
                          wrapperStyle={{
                            fontSize: 12,
                            fontFamily: "Nunito",
                            fontWeight: 700,
                          }}
                        />
                        <Bar
                          dataKey="totalBookings"
                          name="Số booking"
                          fill={C.primary}
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default RevenueDashboard;
