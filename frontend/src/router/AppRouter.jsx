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
import BranchCourtManager from "../pages/Admin/BranchCourtManager/BranchCourtManager.jsx";

import PaymentResult from "../pages/Staff/PaymentResult/PaymentResult.jsx";
import AdminLogin from "../pages/Admin/AdminLogin/AdminLogin.jsx";
import AccountManager from "../pages/Admin/AccountManager/AccountManager.jsx";

const router = createBrowserRouter([
  // LUỒNG 1: KHÁCH HÀNG (Dùng UserLayout)

  // LUỒNG 2: CÁC TRANG XÁC THỰC & ĐỘC LẬP
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  { path: "/forgot-password", element: <ForgotPasswordPage /> },
  { path: "/payment-result", element: <PaymentResult /> },

  // LUỒNG 3: ADMIN (Bảo vệ bằng AdminProtectedRoute, dùng MainLayout dọc)
  {
    path: "/admin/login",
    element: <AdminLogin />,
  },
  {
    path: "/admin/branchcourtmanagement",
    element: (
      <AdminProtectedRoute>
        <BranchCourtManager />
      </AdminProtectedRoute>
    ),
  },
  {
    path: "/admin/user",
    element: (
      <AdminProtectedRoute>
        <AccountManager />
      </AdminProtectedRoute>
    ),
  },

  // LUỒNG 4: STAFF (Chứa POS, Revenue của anh Đại - Dùng MainLayout)

  // LUỒNG 5: TRANG LỖI 404 (Bắt tất cả các link gõ sai)
  { path: "*", element: <PageNotFound /> },
]);

const AppRouter = () => {
  return <RouterProvider router={router} />;
};

export default AppRouter;
