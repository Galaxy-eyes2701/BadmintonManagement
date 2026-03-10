import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';

const MainLayout = () => {
  const menuItems = [
    { title: 'TỔNG QUAN & BÁN HÀNG (N3)', isHeader: true },
    { path: '/staff/pos', icon: 'point_of_sale', label: 'Máy POS Bán hàng' },
    { path: '/staff/revenue', icon: 'monitoring', label: 'Báo cáo Doanh thu' },
    { path: '/staff/products', icon: 'inventory_2', label: 'Quản lý Kho / Nước' },
    { path: '/staff/vouchers', icon: 'local_activity', label: 'Mã Giảm giá' },

    { title: 'NGHIỆP VỤ ĐẶT SÂN (N1)', isHeader: true },
    { path: '/staff/bookings', icon: 'calendar_month', label: 'Quản lý Booking' },

    { title: 'CƠ SỞ VẬT CHẤT & GIÁ (N2)', isHeader: true },
    { path: '/staff/courts', icon: 'stadium', label: 'Quản lý Sân bãi' },
    { path: '/staff/pricing', icon: 'payments', label: 'Cấu hình Giá động' },
  ];

  return (
    <div className="flex h-screen bg-slate-50 font-['Inter'] overflow-hidden">
      <aside className="w-64 bg-[#0f172a] text-slate-300 flex flex-col shadow-xl z-20 shrink-0">
        <div className="h-16 flex items-center px-6 bg-[#0B1221] border-b border-slate-800/50">
          <div className="w-8 h-8 bg-[#38bdf8] rounded-lg flex items-center justify-center mr-3">
            <span className="material-symbols-outlined text-white text-sm">sports_tennis</span>
          </div>
          <span className="font-bold text-lg text-white tracking-wide">SMASH HUB</span>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
          {menuItems.map((item, index) => {
            if (item.isHeader) {
              return <div key={index} className="text-[10px] font-bold text-slate-500 tracking-wider uppercase mt-6 mb-2 px-3">{item.title}</div>;
            }
            return (
              <NavLink
                key={index}
                to={item.path}
                className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${isActive ? 'bg-[#38bdf8]/10 text-[#38bdf8] font-semibold' : 'hover:bg-slate-800/50 hover:text-white'}`}
              >
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                <span className="text-sm">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>

      {/* KHU VỰC HIỂN THỊ NỘI DUNG CHÍNH NẰM Ở ĐÂY */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-[#F8FAFC]">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;