import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis,
    CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend
} from 'recharts';

const RevenueDashboard = () => {
    // 1. State quản lý bộ lọc thời gian
    const [timeRange, setTimeRange] = useState('1month'); // '7days', '1month', '1year'

    const [reportData, setReportData] = useState({
        totalCourt: 0,
        totalPos: 0,
        chartData: []
    });
    const [recentTransactions, setRecentTransactions] = useState([]);

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Gọi API với tham số timeRange (period) để backend trả đúng mảng dữ liệu
                const revRes = await axios.get(`http://localhost:5043/api/payments/revenue-report?period=${timeRange}&month=${currentMonth}&year=${currentYear}`);
                const data = revRes.data;

                let totalCourt = 0; let totalPos = 0;
                let chartArray = [];

                if (timeRange === '1year') {
                    // Xử lý mảng 12 tháng
                    chartArray = Array.from({ length: 12 }, (_, i) => {
                        const monthIndex = i; // 0 đến 11
                        const labelStr = `Tháng ${monthIndex + 1}`;

                        // Tìm data trùng khớp với tháng (Lưu ý: getMonth() trả về 0-11)
                        const courtMonth = data.courtRevenue?.find(c => new Date(c.date).getMonth() === monthIndex);
                        const posMonth = data.posRevenue?.find(p => new Date(p.date).getMonth() === monthIndex);

                        const courtVal = courtMonth ? courtMonth.total : 0;
                        const posVal = posMonth ? posMonth.total : 0;

                        totalCourt += courtVal;
                        totalPos += posVal;

                        return { label: labelStr, court: courtVal, pos: posVal, total: courtVal + posVal };
                    });
                }
                else if (timeRange === '7days') {
                    // Xử lý mảng 7 ngày gần nhất tính đến hôm nay
                    chartArray = Array.from({ length: 7 }, (_, i) => {
                        const d = new Date();
                        d.setDate(d.getDate() - (6 - i)); // Lùi về tối đa 6 ngày trước + ngày hôm nay
                        const labelStr = `${d.getDate()}/${d.getMonth() + 1}`;

                        const courtDay = data.courtRevenue?.find(c => {
                            const cDate = new Date(c.date);
                            return cDate.getDate() === d.getDate() && cDate.getMonth() === d.getMonth();
                        });
                        const posDay = data.posRevenue?.find(p => {
                            const pDate = new Date(p.date);
                            return pDate.getDate() === d.getDate() && pDate.getMonth() === d.getMonth();
                        });

                        const courtVal = courtDay ? courtDay.total : 0;
                        const posVal = posDay ? posDay.total : 0;

                        totalCourt += courtVal;
                        totalPos += posVal;

                        return { label: labelStr, court: courtVal, pos: posVal, total: courtVal + posVal };
                    });
                }
                else {
                    // Bản gốc: Xử lý mảng theo số ngày trong tháng hiện tại
                    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
                    chartArray = Array.from({ length: daysInMonth }, (_, i) => {
                        const dayStr = `${i + 1}/${currentMonth}`;
                        const courtDay = data.courtRevenue?.find(c => new Date(c.date).getDate() === i + 1);
                        const posDay = data.posRevenue?.find(p => new Date(p.date).getDate() === i + 1);

                        const courtVal = courtDay ? courtDay.total : 0;
                        const posVal = posDay ? posDay.total : 0;

                        totalCourt += courtVal;
                        totalPos += posVal;

                        return { label: dayStr, court: courtVal, pos: posVal, total: courtVal + posVal };
                    });
                }

                setReportData({ totalCourt, totalPos, chartData: chartArray });

                // 2. Gọi API Lịch sử giao dịch thật
                const txRes = await axios.get(`http://localhost:5043/api/payments/recent-transactions?limit=5`);
                setRecentTransactions(txRes.data);

            } catch (error) {
                console.error("Lỗi tải dữ liệu", error);
            }
        };
        fetchData();
    }, [timeRange, currentMonth, currentYear]);

    const formatCurrency = (amount) => new Intl.NumberFormat('vi-VN').format(amount);

    const totalRevenue = reportData.totalCourt + reportData.totalPos;
    const courtPercent = totalRevenue > 0 ? Math.round((reportData.totalCourt / totalRevenue) * 100) : 0;
    const posPercent = totalRevenue > 0 ? Math.round((reportData.totalPos / totalRevenue) * 100) : 0;

    const pieData = [
        { name: 'Thuê sân', value: reportData.totalCourt },
        { name: 'POS & Dịch vụ', value: reportData.totalPos }
    ];
    const COLORS = ['#0284c7', '#38bdf8']; // Cập nhật màu tươi hơn cho PieChart

    // Custom Tooltip cho biểu đồ chính
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white/95 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-slate-100">
                    <p className="font-bold text-slate-700 mb-2 border-b border-slate-100 pb-2">{label}</p>
                    {payload.map((entry, index) => (
                        <div key={index} className="flex items-center justify-between gap-6 py-1">
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></span>
                                <span className="text-sm text-slate-600 font-medium">{entry.name}</span>
                            </div>
                            <span className="text-sm font-bold text-slate-800">{formatCurrency(entry.value)} đ</span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC] h-full overflow-y-auto">
            <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 sticky top-0 z-10">
                <h1 className="text-xl font-extrabold text-slate-800">Báo cáo doanh thu</h1>
                <div className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
                    Cập nhật: {new Date().toLocaleDateString('vi-VN')}
                </div>
            </header>

            <div className="p-8 space-y-8 max-w-7xl mx-auto w-full">
                {/* 3 METRIC CARDS */}
                <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-slate-100 flex flex-col justify-between">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><span className="material-symbols-outlined">account_balance_wallet</span></div>
                            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">+100%</span>
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-slate-500 mb-1">Tổng doanh thu</h3>
                            <p className="text-3xl font-extrabold text-slate-800">{formatCurrency(totalRevenue)} <span className="text-lg font-medium text-slate-400">đ</span></p>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-slate-100 flex flex-col justify-between">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-sky-50 text-sky-600 rounded-xl"><span className="material-symbols-outlined">sports_tennis</span></div>
                            <span className="text-xs font-bold text-sky-600 bg-sky-50 px-2.5 py-1 rounded-full">{courtPercent}%</span>
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-slate-500 mb-1">Doanh thu thuê sân</h3>
                            <p className="text-3xl font-extrabold text-[#0284c7]">{formatCurrency(reportData.totalCourt)} <span className="text-lg font-medium opacity-60">đ</span></p>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-slate-100 flex flex-col justify-between">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><span className="material-symbols-outlined">shopping_basket</span></div>
                            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">{posPercent}%</span>
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-slate-500 mb-1">Doanh thu POS</h3>
                            <p className="text-3xl font-extrabold text-[#38bdf8]">{formatCurrency(reportData.totalPos)} <span className="text-lg font-medium opacity-60">đ</span></p>
                        </div>
                    </div>
                </section>

                {/* CHART CHÍNH */}
                <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                        <h2 className="text-lg font-bold text-slate-800">Biểu đồ thu nhập</h2>

                        {/* BỘ LỌC THỜI GIAN */}
                        <div className="flex bg-slate-100 p-1 rounded-lg">
                            <button
                                onClick={() => setTimeRange('7days')}
                                className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-all duration-200 ${timeRange === '7days' ? 'bg-white shadow-sm text-sky-600' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                7 Ngày
                            </button>
                            <button
                                onClick={() => setTimeRange('1month')}
                                className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-all duration-200 ${timeRange === '1month' ? 'bg-white shadow-sm text-sky-600' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                1 Tháng
                            </button>
                            <button
                                onClick={() => setTimeRange('1year')}
                                className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-all duration-200 ${timeRange === '1year' ? 'bg-white shadow-sm text-sky-600' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                1 Năm
                            </button>
                        </div>
                    </div>

                    <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={reportData.chartData} margin={{ top: 10, right: 0, bottom: 0, left: 20 }}>
                                {/* Khai báo màu Gradient */}
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

                {/* 2 CỘT DƯỚI CÙNG */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-10">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-bold text-slate-800 text-lg">Giao dịch gần đây</h3>
                            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-500 bg-emerald-50 px-2 py-1 rounded-md">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Real-time
                            </span>
                        </div>
                        <div className="space-y-3">
                            {recentTransactions.length === 0 ? (
                                <p className="text-sm text-slate-400 text-center py-8">Chưa có giao dịch nào.</p>
                            ) : (
                                recentTransactions.map((tx, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-slate-200">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-11 h-11 ${tx.bgColor || 'bg-slate-100'} rounded-full flex items-center justify-center ${tx.color || 'text-slate-600'}`}>
                                                <span className="material-symbols-outlined text-[22px]">{tx.icon || 'receipt'}</span>
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-800">{tx.description}</p>
                                                <p className="text-xs font-medium text-slate-400">{tx.timeAgo}</p>
                                            </div>
                                        </div>
                                        <p className="text-sm font-extrabold text-emerald-600">+{formatCurrency(tx.amount)}đ</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                        <h3 className="font-bold text-slate-800 text-lg mb-2">Cơ cấu nguồn thu</h3>
                        <p className="text-sm text-slate-500 mb-6">Tỉ trọng doanh thu theo từng hạng mục</p>
                        <div className="flex-1 flex items-center justify-center min-h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius="60%"
                                        outerRadius="85%"
                                        paddingAngle={6}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value) => formatCurrency(value) + ' đ'}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-4 flex items-center justify-center gap-8">
                            <div className="flex items-center gap-2">
                                <span className="w-4 h-4 rounded-md bg-[#0284c7]"></span>
                                <span className="text-sm font-bold text-slate-700">Thuê sân ({courtPercent}%)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-4 h-4 rounded-md bg-[#38bdf8]"></span>
                                <span className="text-sm font-bold text-slate-700">POS ({posPercent}%)</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RevenueDashboard;