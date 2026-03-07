import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth.jsx";
import api from "../utils/api";

const LoginPage = ({ isAdmin = false }) => {
  const navigate = useNavigate();
  const auth = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (isAdmin) {
      // Tài khoản admin cố định (demo)
      if (username === "admin" && password === "123456") {
        localStorage.setItem("adminLoggedIn", "true");
        auth?.login?.("admin", "admin");
        navigate("/admin");
      } else {
        setError("Sai tài khoản hoặc mật khẩu admin (gợi ý: admin / 123456).");
      }
      return;
    }

    if (!username || !password) {
      setError("Vui lòng nhập đầy đủ tài khoản và mật khẩu.");
      return;
    }

    try {
      setLoading(true);

      // Backend đang dùng Phone + Password
      const response = await api.post("/Auth/login", {
        phone: username,
        password,
      });

      const data = response.data;
      const token = data.token || data.Token;
      const user = data.user || data.User;

      if (!token || !user) {
        setError("Phản hồi đăng nhập không hợp lệ từ server.");
        return;
      }

      auth?.loginWithToken?.(token, user);

      const role = user.role || user.Role;
      if (role === "Admin") {
        navigate("/admin");
      } else if (role === "Staff") {
        navigate("/staff");
      } else {
        navigate("/user");
      }
    } catch (err) {
      const message =
        err.response?.data?.message ||
        "Đăng nhập thất bại. Vui lòng kiểm tra lại tài khoản/mật khẩu.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bm-auth-page">
      <div className="bm-auth-card">
        <div className="bm-auth-header">
          <h1>{isAdmin ? "Đăng nhập Admin" : "Đăng nhập"}</h1>
          <p>
            {isAdmin
              ? "Truy cập bảng điều khiển quản trị hệ thống."
              : "Quản lý sân, lịch đặt và thành viên dễ dàng."}
          </p>
        </div>

        <form className="bm-auth-form" onSubmit={handleSubmit}>
          <div className="bm-form-group">
              <label>Số điện thoại</label>
            <input
              type="text"
              placeholder={isAdmin ? "admin" : "Nhập số điện thoại"}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="bm-form-group">
            <label>Mật khẩu</label>
            <input
              type="password"
              placeholder={isAdmin ? "123456" : "Nhập mật khẩu"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <div className="bm-form-error">{error}</div>}

          <button
            type="submit"
            className="bm-btn-primary bm-btn-block"
            disabled={loading}
          >
            {loading
              ? "Đang xử lý..."
              : isAdmin
                ? "Đăng nhập Admin"
                : "Đăng nhập"}
          </button>
        </form>

        {!isAdmin && (
          <div className="bm-auth-links">
            <button
              type="button"
              className="bm-link-button"
              onClick={() => navigate("/forgot-password")}
            >
              Quên mật khẩu?
            </button>
            <span>•</span>
            <button
              type="button"
              className="bm-link-button"
              onClick={() => navigate("/register")}
            >
              Tạo tài khoản mới
            </button>
          </div>
        )}

        {isAdmin && (
          <div className="bm-auth-hint">
            <strong>Tài khoản demo:</strong> admin / 123456
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginPage;

