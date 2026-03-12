import React from "react";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";

import AdminLayout from "../layout/AdminLayout.jsx";
import StaffLayout from "../layout/StaffLayout.jsx";
import UserLayout from "../layout/UserLayout.jsx";

import AdminProtectedRoute from "./AdminProtectedRoute.jsx";
import PageNotFound from "../pages/PageNotFound.jsx";
import LoginPage from "../pages/User/LoginPage/LoginPage.jsx";
import RegisterPage from "../pages/User/RegisterPage/RegisterPage.jsx";
import ForgotPasswordPage from "../pages/User/ForgotPasswordPage/ForgotPasswordPage.jsx";
import AdminHomePage from "../pages/Admin/AdminHomePage/AdminHomePage.jsx";
import UserHomePage from "../pages/User/UserHomePage/UserHomePage.jsx";

// --- IMPORT CÁC TRANG CỦA STAFF (ĐÀI) ---
import StaffSchedule from "../pages/Staff/StaffSchedule/StaffSchedule.jsx";
import PosPage from "../pages/Staff/PosPage/PosPage.jsx";
import ProductManagement from "../pages/Staff/ProductManagement/ProductManagement.jsx";
import PaymentResult from "../pages/Staff/PaymentResult/PaymentResult.jsx";
import BookingManagement from "../pages/Staff/BookingManagement/BookingManagement.jsx";
// --- IMPORT CÁC TRANG CỦA ADMIN (ĐỒNG) ---
import RevenueDashboard from "../pages/Staff/RevenueDashboard/RevenueDashboard.jsx"; // Nhớ move thư mục này sang Admin sau nhé
import VoucherManagement from "../pages/Staff/VoucherManagement/VoucherManagement.jsx"; // Move sang Admin

const router = createBrowserRouter([
  // 🟢 LUỒNG 1: KHÁCH HÀNG (HƯNG)
  {
    path: "/",
    element: <UserLayout />,
    children: [
      { index: true, element: <UserHomePage /> }
    ],
  },

  // 🔵 LUỒNG 2: XÁC THỰC
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  { path: "/forgot-password", element: <ForgotPasswordPage /> },
  { path: "/admin/login", element: <LoginPage isAdmin /> },
  { path: "/payment-result", element: <PaymentResult /> },

  // 🟠 LUỒNG 3: NHÂN VIÊN LỄ TÂN (ĐÀI)
  {
    path: "/staff",
    element: (
      <AdminProtectedRoute>
        <StaffLayout />
      </AdminProtectedRoute>
    ),
    children: [
      // Vào /staff tự động đẩy sang Lịch Sân Hôm Nay
      { index: true, element: <Navigate to="/staff/schedule" replace /> },
      { path: "schedule", element: <StaffSchedule /> },
      { path: "pos", element: <PosPage /> },
      { path: "products", element: <ProductManagement /> },
      // 2 trang dưới đây anh sẽ code tiếp:
      { path: "bookings", element: <BookingManagement /> },
      // { path: "fixed-schedules", element: <FixedScheduleStaff /> },
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
      { index: true, element: <AdminHomePage /> },
      { path: "revenue", element: <RevenueDashboard /> },
      { path: "vouchers", element: <VoucherManagement /> },
      // { path: "courts", element: <CourtManagement /> },
      // { path: "pricing", element: <PricingManagement /> },
    ],
  },

  { path: "*", element: <PageNotFound /> },
]);

const AppRouter = () => {
  return <RouterProvider router={router} />;
};

export default AppRouter;