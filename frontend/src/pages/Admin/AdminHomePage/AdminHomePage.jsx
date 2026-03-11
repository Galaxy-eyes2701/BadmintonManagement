import useAuth from "../../../hooks/useAuth.jsx";
import styles from "./AdminHomePage.module.css";

const AdminHomePage = () => {
  const auth = useAuth();

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1>Bảng điều khiển Admin</h1>
          <p>
            Chào{" "}
            <strong>{auth?.user?.username || "Quản trị viên hệ thống"}</strong>.
            Từ đây bạn có thể quản lý sân, lịch đặt, tài khoản và giải đấu.
          </p>
          <div className={styles.heroStats}>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Sân hoạt động</span>
              <span className={styles.statValue}>8</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Lịch đặt hôm nay</span>
              <span className={styles.statValue}>24</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Thành viên</span>
              <span className={styles.statValue}>120</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default AdminHomePage;
