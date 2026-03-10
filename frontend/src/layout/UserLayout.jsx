import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';

const UserLayout = () => {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-['Inter']">
            {/* HEADER NẰM NGANG CHO KHÁCH HÀNG */}
            <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">

                        {/* Logo */}
                        <div className="flex items-center gap-2 cursor-pointer">
                            <div className="w-8 h-8 bg-[#0ea5e9] rounded-lg flex items-center justify-center">
                                <span className="material-symbols-outlined text-white text-sm">sports_tennis</span>
                            </div>
                            <span className="font-bold text-xl text-slate-800 tracking-tight">SMASH HUB</span>
                        </div>

                        {/* Menu điều hướng ngang */}
                        <nav className="hidden md:flex space-x-8">
                            <NavLink to="/" className={({ isActive }) => isActive ? "text-[#0ea5e9] font-bold border-b-2 border-[#0ea5e9] pb-1" : "text-slate-600 hover:text-[#0ea5e9] font-medium transition-colors"}>
                                Trang chủ
                            </NavLink>
                            <NavLink to="/booking" className={({ isActive }) => isActive ? "text-[#0ea5e9] font-bold border-b-2 border-[#0ea5e9] pb-1" : "text-slate-600 hover:text-[#0ea5e9] font-medium transition-colors"}>
                                Đặt sân
                            </NavLink>
                            <NavLink to="/history" className={({ isActive }) => isActive ? "text-[#0ea5e9] font-bold border-b-2 border-[#0ea5e9] pb-1" : "text-slate-600 hover:text-[#0ea5e9] font-medium transition-colors"}>
                                Lịch sử
                            </NavLink>
                        </nav>

                        {/* Nút Đăng nhập / Đăng ký */}
                        <div className="flex items-center gap-4">
                            <button className="text-slate-600 hover:text-slate-900 font-medium text-sm">Đăng nhập</button>
                            <button className="bg-[#0ea5e9] hover:bg-[#0284c7] text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm">Đăng ký</button>
                        </div>

                    </div>
                </div>
            </header>

            {/* NỘI DUNG CHÍNH CỦA KHÁCH HÀNG (Người 1 và 2 sẽ nhét trang của họ vào đây) */}
            <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8">
                <Outlet />
            </main>

            {/* FOOTER */}
            <footer className="bg-slate-900 text-slate-400 py-8 text-center text-sm mt-auto">
                <p>© 2026 Smash Hub Badminton Center. All rights reserved.</p>
                <p className="mt-2 text-xs text-slate-500">Hệ thống đặt sân cầu lông hàng đầu Việt Nam.</p>
            </footer>
        </div>
    );
};

export default UserLayout;