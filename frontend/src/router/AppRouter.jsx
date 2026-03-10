import React from "react";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";

// --- 1. Import Layouts ---
import MainLayout from "../layout/MainLayout.jsx";
import UserLayout from "../layout/UserLayout.jsx";

// --- 2. Import Pages từ nhánh Main ---
import PageNotFound from "../pages/PageNotFound.jsx";
import AdminProtectedRoute from "./AdminProtectedRoute.jsx";
import LoginPage from "../pages/LoginPage.jsx";
import RegisterPage from "../pages/RegisterPage.jsx";
import ForgotPasswordPage from "../pages/ForgotPasswordPage.jsx";
import AdminHomePage from "../pages/AdminHomePage.jsx";
import UserHomePage from "../pages/UserHomePage.jsx";
import StaffHomePage from "../pages/StaffHomePage.jsx";

// --- 3. Import Pages của Anh Đại ---
import PosPage from "../pages/PosPage.jsx";
import RevenueDashboard from "../pages/RevenueDashboard.jsx";
import PaymentResult from "../pages/PaymentResult.jsx";
import ProductManagement from "../pages/ProductManagement.jsx";
import VoucherManagement from "../pages/VoucherManagement.jsx";

// Component Placeholder cho các trang chưa code
const Placeholder = ({ title }) => (
  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-white rounded-2xl shadow-sm border border-slate-100 p-10 m-6">
    <span className="material-symbols-outlined text-6xl mb-4 text-slate-200">construction</span>
    <h1 className="text-2xl font-bold text-slate-700">{title}</h1>
    <p className="mt-2 text-sm">Phần việc này đang được thiết kế hoặc dành cho thành viên khác.</p>
  </div>
);

// ==========================================
// CẤU HÌNH ROUTER THEO CHUẨN MỚI
// ==========================================
const router = createBrowserRouter([
  // LUỒNG 1: KHÁCH HÀNG (Dùng UserLayout)
  {
    path: "/",
    element: <UserLayout />, // Bọc giao diện Header/Footer của user
    children: [
      { index: true, element: <UserHomePage /> }, // Trang chủ user từ main
      { path: "booking", element: <Placeholder title="Trang Đặt sân (Customer)" /> },
      { path: "history", element: <Placeholder title="Lịch sử giao dịch cá nhân" /> },
      { path: "profile", element: <Placeholder title="Trang cá nhân (User Profile)" /> },
    ],
  },

  // LUỒNG 2: CÁC TRANG XÁC THỰC & ĐỘC LẬP (Không cần Layout)
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  { path: "/forgot-password", element: <ForgotPasswordPage /> },
  { path: "/admin/login", element: <LoginPage isAdmin /> },
  { path: "/payment-result", element: <PaymentResult /> },

  // LUỒNG 3: ADMIN (Bảo vệ bằng AdminProtectedRoute, dùng MainLayout dọc)
  {
    path: "/admin",
    element: (
      <AdminProtectedRoute>
        <MainLayout />
      </AdminProtectedRoute>
    ),
    children: [
      { index: true, element: <AdminHomePage /> },
    ],
  },

  // LUỒNG 4: STAFF (Chứa POS, Revenue của anh Đại - Dùng MainLayout)
  {
    path: "/staff",
    element: <MainLayout />,
    children: [
      { index: true, element: <Navigate to="pos" replace /> }, // Mặc định vào staff nhảy sang POS
      { path: "home", element: <StaffHomePage /> }, // Dashboard chung từ main

      // --- Phần của Anh Đại ---
      { path: "pos", element: <PosPage /> },
      { path: "revenue", element: <RevenueDashboard /> },
      { path: "products", element: <ProductManagement /> },
      { path: "vouchers", element: <VoucherManagement /> },

      // --- Phần của thành viên khác ---
      { path: "bookings", element: <Placeholder title="Quản lý toàn bộ Lịch Đặt Sân (N1)" /> },
      { path: "courts", element: <Placeholder title="Quản lý Cơ sở vật chất & Sân bãi (N2)" /> },
      { path: "pricing", element: <Placeholder title="Cấu hình Bảng giá Động (N2)" /> },
    ],
  },

  // LUỒNG 5: TRANG LỖI 404 (Bắt tất cả các link gõ sai)
  { path: "*", element: <PageNotFound /> },
]);

const AppRouter = () => {
  return <RouterProvider router={router} />;
};

export default AppRouter;