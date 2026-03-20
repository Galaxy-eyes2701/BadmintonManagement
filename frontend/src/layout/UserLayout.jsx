import { NavLink, Outlet, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth.jsx";
import styles from "./UserLayout.module.css";

const UserLayout = () => {
  const navigate = useNavigate();
  const auth = useAuth();
  const isAuthenticated = auth?.isAuthenticated && auth?.token;

  const displayName =
    auth?.user?.fullName ||
    auth?.user?.FullName ||
    auth?.user?.username ||
    auth?.user?.Phone ||
    "Khách";

  const handleLogout = () => {
    auth?.logout?.();
    navigate("/login");
  };

  return (
    <div className={styles.shell}>
      {/* HEADER */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <NavLink to="/user" className={styles.logo}>
            <span className={styles.logoIcon}>🏸</span>
            <div>
              <span className={styles.logoName}>Badminton</span>
              <span className={styles.logoSub}>Management</span>
            </div>
          </NavLink>

          <nav className={styles.nav}>
            <NavLink
              to="/user/booking"
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.navActive : ""}`
              }
            >
              <span className={styles.navIcon}>🏟️</span>
              Đặt sân
            </NavLink>
            <NavLink
              to="/user/history"
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.navActive : ""}`
              }
            >
              <span className={styles.navIcon}>📋</span>
              Lịch sử
            </NavLink>
            <NavLink
              to="/user/profile"
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.navActive : ""}`
              }
            >
              <span className={styles.navIcon}>👤</span>
              Hồ sơ
            </NavLink>
            <NavLink
              to="/user/purchase"
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.navActive : ""}`
              }
            >
              <span className={styles.navIcon}>🛒</span>
              Mua hàng
            </NavLink>
          </nav>

          <div className={styles.userArea}>
            {isAuthenticated ? (
              <>
                <div className={styles.userInfo}>
                  <div className={styles.avatar}>
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <span className={styles.userName}>{displayName}</span>
                </div>
                <button className={styles.logoutBtn} onClick={handleLogout}>
                  Đăng xuất
                </button>
              </>
            ) : (
              <div className={styles.authButtons}>
                <button
                  className={styles.loginBtn}
                  onClick={() => navigate("/login")}
                >
                  Đăng nhập
                </button>
                <button
                  className={styles.registerBtn}
                  onClick={() => navigate("/register")}
                >
                  Đăng ký
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
};

export default UserLayout;
