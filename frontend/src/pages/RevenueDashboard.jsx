import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';

const RevenueDashboard = () => {
    const [reportData, setReportData] = useState({
        totalCourt: 0,
        totalPos: 0,
        chartData: [],
        recentTransactions: []
    });

    const [loading, setLoading] = useState(true);
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    useEffect(() => {
        fetchRevenueData(currentMonth, currentYear);
    }, []);

    const fetchRevenueData = async (month, year) => {
        try {
            setLoading(true);
            // Gọi API Backend của bạn
            const response = await axios.get(`http://localhost:5281/api/payments/revenue-report?month=${month}&year=${year}`);
            const data = response.data;

            // Xử lý dữ liệu Backend trả về để nạp vào Recharts
            let totalCourt = 0;
            let totalPos = 0;

            // Tạo mảng 30 ngày để vẽ biểu đồ
            const daysInMonth = new Date(year, month, 0).getDate();
            const chartArray = Array.from({ length: daysInMonth }, (_, i) => {
                const dayStr = `${i + 1}/${month}`;

                // Tìm doanh thu sân của ngày này
                const courtDay = data.courtRevenue?.find(c => new Date(c.date).getDate() === i + 1);
                const courtTotal = courtDay ? courtDay.total / 1000000 : 0; // Chuyển sang đơn vị Triệu (M)
                if (courtDay) totalCourt += courtDay.total;

                // Tìm doanh thu POS của ngày này
                const posDay = data.posRevenue?.find(p => new Date(p.date).getDate() === i + 1);
                const posTotal = posDay ? posDay.total / 1000000 : 0; // Chuyển sang đơn vị Triệu (M)
                if (posDay) totalPos += posDay.total;

                return {
                    day: dayStr,
                    court: courtTotal,
                    pos: posTotal,
                    total: courtTotal + posTotal
                };
            });

            setReportData({
                totalCourt,
                totalPos,
                chartData: chartArray,
                recentTransactions: [] // Bạn có thể làm thêm API GetRecentTransactions sau
            });
        } catch (error) {
            console.error("Lỗi khi tải dữ liệu doanh thu:", error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    return (
        <div className="flex-1 overflow-y-auto bg-slate-50 text-slate-800 antialiased min-h-screen">
            {/* HEADER */}
            <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center sticky top-0 z-10">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Báo cáo doanh thu</h1>
                    <p className="text-sm text-slate-500">Phân tích tài chính chi tiết của trung tâm (Tháng {currentMonth}/{currentYear})</p>
                </div>
                <div className="flex items-center gap-4">
                    <button className="bg-white border border-slate-200 p-2 rounded-lg text-slate-600 hover:bg-slate-50">
                        Làm mới dữ liệu
                    </button>
                </div>
            </header>

            {/* METRICS SECTION */}
            <section className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
                    <div>
                        <span className="text-sm font-medium text-slate-500 uppercase tracking-wider">Tổng doanh thu</span>
                        <div className="flex items-baseline gap-2 mt-2">
                            <h2 className="text-3xl font-bold text-slate-900">
                                {formatCurrency(reportData.totalCourt + reportData.totalPos)}
                            </h2>
                        </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-50 text-xs text-slate-400">
                        Dữ liệu trực tiếp từ hệ thống
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
                    <div>
                        <span className="text-sm font-medium text-slate-500 uppercase tracking-wider">Doanh thu đặt sân</span>
                        <div className="flex items-baseline gap-2 mt-2">
                            <h2 className="text-3xl font-bold text-indigo-700">
                                {formatCurrency(reportData.totalCourt)}
                            </h2>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
                    <div>
                        <span className="text-sm font-medium text-slate-500 uppercase tracking-wider">Doanh thu POS</span>
                        <div className="flex items-baseline gap-2 mt-2">
                            <h2 className="text-3xl font-bold text-sky-600">
                                {formatCurrency(reportData.totalPos)}
                            </h2>
                        </div>
                    </div>
                </div>
            </section>

            {/* CHART SECTION */}
            <section className="px-8 pb-8">
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Biểu đồ doanh thu hàng ngày</h3>
                            <p className="text-sm text-slate-500">Đơn vị: Triệu VNĐ</p>
                        </div>
                    </div>

                    {loading ? (
                        <div className="h-[400px] flex items-center justify-center text-slate-500">Đang tải biểu đồ...</div>
                    ) : (
                        <div className="h-[400px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={reportData.chartData} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(value) => `${value}M`} dx={-10} />
                                    <Tooltip
                                        cursor={{ fill: '#f8fafc' }}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        formatter={(value) => [`${value.toFixed(2)} Triệu`, '']}
                                    />
                                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                                    <Bar dataKey="court" name="Doanh thu Đặt Sân" stackId="a" fill="#0c4a6e" radius={[0, 0, 4, 4]} barSize={20} />
                                    <Bar dataKey="pos" name="Doanh thu POS" stackId="a" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                                    <Line type="monotone" dataKey="total" name="Xu hướng Tổng" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, fill: '#fff', stroke: '#2563eb', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
};

export default RevenueDashboard;