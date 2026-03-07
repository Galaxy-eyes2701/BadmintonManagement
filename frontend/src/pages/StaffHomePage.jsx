import useAuth from "../hooks/useAuth.jsx";

const StaffHomePage = () => {
  const auth = useAuth();

  return (
    <main className="bm-page">
      <section className="bm-hero">
        <div className="bm-hero-content">
          <h1>Trang chủ Nhân viên</h1>
          <p>
            Chào{" "}
            <strong>{auth?.user?.username || "nhân viên"}</strong>. Quản lý
            lịch, check-in người chơi và hỗ trợ vận hành sân.
          </p>
          <div className="bm-hero-actions">
            <button className="bm-btn-primary">Danh sách lịch đặt</button>
            <button className="bm-btn-outline">Quản lý sân</button>
          </div>
        </div>
      </section>
    </main>
  );
};

export default StaffHomePage;

