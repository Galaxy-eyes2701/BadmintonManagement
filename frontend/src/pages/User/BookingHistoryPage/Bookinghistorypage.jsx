import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../../../hooks/useAuth.jsx";
import styles from "./BookingHistoryPage.module.css";

const API = "http://localhost:5043/api";

// Booking.Status string: "pending" | "confirmed" | "completed" | "cancelled"
const STATUS_MAP = {
  pending:   { label: "Chờ xác nhận", cls: "pending",   icon: "🕐" },
  confirmed: { label: "Đã xác nhận",  cls: "confirmed", icon: "✅" },
  completed: { label: "Hoàn thành",   cls: "completed", icon: "🏆" },
  cancelled: { label: "Đã hủy",       cls: "cancelled", icon: "❌" },
};

const PAY_STATUS = {
  pending:   { label: "Chưa thanh toán", cls: "payPending"  },
  success:   { label: "Đã thanh toán",   cls: "paySuccess"  },
  cancelled: { label: "Đã hủy TT",       cls: "payCancelled"},
  none:      { label: "—",               cls: ""            },
};

const BookingHistoryPage = () => {
  const authCtx = useAuth();
  const navigate = useNavigate();

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
  const [tab, setTab] = useState("bookings");

  // GET /api/bookings/my → { success, total, data: BookingHistoryDto[] }
  // BookingHistoryDto: { bookingId, createdAt, totalPrice, status, paymentStatus,
  //   paymentMethod, slotCount, firstCourtName, firstBranchName, firstPlayDate }
  const [bookings, setBookings] = useState([]);

  // GET /api/bookings/my/orders → { success, total, data: UserOrderDto[] }
  // UserOrderDto: { orderId, createdAt, totalAmount, bookingId,
  //   items: [{ productName, category, quantity, unitPrice, subTotal }] }
  const [orders, setOrders] = useState([]);

  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [cancellingId, setCancellingId] = useState(null);
  const [payingId, setPayingId] = useState(null);

  // GET /api/bookings/{id} → { success, data: BookingDetailResponseDto }
  // BookingDetailResponseDto: { bookingId, createdAt, totalPrice, status, canCancel,
  //   details: [{ id, courtName, branchName, courtType, timeSlot, playDate, price }],
  //   payment: { paymentId, method, status, amount, createdAt } }
  const [detailData, setDetailData] = useState(null);

  const headers = () => { const t = getToken(); return t ? { Authorization: `Bearer ${t}` } : {}; };

  const fetchBookings = async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API}/bookings/my`, { headers: headers() });
      if (!res.ok) throw new Error("Không thể tải lịch sử đặt sân.");
      const json = await res.json();
      setBookings(json.data ?? json);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const fetchOrders = async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API}/bookings/my/orders`, { headers: headers() });
      if (!res.ok) throw new Error("Không thể tải lịch sử mua hàng.");
      const json = await res.json();
      setOrders(json.data ?? json);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (tab === "bookings") fetchBookings();
    else fetchOrders();
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  // DELETE /api/bookings/{id}
  // → { success, message }
  // Điều kiện hủy được: !paid && status != "cancelled" (canCancel từ backend)
  const handleCancel = async (bookingId) => {
    if (!window.confirm("Bạn có chắc muốn hủy lịch đặt sân này không?")) return;
    setCancellingId(bookingId);
    setError("");
    try {
      const res = await fetch(`${API}/bookings/${bookingId}`, { method: "DELETE", headers: headers() });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || "Hủy thất bại.");
      await fetchBookings();
    } catch (err) { setError(err.message); }
    finally { setCancellingId(null); }
  };

  // GET /api/bookings/{id}
  const handleViewDetail = async (bookingId) => {
    try {
      const res = await fetch(`${API}/bookings/${bookingId}`, { headers: headers() });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Không thể tải chi tiết.");
      setDetailData(json.data ?? json);
    } catch (err) { setError(err.message); }
  };

  // Handle deposit payment for pending booking
  const handleDepositPayment = async (bookingId, totalPrice) => {
    if (!bookingId) return;
    setPayingId(bookingId);
    setError("");
    try {
      const res = await fetch(`${API}/payments/deposit/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers() },
        body: JSON.stringify({ bookingId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Không thể tạo thanh toán.");
      
      // Redirect to VNPay
      if (json.paymentUrl) {
        window.location.href = json.paymentUrl;
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setPayingId(null);
    }
  };

  const fmt = n =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n || 0);
  const fmtDT = d => d ? new Date(d).toLocaleString("vi-VN") : "—";

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>📋 Lịch sử hoạt động</h1>
      </div>

      <div className={styles.tabBar}>
        <button className={`${styles.tab} ${tab === "bookings" ? styles.tabActive : ""}`}
          onClick={() => setTab("bookings")}>
          🏸 Lịch sử đặt sân
          {bookings.length > 0 && <span className={styles.tabBadge}>{bookings.length}</span>}
        </button>
        <button className={`${styles.tab} ${tab === "orders" ? styles.tabActive : ""}`}
          onClick={() => setTab("orders")}>
          🛍️ Lịch sử mua hàng
          {orders.length > 0 && <span className={styles.tabBadge}>{orders.length}</span>}
        </button>
      </div>

      {error && (
        <div className={styles.errorBanner}>
          ⚠️ {error}
          <button onClick={() => setError("")} className={styles.errorClose}>✕</button>
        </div>
      )}

      {loading ? (
        <div className={styles.loadingWrap}><div className={styles.spinner} /><p>Đang tải...</p></div>
      ) : (
        <>
          {/* ── BOOKINGS TAB ── */}
          {tab === "bookings" && (
            <div className={styles.listWrap}>
              {bookings.length === 0 ? (
                <div className={styles.emptyState}>
                  <span className={styles.emptyIcon}>🏸</span>
                  <p>Bạn chưa có lịch đặt sân nào.</p>
                  <p className={styles.emptyHint}>Đặt ngay để bắt đầu!</p>
                </div>
              ) : bookings.map(b => {
                // b = BookingHistoryDto: bookingId, status, totalPrice,
                //   paymentStatus, slotCount, firstCourtName, firstBranchName, firstPlayDate
                const s   = STATUS_MAP[b.status]        || { label: b.status,        cls: "pending", icon: "❓" };
                const pay = PAY_STATUS[b.paymentStatus]  || { label: b.paymentStatus, cls: "" };
                return (
                  <div key={b.bookingId} className={styles.bookingCard}>
                    <div className={styles.bookingCardLeft}>
                      <div className={styles.bookingId}>#{b.bookingId}</div>
                      <div className={styles.bookingInfo}>
                        <h3 className={styles.bookingCourt}>{b.firstCourtName || "Sân"}</h3>
                        <p className={styles.bookingMeta}>📍 {b.firstBranchName || "—"}</p>
                        {/* firstPlayDate: "dd/MM/yyyy" string từ backend */}
                        <p className={styles.bookingMeta}>
                          📅 {b.firstPlayDate || "—"}
                          {b.slotCount > 1 && ` · +${b.slotCount - 1} ca khác`}
                        </p>
                        <p className={styles.bookingMeta}>🕐 {fmtDT(b.createdAt)}</p>
                      </div>
                    </div>
                    <div className={styles.bookingCardRight}>
                      <span className={`${styles.statusBadge} ${styles[`status_${s.cls}`]}`}>
                        {s.icon} {s.label}
                      </span>
                      <span className={`${styles.payBadge} ${styles[pay.cls]}`}>
                        💳 {pay.label}
                      </span>
                      {/* totalPrice: decimal? từ Booking */}
                      <div className={styles.bookingPrice}>{fmt(b.totalPrice)}</div>
                      <div className={styles.bookingActions}>
                        {/* Pay button for pending bookings without successful payment */}
                        {b.status === "pending" && b.paymentStatus !== "success" && (
                          <button className={styles.btnPay}
                            onClick={() => handleDepositPayment(b.bookingId, b.totalPrice)}
                            disabled={payingId === b.bookingId}>
                            {payingId === b.bookingId ? "⏳" : "💳 Đặt cọc"}
                          </button>
                        )}
                        <button className={styles.btnDetail}
                          onClick={() => handleViewDetail(b.bookingId)}>
                          Chi tiết
                        </button>
                        {/* Hủy được khi chưa thanh toán thành công và chưa bị hủy */}
                        {(b.status === "pending" || b.status === "confirmed") &&
                          b.paymentStatus !== "success" && (
                          <button className={styles.btnCancel}
                            onClick={() => handleCancel(b.bookingId)}
                            disabled={cancellingId === b.bookingId}>
                            {cancellingId === b.bookingId ? "⏳" : "Hủy"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── ORDERS TAB ── */}
          {tab === "orders" && (
            <div className={styles.listWrap}>
              {orders.length === 0 ? (
                <div className={styles.emptyState}>
                  <span className={styles.emptyIcon}>🛍️</span><p>Chưa có đơn hàng nào.</p>
                </div>
              ) : orders.map(o => (
                // o = UserOrderDto: { orderId, createdAt, totalAmount, bookingId, items[] }
                <div key={o.orderId} className={styles.orderCard}>
                  <div className={styles.orderHeader}>
                    <div>
                      <span className={styles.orderId}>Đơn #{o.orderId}</span>
                      {o.bookingId && (
                        <span className={styles.orderBookingRef}> · Sân #{o.bookingId}</span>
                      )}
                    </div>
                    <span className={styles.orderDate}>{fmtDT(o.createdAt)}</span>
                  </div>
                  <div className={styles.orderItems}>
                    {(o.items || []).map((item, idx) => (
                      // item: { productName, category, quantity, unitPrice, subTotal }
                      <div key={idx} className={styles.orderItem}>
                        <div className={styles.orderItemInfo}>
                          <span className={styles.orderItemName}>{item.productName}</span>
                          <span className={styles.orderItemCat}>{item.category}</span>
                        </div>
                        <span className={styles.orderItemQty}>×{item.quantity}</span>
                        {/* subTotal = quantity * unitPriceSnapshot (tính sẵn từ backend) */}
                        <span className={styles.orderItemPrice}>{fmt(item.subTotal)}</span>
                      </div>
                    ))}
                  </div>
                  <div className={styles.orderFooter}>
                    {/* totalAmount: decimal(12,2) từ Order */}
                    <span className={styles.orderTotal}>
                      Tổng: <strong>{fmt(o.totalAmount)}</strong>
                    </span>
                    <span className={`${styles.statusBadge} ${styles.status_completed}`}>
                      ✅ Đã mua
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── DETAIL MODAL ── */}
      {detailData && (
        <div className={styles.modalOverlay} onClick={() => setDetailData(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                📋 Booking #{detailData.bookingId}
              </h3>
              <button className={styles.modalClose} onClick={() => setDetailData(null)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              {/* Thông tin chung */}
              {[
                ["📊 Trạng thái",   STATUS_MAP[detailData.status]?.label || detailData.status],
                ["🕐 Thời gian đặt", fmtDT(detailData.createdAt)],
                ["💰 Tổng tiền sân", fmt(detailData.totalPrice)],
              ].map(([label, value]) => (
                <div key={label} className={styles.detailRow}>
                  <span className={styles.detailLabel}>{label}</span>
                  <span className={styles.detailValue}>{value || "—"}</span>
                </div>
              ))}

              {/* Thanh toán */}
              {detailData.payment && (
                <>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>💳 Thanh toán</span>
                    <span className={styles.detailValue}>
                      {/* payment.method, payment.status, payment.amount */}
                      {detailData.payment.method} · {PAY_STATUS[detailData.payment.status]?.label}
                    </span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>💵 Số tiền TT</span>
                    <span className={styles.detailValue}>{fmt(detailData.payment.amount)}</span>
                  </div>
                </>
              )}

              {/* Chi tiết từng ca - BookingDetailItemDto */}
              {detailData.details?.length > 0 && (
                <div className={styles.detailSection}>
                  <p className={styles.detailSectionTitle}>⏰ Chi tiết ca chơi:</p>
                  {detailData.details.map((d, i) => (
                    // d: { courtName, branchName, courtType, timeSlot, playDate, price }
                    <div key={i} className={styles.detailSlotRow}>
                      <div>
                        <strong>{d.courtName}</strong>
                        <small> · {d.branchName} · {d.courtType}</small>
                      </div>
                      <div className={styles.detailSlotRight}>
                        {/* timeSlot: "HH:mm - HH:mm", playDate: "dd/MM/yyyy" */}
                        <span>{d.playDate} · {d.timeSlot}</span>
                        {/* price: PriceSnapshot decimal(10,2) */}
                        <span className={styles.detailSlotPrice}>{fmt(d.price)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* canCancel từ backend: !paid && status != "cancelled" */}
              {detailData.canCancel && (
                <button className={styles.btnCancelModal}
                  onClick={() => { setDetailData(null); handleCancel(detailData.bookingId); }}>
                  🗑️ Hủy booking này
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingHistoryPage;