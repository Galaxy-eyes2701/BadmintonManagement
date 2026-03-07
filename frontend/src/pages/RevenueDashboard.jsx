import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts';

const RevenueDashboard = () => {
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
                // 1. Gọi API Doanh thu
                const revRes = await axios.get(`http://localhost:5043/api/payments/revenue-report?month=${currentMonth}&year=${currentYear}`);
                const data = revRes.data;

                let totalCourt = 0; let totalPos = 0;
                const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
                const chartArray = Array.from({ length: daysInMonth }, (_, i) => {
                    const dayStr = `${i + 1}/${currentMonth}`;
                    const courtDay = data.courtRevenue?.find(c => new Date(c.date).getDate() === i + 1);
                    const posDay = data.posRevenue?.find(p => new Date(p.date).getDate() === i + 1);

                    const courtVal = courtDay ? courtDay.total : 0;
                    const posVal = posDay ? posDay.total : 0;

                    totalCourt += courtVal;
                    totalPos += posVal;

                    return { day: dayStr, court: courtVal, pos: posVal, total: courtVal + posVal };
                });

                setReportData({ totalCourt, totalPos, chartData: chartArray });

                // 2. Gọi API Lịch sử giao dịch thật
                const txRes = await axios.get(`http://localhost:5043/api/payments/recent-transactions?limit=5`);
                setRecentTransactions(txRes.data);

            } catch (error) {
                console.error("Lỗi tải dữ liệu", error);
            }
        };
        fetchData();
    }, [currentMonth, currentYear]);

    const formatCurrency = (amount) => new Intl.NumberFormat('vi-VN').format(amount);

    const totalRevenue = reportData.totalCourt + reportData.totalPos;
    const courtPercent = totalRevenue > 0 ? Math.round((reportData.totalCourt / totalRevenue) * 100) : 0;
    const posPercent = totalRevenue > 0 ? Math.round((reportData.totalPos / totalRevenue) * 100) : 0;

    const pieData = [
        { name: 'Thuê sân', value: reportData.totalCourt },
        { name: 'POS & Dịch vụ', value: reportData.totalPos }
    ];
    const COLORS = ['#0c4a6e', '#0ea5e9'];

    return (
        // Đã xóa thẻ bọc <div className="flex..."> và <aside> thừa ở đây
        <div className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC] h-full overflow-y-auto">
            {/* Phần Header chỉ chứa Tiêu đề của trang con */}
            <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
                <h1 className="text-lg font-bold text-slate-800">Báo cáo doanh thu tài chính</h1>
                <div className="text-sm font-medium text-gray-500">Tháng {currentMonth}/{currentYear}</div>
            </header>

            <div className="p-8 space-y-8 max-w-7xl mx-auto w-full">
                {/* 3 METRIC CARDS */}
                <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><span className="material-symbols-outlined">account_balance_wallet</span></div>
                            <span className="text-xs font-bold text-green-500 bg-green-50 px-2 py-1 rounded-full">+100%</span>
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-slate-500 mb-1">Tổng doanh thu</h3>
                            <p className="text-3xl font-bold text-slate-800">{formatCurrency(totalRevenue)} <span className="text-lg">đ</span></p>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-sky-50 text-sky-600 rounded-lg"><span className="material-symbols-outlined">sports_tennis</span></div>
                            <span className="text-xs font-bold text-sky-500 bg-sky-50 px-2 py-1 rounded-full">{courtPercent}%</span>
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-slate-500 mb-1">Doanh thu thuê sân</h3>
                            <p className="text-3xl font-bold text-[#0c4a6e]">{formatCurrency(reportData.totalCourt)} <span className="text-lg">đ</span></p>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><span className="material-symbols-outlined">shopping_basket</span></div>
                            <span className="text-xs font-bold text-indigo-500 bg-indigo-50 px-2 py-1 rounded-full">{posPercent}%</span>
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-slate-500 mb-1">Doanh thu POS</h3>
                            <p className="text-3xl font-bold text-[#0ea5e9]">{formatCurrency(reportData.totalPos)} <span className="text-lg">đ</span></p>
                        </div>
                    </div>
                </section>

                {/* CHART CHÍNH */}
                <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-xl font-bold text-slate-800">Biểu đồ thu nhập hàng ngày</h2>
                    </div>
                    <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={reportData.chartData} margin={{ top: 10, right: 0, bottom: 0, left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dx={-10} tickFormatter={(value) => `${value / 1000}k`} />
                                <Tooltip formatter={(value) => formatCurrency(value) + ' đ'} />
                                <Bar dataKey="court" name="Thuê sân" stackId="a" fill="#0c4a6e" radius={[0, 0, 4, 4]} barSize={12} />
                                <Bar dataKey="pos" name="POS" stackId="a" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                                <Line type="monotone" dataKey="total" name="Tổng" stroke="#38bdf8" strokeWidth={3} dot={false} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </section>

                {/* 2 CỘT DƯỚI CÙNG */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-10">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <h3 className="font-bold text-slate-800 mb-6">Giao dịch gần đây (Real-time)</h3>
                        <div className="space-y-4">
                            {recentTransactions.length === 0 ? (
                                <p className="text-sm text-slate-400 text-center py-4">Chưa có giao dịch nào.</p>
                            ) : (
                                recentTransactions.map((tx, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition cursor-pointer border border-transparent hover:border-slate-100">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 ${tx.bgColor} rounded-full flex items-center justify-center ${tx.color}`}>
                                                <span className="material-symbols-outlined text-xl">{tx.icon}</span>
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-800">{tx.description}</p>
                                                <p className="text-xs text-slate-500">{tx.timeAgo}</p>
                                            </div>
                                        </div>
                                        <p className="text-sm font-bold text-slate-800">+{formatCurrency(tx.amount)}đ</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                        <h3 className="font-bold text-slate-800 mb-2">Cơ cấu nguồn thu</h3>
                        <div className="flex-1 flex items-center justify-center min-h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius="60%"
                                        outerRadius="80%"
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip formatter={(value) => formatCurrency(value) + ' đ'} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-4">
                            <div className="flex items-center justify-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-[#0c4a6e]"></span>
                                <span className="text-xs font-semibold text-slate-600">Thuê sân ({courtPercent}%)</span>
                            </div>
                            <div className="flex items-center justify-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-[#0ea5e9]"></span>
                                <span className="text-xs font-semibold text-slate-600">POS ({posPercent}%)</span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default RevenueDashboard;