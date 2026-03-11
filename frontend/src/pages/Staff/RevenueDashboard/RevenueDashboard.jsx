import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis,
    CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend
} from 'recharts';
import styles from './RevenueDashboard.module.css'; // Import file CSS mới

const RevenueDashboard = () => {
    const [timeRange, setTimeRange] = useState('1month');
    const [reportData, setReportData] = useState({ totalCourt: 0, totalPos: 0, chartData: [] });
    const [recentTransactions, setRecentTransactions] = useState([]);

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const revRes = await axios.get(`http://localhost:5043/api/payments/revenue-report?period=${timeRange}&month=${currentMonth}&year=${currentYear}`);
                const data = revRes.data;
                let totalCourt = 0; let totalPos = 0; let chartArray = [];

                if (timeRange === '1year') {
                    chartArray = Array.from({ length: 12 }, (_, i) => {
                        const courtMonth = data.courtRevenue?.find(c => new Date(c.date).getMonth() === i);
                        const posMonth = data.posRevenue?.find(p => new Date(p.date).getMonth() === i);
                        const courtVal = courtMonth ? courtMonth.total : 0;
                        const posVal = posMonth ? posMonth.total : 0;
                        totalCourt += courtVal; totalPos += posVal;
                        return { label: `Tháng ${i + 1}`, court: courtVal, pos: posVal, total: courtVal + posVal };
                    });
                } else if (timeRange === '7days') {
                    chartArray = Array.from({ length: 7 }, (_, i) => {
                        const d = new Date(); d.setDate(d.getDate() - (6 - i));
                        const courtDay = data.courtRevenue?.find(c => new Date(c.date).getDate() === d.getDate() && new Date(c.date).getMonth() === d.getMonth());
                        const posDay = data.posRevenue?.find(p => new Date(p.date).getDate() === d.getDate() && new Date(p.date).getMonth() === d.getMonth());
                        const courtVal = courtDay ? courtDay.total : 0; const posVal = posDay ? posDay.total : 0;
                        totalCourt += courtVal; totalPos += posVal;
                        return { label: `${d.getDate()}/${d.getMonth() + 1}`, court: courtVal, pos: posVal, total: courtVal + posVal };
                    });
                } else {
                    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
                    chartArray = Array.from({ length: daysInMonth }, (_, i) => {
                        const courtDay = data.courtRevenue?.find(c => new Date(c.date).getDate() === i + 1);
                        const posDay = data.posRevenue?.find(p => new Date(p.date).getDate() === i + 1);
                        const courtVal = courtDay ? courtDay.total : 0; const posVal = posDay ? posDay.total : 0;
                        totalCourt += courtVal; totalPos += posVal;
                        return { label: `${i + 1}/${currentMonth}`, court: courtVal, pos: posVal, total: courtVal + posVal };
                    });
                }
                setReportData({ totalCourt, totalPos, chartData: chartArray });

                const txRes = await axios.get(`http://localhost:5043/api/payments/recent-transactions?limit=5`);
                setRecentTransactions(txRes.data);
            } catch (error) { console.error("Lỗi tải dữ liệu", error); }
        };
        fetchData();
    }, [timeRange, currentMonth, currentYear]);

    const formatCurrency = (amount) => new Intl.NumberFormat('vi-VN').format(amount);
    const totalRevenue = reportData.totalCourt + reportData.totalPos;
    const courtPercent = totalRevenue > 0 ? Math.round((reportData.totalCourt / totalRevenue) * 100) : 0;
    const posPercent = totalRevenue > 0 ? Math.round((reportData.totalPos / totalRevenue) * 100) : 0;

    const pieData = [{ name: 'Thuê sân', value: reportData.totalCourt }, { name: 'POS & Dịch vụ', value: reportData.totalPos }];
    const COLORS = ['#0284c7', '#38bdf8'];

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', padding: '16px', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', border: '1px solid #f1f5f9' }}>
                    <p style={{ fontWeight: 'bold', color: '#334155', marginBottom: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>{label}</p>
                    {payload.map((entry, index) => (
                        <div key={index} style={{ display: 'flex', justifyContent: 'space-between', gap: '24px', padding: '4px 0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: entry.color }}></span>
                                <span style={{ fontSize: '14px', color: '#475569', fontWeight: 500 }}>{entry.name}</span>
                            </div>
                            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e293b' }}>{formatCurrency(entry.value)} đ</span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.headerTitle}>Báo cáo doanh thu</h1>
                <div className={styles.headerDate}>Cập nhật: {new Date().toLocaleDateString('vi-VN')}</div>
            </header>

            <div className={styles.mainContent}>
                <section className={styles.gridTop}>
                    <div className={styles.metricCard}>
                        <div className={styles.metricHeader}>
                            <div className={styles.iconBlue}><span className="material-symbols-outlined">account_balance_wallet</span></div>
                            <span className={styles.badgeEmerald}>+100%</span>
                        </div>
                        <div>
                            <h3 className={styles.metricTitle}>Tổng doanh thu</h3>
                            <p className={styles.metricValueTotal}>{formatCurrency(totalRevenue)} <span className={styles.unit}>đ</span></p>
                        </div>
                    </div>

                    <div className={styles.metricCard}>
                        <div className={styles.metricHeader}>
                            <div className={styles.iconSky}><span className="material-symbols-outlined">sports_tennis</span></div>
                            <span className={styles.badgeSky}>{courtPercent}%</span>
                        </div>
                        <div>
                            <h3 className={styles.metricTitle}>Doanh thu thuê sân</h3>
                            <p className={styles.metricValueCourt}>{formatCurrency(reportData.totalCourt)} <span className={`${styles.unit} ${styles.unitOpaque}`}>đ</span></p>
                        </div>
                    </div>

                    <div className={styles.metricCard}>
                        <div className={styles.metricHeader}>
                            <div className={styles.iconIndigo}><span className="material-symbols-outlined">shopping_basket</span></div>
                            <span className={styles.badgeIndigo}>{posPercent}%</span>
                        </div>
                        <div>
                            <h3 className={styles.metricTitle}>Doanh thu POS</h3>
                            <p className={styles.metricValuePos}>{formatCurrency(reportData.totalPos)} <span className={`${styles.unit} ${styles.unitOpaque}`}>đ</span></p>
                        </div>
                    </div>
                </section>

                <section className={styles.chartCard}>
                    <div className={styles.chartHeader}>
                        <h2 className={styles.chartTitle}>Biểu đồ thu nhập</h2>
                        <div className={styles.filterBox}>
                            <button onClick={() => setTimeRange('7days')} className={`${styles.filterBtn} ${timeRange === '7days' ? styles.filterBtnActive : ''}`}>7 Ngày</button>
                            <button onClick={() => setTimeRange('1month')} className={`${styles.filterBtn} ${timeRange === '1month' ? styles.filterBtnActive : ''}`}>1 Tháng</button>
                            <button onClick={() => setTimeRange('1year')} className={`${styles.filterBtn} ${timeRange === '1year' ? styles.filterBtnActive : ''}`}>1 Năm</button>
                        </div>
                    </div>

                    <div className={styles.chartWrapper}>
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={reportData.chartData} margin={{ top: 10, right: 0, bottom: 0, left: 20 }}>
                                <defs>
                                    <linearGradient id="colorCourt" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#0284c7" stopOpacity={0.9} />
                                        <stop offset="100%" stopColor="#0284c7" stopOpacity={0.6} />
                                    </linearGradient>
                                    <linearGradient id="colorPos" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.9} />
                                        <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.4} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 13, fontWeight: 500 }} dy={15} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 13, fontWeight: 500 }} dx={-15} tickFormatter={(value) => `${value / 1000}k`} />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '14px', fontWeight: 500, color: '#475569' }} />

                                <Bar dataKey="court" name="Thuê sân" stackId="a" fill="url(#colorCourt)" radius={[0, 0, 4, 4]} barSize={timeRange === '1month' ? 12 : 24} />
                                <Bar dataKey="pos" name="POS & Dịch vụ" stackId="a" fill="url(#colorPos)" radius={[4, 4, 0, 0]} />
                                <Line type="monotone" dataKey="total" name="Tổng doanh thu" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6, stroke: '#0ea5e9', strokeWidth: 2 }} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </section>

                <div className={styles.gridBottom}>
                    <div className={styles.chartCard}>
                        <div className={styles.txHeader}>
                            <h3 className={styles.txTitle}>Giao dịch gần đây</h3>
                            <span className={styles.realtimeBadge}><span className={styles.dot}></span> Real-time</span>
                        </div>
                        <div className={styles.txList}>
                            {recentTransactions.length === 0 ? (
                                <p className={styles.emptyText}>Chưa có giao dịch nào.</p>
                            ) : (
                                recentTransactions.map((tx, idx) => (
                                    <div key={idx} className={styles.txItem}>
                                        <div className={styles.txLeft}>
                                            <div className={styles.txIcon} style={{ backgroundColor: '#f1f5f9', color: '#475569' }}>
                                                <span className="material-symbols-outlined text-[22px]">{tx.icon || 'receipt'}</span>
                                            </div>
                                            <div>
                                                <p className={styles.txDesc}>{tx.description}</p>
                                                <p className={styles.txTime}>{tx.timeAgo}</p>
                                            </div>
                                        </div>
                                        <p className={styles.txAmount}>+{formatCurrency(tx.amount)}đ</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className={styles.chartCard} style={{ display: 'flex', flexDirection: 'column' }}>
                        <h3 className={styles.txTitle} style={{ marginBottom: '8px' }}>Cơ cấu nguồn thu</h3>
                        <p className={styles.pieDesc}>Tỉ trọng doanh thu theo từng hạng mục</p>
                        <div className={styles.pieWrapper}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={pieData} cx="50%" cy="50%" innerRadius="60%" outerRadius="85%" paddingAngle={6} dataKey="value" stroke="none">
                                        {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip formatter={(value) => formatCurrency(value) + ' đ'} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className={styles.legendWrapper}>
                            <div className={styles.legendItem}>
                                <span className={styles.legendBox} style={{ backgroundColor: '#0284c7' }}></span>
                                <span className={styles.legendText}>Thuê sân ({courtPercent}%)</span>
                            </div>
                            <div className={styles.legendItem}>
                                <span className={styles.legendBox} style={{ backgroundColor: '#38bdf8' }}></span>
                                <span className={styles.legendText}>POS ({posPercent}%)</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RevenueDashboard;