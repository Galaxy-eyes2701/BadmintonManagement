import { useState, useEffect, useCallback } from "react";
import useAuth from "../../../hooks/useAuth.jsx";
import styles from "./UserProfilePage.module.css";

const API = "http://localhost:5043/api";

const getLevelInfo = (pts) => {
  if (pts >= 5000) return { label: "💎 Kim Cương", color: "#06b6d4", next: null,  progress: 100 };
  if (pts >= 2000) return { label: "🥇 Vàng",      color: "#f59e0b", next: 5000, progress: ((pts - 2000) / 3000) * 100 };
  if (pts >= 500)  return { label: "🥈 Bạc",        color: "#64748b", next: 2000, progress: ((pts - 500)  / 1500) * 100 };
  return               { label: "🥉 Đồng",          color: "#b45309", next: 500,  progress: (pts / 500) * 100 };
};

const UserProfilePage = () => {
  const authCtx = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  // Đọc token 1 lần duy nhất — không dùng làm dependency của useEffect
  const getToken = () => {
    try {
      const s = localStorage.getItem("authState");
      if (s) {
        const parsed = JSON.parse(s);
        if (parsed?.token) return parsed.token;
      }
    } catch {}
    return null;
  };

  const fetchProfile = useCallback(async () => {
    const token = getToken();

    if (!token) {
      setError("Không tìm thấy token. Vui lòng đăng nhập lại.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/bookings/my/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Lỗi ${res.status}`);
      const json = await res.json();
      setProfile(json.data ?? json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []); // KHÔNG có dependency — chỉ chạy khi được gọi thủ công

  // Chạy đúng 1 lần sau khi component mount
  useEffect(() => {
    fetchProfile();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps



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

  const fullName  = profile?.fullName  || authCtx?.user?.fullName || "Người dùng";
  const phone     = profile?.phone     || authCtx?.user?.phone    || "—";
  const email     = profile?.email     || "—";
  const role      = profile?.role      || authCtx?.role           || "Customer";
  const points    = profile?.loyaltyPoints ?? authCtx?.user?.loyaltyPoints ?? 0;
  const status    = profile?.status    || "active";

  const totalBookings     = profile?.totalBookings     ?? 0;
  const completedBookings = profile?.completedBookings ?? 0;
  const totalSpent        = profile?.totalSpent        ?? 0;
  const cancelledBookings = Math.max(0, totalBookings - completedBookings);
  const level = getLevelInfo(points);

  return (
    <div className={styles.page}>
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
              <span className={status === "active" ? styles.statusActive : styles.statusInactive}>
                {status === "active" ? "● Đang hoạt động" : "● Bị khóa"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.grid}>
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardIcon}>👤</span>
            <h2 className={styles.cardTitle}>Thông tin cá nhân</h2>
          </div>
          <div className={styles.infoList}>
            {[
              ["Họ & Tên",      fullName],
              ["Số điện thoại", phone],
              ["Email",         email],
              ["Vai trò",       role],
            ].map(([label, value]) => (
              <div key={label} className={styles.infoRow}>
                <span className={styles.infoLabel}>{label}</span>
                <span className={styles.infoValue}>{value || "—"}</span>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardIcon}>⭐</span>
            <h2 className={styles.cardTitle}>Điểm tích lũy</h2>
          </div>
          <div className={styles.pointsDisplay}>
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

        <section className={`${styles.card} ${styles.cardWide}`}>
          <div className={styles.cardHeader}>
            <span className={styles.cardIcon}>📊</span>
            <h2 className={styles.cardTitle}>Thống kê của bạn</h2>
          </div>
          <div className={styles.statsGrid}>
            {[
              { num: totalBookings,     lbl: "Lần đặt sân",  color: "#0f766e" },
              { num: completedBookings, lbl: "Đã check-in",  color: "#10b981" },
              { num: cancelledBookings, lbl: "Đã hủy",       color: "#ef4444" },
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