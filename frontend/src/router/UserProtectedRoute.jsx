import { Navigate } from "react-router-dom";
import useAuth from "../hooks/useAuth.jsx";

const UserProtectedRoute = ({ children, requireAuth = true }) => {
  const auth = useAuth();

  // Nếu không yêu cầu đăng nhập (trang public như homepage) → cho phép truy cập
  if (!requireAuth) {
    // Nếu là admin/staff → redirect về trang tương ứng
    const role = auth?.role;
    if (role === "Admin") return <Navigate to="/admin/branchcourtmanagement" replace />;
    if (role === "Staff") return <Navigate to="/staff/schedule" replace />;
    return children;
  }

  // Nếu chưa đăng nhập → về trang login
  if (!auth?.isAuthenticated || !auth?.token) {
    return <Navigate to="/login" replace />;
  }

  // Nếu là admin/staff → redirect về trang tương ứng
  const role = auth?.role;
  if (role === "Admin") return <Navigate to="/admin/branchcourtmanagement" replace />;
  if (role === "Staff") return <Navigate to="/staff/schedule" replace />;

  return children;
};

export default UserProtectedRoute;