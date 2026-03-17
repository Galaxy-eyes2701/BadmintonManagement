import { useNavigate } from "react-router-dom";
import useAuth from "../../../hooks/useAuth.jsx";
import styles from "./UserHomePage.module.css";

const UserHomePage = () => {
  const auth = useAuth();
  const navigate = useNavigate();
  const isAuthenticated = auth?.isAuthenticated && auth?.token;

  const displayName =
    auth?.user?.fullName ||
    auth?.user?.FullName ||
    auth?.user?.username ||
    "bạn";

  return (
    <div className={styles.page}>
      {/* HERO */}
      <section className={styles.hero}>
        <div className={styles.heroBadge}>🏆 Hệ thống đặt sân thông minh</div>
        <h1 className={styles.heroTitle}>
          {isAuthenticated ? (
            <>
              Chào mừng trở lại,
              <br />
              <span className={styles.heroName}>{displayName}! 👋</span>
            </>
          ) : (
            <>
              Chào mừng đến với
              <br />
              <span className={styles.heroName}>Badminton Management! 👋</span>
            </>
          )}
        </h1>
        <p className={styles.heroDesc}>
          Đặt sân nhanh chóng, theo dõi lịch chơi và nhận ưu đãi hấp dẫn từ
          hệ thống sân cầu lông hiện đại nhất.
        </p>
        <div className={styles.heroActions}>
          <button
            className={styles.btnPrimary}
            onClick={() => navigate("/user/booking")}
          >
            <span>🏟️</span> Đặt sân ngay
          </button>
          {isAuthenticated ? (
            <button
              className={styles.btnOutline}
              onClick={() => navigate("/user/history")}
            >
              <span>📋</span> Lịch sử của tôi
            </button>
          ) : (
            <button
              className={styles.btnOutline}
              onClick={() => navigate("/login")}
            >
              <span>🔐</span> Đăng nhập
            </button>
          )}
        </div>
      </section>

      {/* QUICK CARDS */}
      <section className={styles.quickCards}>
        <div
          className={`${styles.card} ${styles.cardGreen}`}
          onClick={() => navigate("/user/booking")}
        >
          <div className={styles.cardIcon}>🏸</div>
          <div>
            <h3 className={styles.cardTitle}>Đặt sân</h3>
            <p className={styles.cardDesc}>Chọn ngày, giờ và loại sân</p>
          </div>
          <span className={styles.cardArrow}>→</span>
        </div>

        <div
          className={`${styles.card} ${styles.cardBlue}`}
          onClick={() => navigate("/user/history")}
        >
          <div className={styles.cardIcon}>📅</div>
          <div>
            <h3 className={styles.cardTitle}>Lịch sử đặt sân</h3>
            <p className={styles.cardDesc}>Xem booking & trạng thái</p>
          </div>
          <span className={styles.cardArrow}>→</span>
        </div>

        <div
          className={`${styles.card} ${styles.cardPurple}`}
          onClick={() => navigate("/user/profile")}
        >
          <div className={styles.cardIcon}>⭐</div>
          <div>
            <h3 className={styles.cardTitle}>Điểm tích lũy</h3>
            <p className={styles.cardDesc}>Xem hồ sơ & điểm thưởng</p>
          </div>
          <span className={styles.cardArrow}>→</span>
        </div>
      </section>

      {/* FEATURES */}
      <section className={styles.features}>
        <h2 className={styles.sectionTitle}>Tại sao chọn chúng tôi?</h2>
        <div className={styles.featureGrid}>
          {[
            {
              icon: "⚡",
              title: "Đặt sân siêu nhanh",
              desc: "Chỉ 3 bước để hoàn tất đặt sân online",
            },
            {
              icon: "🎁",
              title: "Điểm tích lũy",
              desc: "Mỗi lần đặt sân bạn sẽ nhận được điểm thưởng",
            },
            {
              icon: "🏷️",
              title: "Mã voucher",
              desc: "Sử dụng voucher để được giảm giá hấp dẫn",
            },
            {
              icon: "📱",
              title: "Theo dõi realtime",
              desc: "Xem trạng thái booking và lịch sân trực tiếp",
            },
          ].map((f) => (
            <div key={f.title} className={styles.featureCard}>
              <span className={styles.featureIcon}>{f.icon}</span>
              <h4 className={styles.featureTitle}>{f.title}</h4>
              <p className={styles.featureDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default UserHomePage;