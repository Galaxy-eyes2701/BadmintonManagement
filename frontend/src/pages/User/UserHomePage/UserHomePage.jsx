import useAuth from "../../../hooks/useAuth.jsx";

const UserHomePage = () => {
  const auth = useAuth();

  return (
    <main className="bm-page">
      <section className="bm-hero">
        <div className="bm-hero-content">
          <h1>Trang chủ Người dùng</h1>
          <p>
            Xin chào <strong>{auth?.user?.username || "bạn"}</strong>! Đặt sân
            nhanh, theo dõi lịch chơi và tham gia giải đấu dễ dàng.
          </p>
          <div className="bm-hero-actions">
            <button className="bm-btn-primary">Đặt sân ngay</button>
            <button className="bm-btn-outline">Xem lịch của tôi</button>
          </div>
        </div>
      </section>
    </main>
  );
};

export default UserHomePage;
