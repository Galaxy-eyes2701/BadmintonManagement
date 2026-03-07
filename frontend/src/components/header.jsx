import { Link, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth.jsx";

const Header = () => {
  const navigate = useNavigate();
  const auth = useAuth();

  const displayName =
    auth?.user?.username ||
    auth?.user?.FullName ||
    auth?.user?.fullName ||
    auth?.user?.Phone ||
    auth?.user?.phone ||
    "Người dùng";

  const handleLogout = () => {
    auth?.logout?.();
    navigate("/login");
  };

  return (
    <header className="bm-header">
      <div className="bm-header-inner">
        <Link to="/" className="bm-logo">
          <span className="bm-logo-mark">🏸</span>
          <div className="bm-logo-text">
            <span className="bm-logo-title">Badminton Management</span>
            <span className="bm-logo-subtitle">Control. Organize. Win.</span>
          </div>
        </Link>

        <div className="bm-header-right">
          {auth?.isAuthenticated ? (
            <div className="bm-user-badge-wrapper">
              <div className="bm-user-badge">
                <span className="bm-user-name">{displayName}</span>
                {auth.role && (
                  <span className="bm-user-role">{auth.role}</span>
                )}
              </div>
              <button className="bm-btn-outline" onClick={handleLogout}>
                Đăng xuất
              </button>
            </div>
          ) : (
            <button
              className="bm-btn-primary bm-btn-sm"
              onClick={() => navigate("/login")}
            >
              Đăng nhập
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
