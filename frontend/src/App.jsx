import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import VoucherManagement from './pages/VoucherManagement';
// 1. Import các Layouts
import MainLayout from './layout/MainLayout';
import UserLayout from './layout/UserLayout';

// 2. Import các Pages của Anh Đại (Người 3)
import PosPage from './pages/PosPage';
import RevenueDashboard from './pages/RevenueDashboard';
import PaymentResult from './pages/PaymentResult';
import ProductManagement from './pages/ProductManagement';

// Component "Đang xây dựng" cho các trang chưa code
const Placeholder = ({ title }) => (
  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-white rounded-2xl shadow-sm border border-slate-100 p-10 m-6">
    <span className="material-symbols-outlined text-6xl mb-4 text-slate-200">construction</span>
    <h1 className="text-2xl font-bold text-slate-700">{title}</h1>
    <p className="mt-2 text-sm">Phần việc này đang được thiết kế hoặc dành cho thành viên khác.</p>
  </div>
);

function App() {
  return (
    <Routes>

      {/* ==========================================
          LUỒNG 1: KHÁCH HÀNG (Dùng UserLayout ngang)
          ========================================== */}
      <Route element={<UserLayout />}>
        <Route path="/" element={<Placeholder title="Trang chủ (Khách xem sân & chọn giờ)" />} />
        <Route path="/booking" element={<Placeholder title="Trang Đặt sân (Customer)" />} />
        <Route path="/history" element={<Placeholder title="Lịch sử giao dịch cá nhân" />} />
        <Route path="/profile" element={<Placeholder title="Trang cá nhân (User Profile)" />} />
      </Route>

      {/* ==========================================
          TRANG ĐỘC LẬP (Không cần Header hay Sidebar)
          ========================================== */}
      <Route path="/payment-result" element={<PaymentResult />} />

      {/* ==========================================
          LUỒNG 2: ADMIN & STAFF (Dùng MainLayout dọc)
          ========================================== */}
      <Route path="/admin" element={<MainLayout />}>
        {/* Mặc định vào /admin sẽ nhảy sang POS */}
        <Route index element={<Navigate to="pos" replace />} />

        {/* === PHẦN CỦA ANH ĐẠI (NGƯỜI 3) === */}
        <Route path="pos" element={<PosPage />} />
        <Route path="revenue" element={<RevenueDashboard />} />
        <Route path="products" element={<ProductManagement />} />
        <Route path="vouchers" element={<VoucherManagement />} />
        {/* === PHẦN CỦA NGƯỜI 1 === */}
        <Route path="bookings" element={<Placeholder title="Quản lý toàn bộ Lịch Đặt Sân (N1)" />} />

        {/* === PHẦN CỦA NGƯỜI 2 === */}
        <Route path="courts" element={<Placeholder title="Quản lý Cơ sở vật chất & Sân bãi (N2)" />} />
        <Route path="pricing" element={<Placeholder title="Cấu hình Bảng giá Động (N2)" />} />
      </Route>

      {/* ==========================================
          TRANG 404 NẾU GÕ SAI LINK
          ========================================== */}
      <Route path="*" element={<div className="p-10 text-center text-2xl font-bold">404 - Không tìm thấy trang</div>} />

    </Routes>
  );
}

export default App;