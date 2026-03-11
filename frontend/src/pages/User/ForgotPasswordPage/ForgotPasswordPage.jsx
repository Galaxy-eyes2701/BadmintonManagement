import { useState } from "react";
import { useNavigate } from "react-router-dom";

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email) {
      setError("Vui lòng nhập email để khôi phục mật khẩu.");
      return;
    }

    // Ở đây bạn có thể gọi API backend để gửi email khôi phục.
    setSuccess(
      "Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu sẽ được gửi cho bạn."
    );
  };

  return (
    <div className="bm-auth-page">
      <div className="bm-auth-card">
        <div className="bm-auth-header">
          <h1>Quên mật khẩu</h1>
          <p>Nhập email để nhận hướng dẫn khôi phục mật khẩu.</p>
        </div>

        <form className="bm-auth-form" onSubmit={handleSubmit}>
          <div className="bm-form-group">
            <label>Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {error && <div className="bm-form-error">{error}</div>}
          {success && <div className="bm-form-success">{success}</div>}

          <button type="submit" className="bm-btn-primary bm-btn-block">
            Gửi yêu cầu
          </button>
        </form>

        <div className="bm-auth-links">
          <button
            type="button"
            className="bm-link-button"
            onClick={() => navigate("/login")}
          >
            Quay lại đăng nhập
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;

