import { useState, useEffect } from "react";
import useAuth from "../../../hooks/useAuth.jsx";
import styles from "./UserProfilePage.module.css";

const API = "http://localhost:5043/api";

// GET /api/bookings/my/profile → { success, data: UserProfileDto }
// UserProfileDto: { userId, fullName, phone, email, loyaltyPoints, status, role,
//   totalBookings, completedBookings, totalSpent }
// ⚠ completedBookings = COUNT WHERE status="confirmed" (backend logic)
// ⚠ loyaltyPoints: int? — tích lũy = (courtTotal + posTotal) / 100_000 khi checkout

// Bảng cấp bậc dựa vào loyaltyPoints
const getLevelInfo = (pts) => {
  if (pts >= 5000) return { label: "💎 Kim Cương", color: "#06b6d4", next: null,  progress: 100 };
  if (pts >= 2000) return { label: "🥇 Vàng",      color: "#f59e0b", next: 5000, progress: ((pts - 2000) / 3000) * 100 };
  if (pts >= 500)  return { label: "🥈 Bạc",        color: "#64748b", next: 2000, progress: ((pts - 500)  / 1500) * 100 };
  return               { label: "🥉 Đồng",          color: "#b45309", next: 500,  progress: (pts / 500) * 100 };
};

const UserProfilePage = () => {
  const { token, user: authUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const fetchProfile = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API}/bookings/my/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Lỗi ${res.status}`);
      const json = await res.json();
      // json: { success, data: UserProfileDto }
      setProfile(json.data ?? json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProfile(); }, []);

  if (loading) return (
    <div className={styles.loadingWrap}><div className={styles.spinner} /><p>Đang tải hồ sơ...</p></div>
  );
  if (error) return (
    <div className={styles.errorWrap}>
      <span className={styles.errorIcon}>⚠️</span>
      <p>Không thể tải hồ sơ: {error}</p>
      <button className={styles.retryBtn} onClick={fetchProfile}>Thử lại</button>
    </div>
  );

  // Map từ UserProfileDto — fallback về authUser nếu chưa có
  const fullName  = profile?.fullName  || authUser?.fullName || "Người dùng";
  const phone     = profile?.phone     || authUser?.phone    || "—";
  const email     = profile?.email     || "—";
  const role      = profile?.role      || authUser?.role     || "Customer";
  // loyaltyPoints: int? (default 0)
  const points    = profile?.loyaltyPoints ?? authUser?.loyaltyPoints ?? 0;
  // status: "active" | "inactive"
  const status    = profile?.status    || "active";

  // Các trường thống kê từ UserProfileDto
  const totalBookings     = profile?.totalBookings     ?? 0;
  // completedBookings = count(status="confirmed") — đặt tên hơi lạ nhưng đây là logic của backend
  const completedBookings = profile?.completedBookings ?? 0;
  const totalSpent        = profile?.totalSpent        ?? 0;
  // cancelledBookings không có trong DTO, tính thủ công nếu cần
  const cancelledBookings = totalBookings - completedBookings;

  const level = getLevelInfo(points);

  return (
    <div className={styles.page}>
      {/* HERO */}
      <div className={styles.heroCard}>
        <div className={styles.heroBg} />
        <div className={styles.heroContent}>
          <div className={styles.avatarRing}>
            <div className={styles.avatarLarge}>{fullName.charAt(0).toUpperCase()}</div>
          </div>
          <div className={styles.heroInfo}>
            <h1 className={styles.heroName}>{fullName}</h1>
            <div className={styles.heroMeta}>
              <span className={styles.levelBadge}
                style={{ background: level.color + "22", color: level.color, borderColor: level.color + "55" }}>
                {level.label}
              </span>
              <span className={styles.memberSince}>🏸 BadmintonHub</span>
              {/* User.Status: "active" | "inactive" */}
              <span className={status === "active" ? styles.statusActive : styles.statusInactive}>
                {status === "active" ? "● Đang hoạt động" : "● Bị khóa"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.grid}>
        {/* THÔNG TIN CÁ NHÂN */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardIcon}>👤</span>
            <h2 className={styles.cardTitle}>Thông tin cá nhân</h2>
          </div>
          <div className={styles.infoList}>
            {[
              // User model fields (từ UserProfileDto)
              ["Họ & Tên",       fullName],
              ["Số điện thoại",  phone],   // unique index trong DB
              ["Email",          email],   // nullable
              ["Vai trò",        role],    // "Customer" | "Staff" | "Admin"
            ].map(([label, value]) => (
              <div key={label} className={styles.infoRow}>
                <span className={styles.infoLabel}>{label}</span>
                <span className={styles.infoValue}>{value || "—"}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ĐIỂM TÍCH LŨY */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardIcon}>⭐</span>
            <h2 className={styles.cardTitle}>Điểm tích lũy</h2>
          </div>

          <div className={styles.pointsDisplay}>
            {/* loyaltyPoints: int? — mỗi 100.000đ chi tiêu = 1 điểm */}
            <div className={styles.pointsBig}>{points.toLocaleString("vi-VN")}</div>
            <div className={styles.pointsLabel}>điểm tích lũy</div>
            <div className={styles.pointsHint}>Mỗi 100.000đ chi tiêu = 1 điểm</div>
          </div>

          <div className={styles.levelSection}>
            <div className={styles.levelRow}>
              <span className={styles.levelCurrent} style={{ color: level.color }}>{level.label}</span>
              {level.next && <span className={styles.levelNext}>→ {level.next.toLocaleString()} điểm</span>}
            </div>
            <div className={styles.progressBar}>
              <div className={styles.progressFill}
                style={{ width: `${Math.min(level.progress, 100)}%`, background: level.color }} />
            </div>
            {level.next
              ? <p className={styles.progressNote}>Còn <strong>{(level.next - points).toLocaleString()}</strong> điểm để lên hạng</p>
              : <p className={styles.progressNote}>🎉 Bạn đã đạt cấp độ cao nhất!</p>
            }
          </div>

          <div className={styles.benefitsBox}>
            <p className={styles.benefitsTitle}>Quyền lợi thành viên</p>
            <ul className={styles.benefitsList}>
              <li>✅ Tích điểm mỗi lần thanh toán</li>
              <li>✅ Ưu tiên đặt sân giờ cao điểm</li>
              {points >= 500  && <li>✅ Hạng Bạc: Ưu đãi đặc biệt</li>}
              {points >= 2000 && <li>✅ Hạng Vàng: Giảm 10% phí sân</li>}
              {points >= 5000 && <li>✅ Hạng Kim Cương: Ưu tiên tối đa</li>}
            </ul>
          </div>
        </section>

        {/* THỐNG KÊ */}
        <section className={`${styles.card} ${styles.cardWide}`}>
          <div className={styles.cardHeader}>
            <span className={styles.cardIcon}>📊</span>
            <h2 className={styles.cardTitle}>Thống kê của bạn</h2>
          </div>
          <div className={styles.statsGrid}>
            {[
              // totalBookings: COUNT(*) FROM Bookings WHERE UserId = current
              { num: totalBookings,     lbl: "Lần đặt sân",    color: "#0f766e" },
              // completedBookings: COUNT WHERE status="confirmed" (đã check in)
              { num: completedBookings, lbl: "Đã check-in",    color: "#10b981" },
              // tính toán từ frontend
              { num: Math.max(0, cancelledBookings), lbl: "Đã hủy", color: "#ef4444" },
              // totalSpent: SUM(TotalPrice) WHERE status="confirmed"
              {
                num: totalSpent > 0
                  ? new Intl.NumberFormat("vi-VN", { notation: "compact" }).format(totalSpent) + "đ"
                  : "0đ",
                lbl: "Tổng chi tiêu", color: "#f59e0b",
              },
            ].map((stat, i) => (
              <div key={i} className={styles.statBox}>
                <div className={styles.statNum} style={{ color: stat.color }}>{stat.num}</div>
                <div className={styles.statLbl}>{stat.lbl}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default UserProfilePage;