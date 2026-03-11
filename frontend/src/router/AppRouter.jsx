import React from "react";
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from "react-router-dom";

// --- 2. Import Pages từ nhánh Main ---
import PageNotFound from "../pages/PageNotFound.jsx";
import AdminProtectedRoute from "./AdminProtectedRoute.jsx";
import LoginPage from "../pages/User/LoginPage/LoginPage.jsx";
import RegisterPage from "../pages/User/RegisterPage/RegisterPage.jsx";
import ForgotPasswordPage from "../pages/User/ForgotPasswordPage/ForgotPasswordPage.jsx";
import AdminHomePage from "../pages/AdminHomePage.jsx";
import UserHomePage from "../pages/User/UserHomePage/UserHomePage.jsx";
import StaffHomePage from "../pages/Staff/StaffHomePage/StaffHomePage.jsx";

// --- 3. Import Pages của Anh Đại ---
import PosPage from "../pages/Staff/PosPage/PosPage.jsx";
import RevenueDashboard from "../pages/Staff/RevenueDashboard/RevenueDashboard.jsx";
import PaymentResult from "../pages/Staff/PaymentResult/PaymentResult.jsx";
import ProductManagement from "../pages/Staff/ProductManagement/ProductManagement.jsx";
import VoucherManagement from "../pages/Staff/VoucherManagement/VoucherManagement.jsx";

const router = createBrowserRouter([
  // LUỒNG 1: KHÁCH HÀNG (Dùng UserLayout)

  // LUỒNG 2: CÁC TRANG XÁC THỰC & ĐỘC LẬP
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
    children: [{ index: true, element: <AdminHomePage /> }],
  },

  // LUỒNG 4: STAFF (Chứa POS, Revenue của anh Đại - Dùng MainLayout)

  // LUỒNG 5: TRANG LỖI 404 (Bắt tất cả các link gõ sai)
  { path: "*", element: <PageNotFound /> },
]);

const AppRouter = () => {
  return <RouterProvider router={router} />;
};

export default AppRouter;
