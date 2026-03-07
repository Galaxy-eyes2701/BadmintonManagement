import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Import các Layouts
import MainLayout from './layout/MainLayout';
import UserLayout from './layout/UserLayout';

// Import các Pages của Anh Đại (Người 3)
import PosPage from './pages/PosPage';
import RevenueDashboard from './pages/RevenueDashboard';
import PaymentResult from './pages/PaymentResult';

const Placeholder = ({ title }) => (
  <div className="w-full min-h-[50vh] flex flex-col items-center justify-center text-slate-400 bg-white rounded-2xl shadow-sm border border-slate-100 p-10">
    <span className="material-symbols-outlined text-6xl mb-4 text-slate-200">construction</span>
    <h1 className="text-2xl font-bold text-slate-700">{title}</h1>
  </div>
);

function App() {
  return (
    <Routes>
      <Route element={<UserLayout />}>
        <Route path="/" element={<Placeholder title="Trang chủ (Khách xem sân & chọn giờ)" />} />
      </Route>

      <Route path="/payment-result" element={<PaymentResult />} />

      <Route path="/admin" element={<MainLayout />}>
        <Route index element={<Navigate to="pos" replace />} />
        <Route path="pos" element={<PosPage />} />
        <Route path="revenue" element={<RevenueDashboard />} />
        <Route path="products" element={<Placeholder title="Quản lý Kho Hàng & Nước uống (N3)" />} />
        <Route path="vouchers" element={<Placeholder title="Quản lý Mã Giảm Giá (N3)" />} />
        <Route path="bookings" element={<Placeholder title="Quản lý toàn bộ Lịch Đặt Sân (N1)" />} />
        <Route path="courts" element={<Placeholder title="Quản lý Cơ sở vật chất & Sân bãi (N2)" />} />
        <Route path="pricing" element={<Placeholder title="Cấu hình Bảng giá Động (N2)" />} />
      </Route>

      <Route path="*" element={<div className="p-10 text-center text-2xl font-bold">404 - Không tìm thấy trang</div>} />
    </Routes>
  );
}

export default App;