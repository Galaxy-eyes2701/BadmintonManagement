import React from "react";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";

import AdminLayout from "../layout/AdminLayout.jsx";
import StaffLayout from "../layout/StaffLayout.jsx";

import AdminProtectedRoute from "./AdminProtectedRoute.jsx";
import PageNotFound from "../pages/PageNotFound.jsx";
import LoginPage from "../pages/User/LoginPage/LoginPage.jsx";
import RegisterPage from "../pages/User/RegisterPage/RegisterPage.jsx";
import ForgotPasswordPage from "../pages/User/ForgotPasswordPage/ForgotPasswordPage.jsx";

// --- IMPORT CÁC TRANG CỦA STAFF (ĐÀI) ---
import StaffSchedule from "../pages/Staff/StaffSchedule/StaffSchedule.jsx";
import PosPage from "../pages/Staff/PosPage/PosPage.jsx";
import ProductManagement from "../pages/Staff/ProductManagement/ProductManagement.jsx";
import PaymentResult from "../pages/Staff/PaymentResult/PaymentResult.jsx";
import BookingManagement from "../pages/Staff/BookingManagement/BookingManagement.jsx";
import FixedSchedule from "../pages/Staff/FixedSchedule/FixedSchedule.jsx";
// --- IMPORT CÁC TRANG CỦA ADMIN (ĐỒNG) ---
// Tạm ẩn AdminHomePage vì bạn Đồng chưa đẩy file này lên hoặc sai đường dẫn
// import AdminHomePage from "../pages/AdminHomePage.jsx"; 
import AdminLogin from "../pages/Admin/AdminLogin/AdminLogin.jsx";
import BranchCourtManager from "../pages/Admin/BranchCourtManager/BranchCourtManager.jsx";
import AccountManager from "../pages/Admin/AccountManager/AccountManager.jsx";
import RevenueDashboard from "../pages/Staff/RevenueDashboard/RevenueDashboard.jsx";
import VoucherManagement from "../pages/Staff/VoucherManagement/VoucherManagement.jsx";

const router = createBrowserRouter([
  // 🟢 LUỒNG 1: KHÁCH HÀNG (HƯNG) - Tạm thời đẩy về trang Login vì chưa có giao diện
  {
    path: "/",
    element: <Navigate to="/login" replace />,
  },

  // 🔵 LUỒNG 2: XÁC THỰC
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  { path: "/forgot-password", element: <ForgotPasswordPage /> },
  { path: "/payment-result", element: <PaymentResult /> },

  // Trang Login Admin riêng của bạn Đồng code
  { path: "/admin/login", element: <AdminLogin /> },

  // 🟠 LUỒNG 3: NHÂN VIÊN LỄ TÂN (ĐÀI)
  {
    path: "/staff",
    element: (
      <AdminProtectedRoute>
        <StaffLayout />
      </AdminProtectedRoute>
    ),
    children: [
      // Đã mở khóa: Vào /staff tự động đẩy sang Lịch Sân Hôm Nay
      { index: true, element: <Navigate to="/staff/schedule" replace /> },
      { path: "schedule", element: <StaffSchedule /> },
      { path: "pos", element: <PosPage /> },
      { path: "products", element: <ProductManagement /> },
      { path: "bookings", element: <BookingManagement /> },
      { path: "fixed-schedules", element: <FixedSchedule /> },
    ],
  },

  // 🔴 LUỒNG 4: CHỦ SÂN / QUẢN LÝ (ĐỒNG)
  {
    path: "/admin",
    element: (
      <AdminProtectedRoute>
        <AdminLayout />
      </AdminProtectedRoute>
    ),
    children: [
      // Đã Tạm ẩn dòng này để không bị lỗi trắng trang (Crash app)
      // { index: true, element: <AdminHomePage /> }, 
      { path: "revenue", element: <RevenueDashboard /> },
      { path: "vouchers", element: <VoucherManagement /> },
      { path: "branchcourtmanagement", element: <BranchCourtManager /> },
      { path: "user", element: <AccountManager /> },
    ],
  },

  { path: "*", element: <PageNotFound /> },
]);

const AppRouter = () => {
  return <RouterProvider router={router} />;
};

export default AppRouter;