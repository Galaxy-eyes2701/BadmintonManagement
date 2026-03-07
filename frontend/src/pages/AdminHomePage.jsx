import useAuth from "../hooks/useAuth.jsx";

const AdminHomePage = () => {
  const auth = useAuth();

  return (
    <main className="bm-page">
      <section className="bm-hero">
        <div className="bm-hero-content">
          <h1>Bảng điều khiển Admin</h1>
          <p>
            Chào{" "}
            <strong>{auth?.user?.username || "Quản trị viên hệ thống"}</strong>
            . Từ đây bạn có thể quản lý sân, lịch đặt, tài khoản và giải đấu.
          </p>
          <div className="bm-hero-stats">
            <div className="bm-stat-card">
              <span className="bm-stat-label">Sân hoạt động</span>
              <span className="bm-stat-value">8</span>
            </div>
            <div className="bm-stat-card">
              <span className="bm-stat-label">Lịch đặt hôm nay</span>
              <span className="bm-stat-value">24</span>
            </div>
            <div className="bm-stat-card">
              <span className="bm-stat-label">Thành viên</span>
              <span className="bm-stat-value">120</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default AdminHomePage;

