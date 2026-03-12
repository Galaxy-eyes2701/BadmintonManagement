import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

const AdminLayout = () => {
    const navigate = useNavigate();

    const menuItems = [
        { title: 'TỔNG QUAN & DOANH THU', isHeader: true },
        { path: '/admin', icon: 'dashboard', label: 'Tổng quan' },
        { path: '/admin/revenue', icon: 'monitoring', label: 'Báo cáo Doanh thu' },

        { title: 'KHO & MARKETING (N3)', isHeader: true },
        { path: '/admin/products', icon: 'inventory_2', label: 'Quản lý Kho / Nước' },
        { path: '/admin/vouchers', icon: 'local_activity', label: 'Mã Giảm giá' },

        { title: 'CƠ SỞ VẬT CHẤT & GIÁ (N2)', isHeader: true },
        { path: '/admin/courts', icon: 'stadium', label: 'Quản lý Sân bãi' },
        { path: '/admin/pricing', icon: 'payments', label: 'Cấu hình Giá động' },
    ];

    const handleLogout = () => {
        localStorage.removeItem("adminLoggedIn");
        navigate('/admin/login');
    };

    return (
        <div className="flex h-screen bg-slate-50 font-['Inter'] overflow-hidden">
            <aside className="w-64 bg-[#0f172a] text-slate-300 flex flex-col shadow-xl z-20 shrink-0">
                <div className="h-16 flex items-center px-6 bg-[#0B1221] border-b border-slate-800/50">
                    <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center mr-3 shadow-lg shadow-red-500/20">
                        <span className="material-symbols-outlined text-white text-sm">admin_panel_settings</span>
                    </div>
                    <span className="font-bold text-lg text-white tracking-wide">QUẢN TRỊ VIÊN</span>
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
                                end={item.path === '/admin'}
                                className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${isActive ? 'bg-red-500/10 text-red-400 font-semibold' : 'hover:bg-slate-800/50 hover:text-white'}`}
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

export default AdminLayout;