import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../utils/api";

const RegisterPage = () => {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!fullName || !username || !email || !password || !confirmPassword) {
      setError("Vui lòng điền đầy đủ thông tin.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    try {
      setLoading(true);

      // Backend đang dùng FullName + Phone + Password (+ Email optional)
      await api.post("/Auth/register", {
        fullName,
        phone: username,
        email,
        password,
      });

      setSuccess("Đăng ký thành công! Bạn có thể đăng nhập ngay bây giờ.");
      setTimeout(() => {
        navigate("/login");
      }, 1200);
    } catch (err) {
      const message =
        err.response?.data?.message ||
        "Đăng ký thất bại. Vui lòng thử lại sau.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bm-auth-page">
      <div className="bm-auth-card">
        <div className="bm-auth-header">
          <h1>Đăng ký</h1>
          <p>Tạo tài khoản để quản lý lịch đặt sân, giải đấu và thành viên.</p>
        </div>

        <form className="bm-auth-form" onSubmit={handleSubmit}>
          <div className="bm-form-grid">
            <div className="bm-form-group">
              <label>Họ và tên</label>
              <input
                type="text"
                placeholder="Nguyễn Văn A"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div className="bm-form-group">
              <label>Số điện thoại</label>
              <input
                type="text"
                placeholder="Số điện thoại (dùng để đăng nhập)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div className="bm-form-group">
            <label>Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="bm-form-grid">
            <div className="bm-form-group">
              <label>Mật khẩu</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="bm-form-group">
              <label>Nhập lại mật khẩu</label>
              <input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          {error && <div className="bm-form-error">{error}</div>}
          {success && <div className="bm-form-success">{success}</div>}

          <button
            type="submit"
            className="bm-btn-primary bm-btn-block"
            disabled={loading}
          >
            {loading ? "Đang xử lý..." : "Đăng ký"}
          </button>
        </form>

        <div className="bm-auth-links">
          <span>Đã có tài khoản?</span>
          <button
            type="button"
            className="bm-link-button"
            onClick={() => navigate("/login")}
          >
            Đăng nhập
          </button>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
