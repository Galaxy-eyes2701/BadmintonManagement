import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
const StaffLayout = () => {

    const menuItems = [
        { title: 'NGHIỆP VỤ ĐẶT SÂN', isHeader: true },
        { path: '/staff/schedule', icon: 'calendar_today', label: 'Lịch Sân Hôm Nay' },
        { path: '/staff/bookings', icon: 'list_alt', label: 'Tạo & Quản lý Booking' },
        { path: '/staff/fixed-schedules', icon: 'event_repeat', label: 'Lịch Cố Định (Khách ruột)' },

        { title: 'BÁN HÀNG & THU TIỀN', isHeader: true },
        { path: '/staff/pos', icon: 'point_of_sale', label: 'Máy POS Bán hàng' },
        { path: '/staff/products', icon: 'inventory_2', label: 'Quản lý Kho Nước' },
    ];

    const handleLogout = () => {
        localStorage.removeItem("adminLoggedIn");
        window.location.href = '/admin/login';
    };

    return (
        <div className="flex h-screen bg-slate-50 font-['Inter'] overflow-hidden">
            <aside className="w-64 bg-[#0f172a] text-slate-300 flex flex-col shadow-xl z-20 shrink-0">
                <div className="h-16 flex items-center px-6 bg-[#0B1221] border-b border-slate-800/50">
                    <div className="w-8 h-8 bg-[#10b981] rounded-lg flex items-center justify-center mr-3 shadow-lg shadow-[#10b981]/20">
                        <span className="material-symbols-outlined text-white text-sm">support_agent</span>
                    </div>
                    <span className="font-bold text-lg text-white tracking-wide">NHÂN VIÊN</span>
                </div>

                <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1 custom-scrollbar">
                    {menuItems.map((item, index) => {
                        if (item.isHeader) {
                            return <div key={index} className="text-[10px] font-bold text-slate-500 tracking-wider uppercase mt-6 mb-2 px-3">{item.title}</div>;
                        }
                        return (
                            <NavLink
                                key={index}
                                to={item.path}
                                className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${isActive ? 'bg-[#10b981]/10 text-[#10b981] font-semibold' : 'hover:bg-slate-800/50 hover:text-white'}`}
                            >
                                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                                <span className="text-sm">{item.label}</span>
                            </NavLink>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-slate-800/50">
                    <div onClick={handleLogout} className="flex items-center gap-3 px-3 py-2 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer transition-colors">
                        <span className="material-symbols-outlined text-[20px]">logout</span>
                        <span className="text-sm font-semibold">Đăng xuất</span>
                    </div>
                </div>
            </aside>

            <main className="flex-1 flex flex-col relative overflow-hidden bg-[#F8FAFC]">
                <Outlet />
            </main>
        </div>
    );
};

export default StaffLayout;