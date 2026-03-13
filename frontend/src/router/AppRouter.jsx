import React from "react";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";

import AdminLayout from "../layout/AdminLayout.jsx";
import StaffLayout from "../layout/StaffLayout.jsx";
import MainLayout from "../layout/MainLayout.jsx";
import UserLayout from "../layout/UserLayout.jsx";

import AdminProtectedRoute from "./AdminProtectedRoute.jsx";
import UserProtectedRoute from "./UserProtectedRoute.jsx";
import PageNotFound from "../pages/PageNotFound.jsx";

// ── AUTH PAGES ──
import LoginPage from "../pages/User/LoginPage/LoginPage.jsx";
import RegisterPage from "../pages/User/RegisterPage/RegisterPage.jsx";
import ForgotPasswordPage from "../pages/User/ForgotPasswordPage/ForgotPasswordPage.jsx";

// ── USER PAGES ──
import UserHomePage from "../pages/User/UserHomePage/UserHomePage.jsx";
import CourtBookingPage from "../pages/User/CourtBookingPage/CourtBookingPage.jsx";
import BookingHistoryPage from "../pages/User/BookingHistoryPage/BookingHistoryPage.jsx";
import UserProfilePage from "../pages/User/UserProfilePage/UserProfilePage.jsx";

// ── STAFF PAGES ──
import StaffSchedule from "../pages/Staff/StaffSchedule/StaffSchedule.jsx";
import PosPage from "../pages/Staff/PosPage/PosPage.jsx";
import ProductManagement from "../pages/Staff/ProductManagement/ProductManagement.jsx";
import PaymentResult from "../pages/Staff/PaymentResult/PaymentResult.jsx";
import BookingManagement from "../pages/Staff/BookingManagement/BookingManagement.jsx";
import FixedSchedule from "../pages/Staff/FixedSchedule/FixedSchedule.jsx";

// ── ADMIN PAGES ──
import AdminLogin from "../pages/Admin/AdminLogin/AdminLogin.jsx";
import BranchCourtManager from "../pages/Admin/BranchCourtManager/BranchCourtManager.jsx";
import AccountManager from "../pages/Admin/AccountManager/AccountManager.jsx";
import RevenueDashboard from "../pages/Staff/RevenueDashboard/RevenueDashboard.jsx";
import VoucherManagement from "../pages/Staff/VoucherManagement/VoucherManagement.jsx";

const router = createBrowserRouter([
  // ROOT → redirect to login
  {
    path: "/",
    element: <Navigate to="/login" replace />,
  },

  // ── AUTH ──
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  { path: "/forgot-password", element: <ForgotPasswordPage /> },
  { path: "/payment-result", element: <PaymentResult /> },

  // ── USER (yêu cầu đăng nhập) ──
  {
    path: "/user",
    element: (
      <UserProtectedRoute>
        <UserLayout />
      </UserProtectedRoute>
    ),
    children: [
      { index: true, element: <UserHomePage /> },
      { path: "booking", element: <CourtBookingPage /> },
      { path: "history", element: <BookingHistoryPage /> },
      { path: "profile", element: <UserProfilePage /> },
    ],
  },

  // ── ADMIN LOGIN riêng ──
  { path: "/admin/login", element: <AdminLogin /> },

  // ── STAFF ──
  {
    path: "/staff",
    element: (
      <AdminProtectedRoute>
        <StaffLayout />
      </AdminProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/staff/schedule" replace /> },
      { path: "schedule", element: <StaffSchedule /> },
      { path: "pos", element: <PosPage /> },
      { path: "products", element: <ProductManagement /> },
      { path: "bookings", element: <BookingManagement /> },
      { path: "fixed-schedules", element: <FixedSchedule /> },
    ],
  },

  // ── ADMIN ──
  {
    path: "/admin",
    element: (
      <AdminProtectedRoute>
        <AdminLayout />
      </AdminProtectedRoute>
    ),
    children: [
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