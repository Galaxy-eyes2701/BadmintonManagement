import React from "react";
import { Navigate } from "react-router-dom";
import useAuth from "../hooks/useAuth.jsx";

const AdminProtectedRoute = ({ children }) => {
  // Lấy trạng thái đăng nhập THẬT (API) từ AuthContext
  const { isAuthenticated, role } = useAuth();

  // Lấy trạng thái đăng nhập GIẢ LẬP (Demo của admin)
  const isDemoAdmin = localStorage.getItem("adminLoggedIn") === "true";

  // 1. Nếu KHÔNG CÓ CẢ 2 loại đăng nhập -> Đá về trang đăng nhập
  if (!isAuthenticated && !isDemoAdmin) {
    return <Navigate to="/login" replace />;
  }

  // 2. BẢO MẬT BỔ SUNG: Khách hàng (Customer) không được phép chui vào link của Staff/Admin
  if (isAuthenticated && role === "Customer") {
    return <Navigate to="/user" replace />;
  }

  // Nếu hợp lệ (Staff hoặc Admin) thì cho phép đi tiếp vào giao diện
  return children;
};

export default AdminProtectedRoute;