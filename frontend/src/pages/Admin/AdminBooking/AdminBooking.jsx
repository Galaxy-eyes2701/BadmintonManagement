import { useState, useEffect, useCallback, useMemo } from "react";
import styles from "./AdminBooking.module.css";
import SidebarMenu from "../../../components/Admin/SidebarMenu";
import Pagination from "../../../components/Admin/Pagination";
import { useNavigate } from "react-router-dom";

const API_BASE = "http://localhost:5043/api/admin/bookings";

const api = {
  getAll: (qs) => fetch(`${API_BASE}?${qs}`),
  getById: (id) => fetch(`${API_BASE}/${id}`),
  confirm: (id) => fetch(`${API_BASE}/${id}/confirm`, { method: "PATCH" }),
  cancel: (id) => fetch(`${API_BASE}/${id}/cancel`, { method: "PATCH" }),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatMoney = (n) =>
  n != null ? new Intl.NumberFormat("vi-VN").format(Math.round(n)) + "đ" : "—";

const formatDate = (d) =>
  d
    ? new Date(d).toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const STATUS_OPTS = [
  { value: "", label: "🗂️ Tất cả" },
  { value: "pending", label: "⏳ Chờ xác nhận" },
  { value: "confirmed", label: "✅ Đã xác nhận" },
  { value: "cancelled", label: "🚫 Đã hủy" },
];

const StatusBadge = ({ status }) => {
  const map = {
    pending: { cls: styles.statusPending, label: "⏳ Chờ xác nhận" },
    confirmed: { cls: styles.statusConfirmed, label: "✅ Đã xác nhận" },
    cancelled: { cls: styles.statusCancelled, label: "🚫 Đã hủy" },
  };
  const s = map[status?.toLowerCase()] ?? {
    cls: styles.statusPending,
    label: status,
  };
  return <span className={`${styles.statusBadge} ${s.cls}`}>{s.label}</span>;
};

// ════════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════════
const AdminBooking = () => {
  const navigate = useNavigate();

  // ── Filter state ─────────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // ── Pagination ────────────────────────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  // ── Data state ────────────────────────────────────────────────────────────────
  const [bookings, setBookings] = useState([]);
  const [detail, setDetail] = useState(null);

  // ── UI state ──────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null); // { id, action: 'confirm'|'cancel' }

  const handleLogout = () => {
    if (window.confirm("Bạn có chắc chắn muốn đăng xuất?")) {
      localStorage.removeItem("adminLoggedIn");
      navigate("/admin/login");
    }
  };

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // ── Build query string ────────────────────────────────────────────────────────
  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (search) p.set("search", search);
    if (statusFilter) p.set("status", statusFilter);
    if (fromDate) p.set("fromDate", fromDate);
    if (toDate) p.set("toDate", toDate);
    p.set("page", String(page));
    p.set("pageSize", String(itemsPerPage));
    return p.toString();
  }, [search, statusFilter, fromDate, toDate, page, itemsPerPage]);

  // ── Fetch list ────────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAll(qs);
      if (!res.ok) throw new Error(`Lỗi tải danh sách (${res.status})`);
      const data = await res.json();
      setBookings(data.items ?? []);
      setTotalItems(data.totalItems ?? 0);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [qs]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── Fetch detail ──────────────────────────────────────────────────────────────
  const openDetail = async (id) => {
    setDetailLoading(true);
    setShowDetail(true);
    setDetail(null);
    try {
      const res = await api.getById(id);
      if (!res.ok) throw new Error("Không tải được chi tiết");
      setDetail(await res.json());
    } catch (e) {
      setError(e.message);
      setShowDetail(false);
    } finally {
      setDetailLoading(false);
    }
  };

  // ── Confirm / Cancel action ───────────────────────────────────────────────────
  const handleAction = async () => {
    if (!confirmModal) return;
    setActionLoading(true);
    try {
      const res =
        confirmModal.action === "confirm"
          ? await api.confirm(confirmModal.id)
          : await api.cancel(confirmModal.id);

      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Thao tác thất bại");

      showSuccess(data.message);
      setConfirmModal(null);
      setShowDetail(false);
      await fetchAll();
    } catch (e) {
      setError(e.message);
      setConfirmModal(null);
    } finally {
      setActionLoading(false);
    }
  };

  // ── Stats từ data hiện tại ────────────────────────────────────────────────────
  const stats = useMemo(
    () => ({
      total: totalItems,
      pending: bookings.filter((b) => b.status?.toLowerCase() === "pending")
        .length,
      confirmed: bookings.filter((b) => b.status?.toLowerCase() === "confirmed")
        .length,
      cancelled: bookings.filter((b) => b.status?.toLowerCase() === "cancelled")
        .length,
    }),
    [bookings, totalItems],
  );

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className={styles.layout}>
      <SidebarMenu />

      <div className={styles.mainArea}>
        {/* ══ HEADER ══ */}
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <span className={styles.headerIcon}>🏸</span>
            <div>
              <h1 className={styles.headerTitle}>Quản lý Booking</h1>
              <p className={styles.headerSub}>
                Admin · Duyệt & hủy lịch đặt sân
              </p>
            </div>
          </div>
          <div className={styles.headerRight}>
            <div className={styles.headerStats}>
              <div className={styles.statChip}>
                <span className={styles.statNum}>{totalItems}</span>
                <span className={styles.statLabel}>Tổng</span>
              </div>
              <div className={styles.statChipWarn}>
                <span className={styles.statNum}>{stats.pending}</span>
                <span className={styles.statLabel}>Chờ duyệt</span>
              </div>
              <div className={styles.statChipSuccess}>
                <span className={styles.statNum}>{stats.confirmed}</span>
                <span className={styles.statLabel}>Đã xác nhận</span>
              </div>
              <div className={styles.statChipDanger}>
                <span className={styles.statNum}>{stats.cancelled}</span>
                <span className={styles.statLabel}>Đã hủy</span>
              </div>
            </div>
            <button className={styles.btnLogout} onClick={handleLogout}>
              <span>🚪</span>
              <span>Đăng xuất</span>
            </button>
          </div>
        </header>

        {/* ══ BANNERS ══ */}
        {error && (
          <div className={styles.errorBanner}>
            <span>⚠️ {error}</span>
            <button
              className={styles.bannerClose}
              onClick={() => setError(null)}
            >
              ✕
            </button>
          </div>
        )}
        {successMsg && (
          <div className={styles.successBanner}>
            <span>{successMsg}</span>
            <button
              className={styles.bannerClose}
              onClick={() => setSuccessMsg(null)}
            >
              ✕
            </button>
          </div>
        )}

        <main className={styles.content}>
          {/* ══ TOOLBAR ══ */}
          <div className={styles.toolbar}>
            <div className={styles.toolbarLeft}>
              {/* Search */}
              <div className={styles.searchBox}>
                <span className={styles.searchIcon}>🔍</span>
                <input
                  className={styles.searchInput}
                  placeholder="Tìm tên hoặc SĐT khách..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
                {search && (
                  <button
                    className={styles.searchClear}
                    onClick={() => {
                      setSearch("");
                      setPage(1);
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Status filter */}
              <select
                className={styles.filterSelect}
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
              >
                {STATUS_OPTS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>

              {/* Date range */}
              <div className={styles.dateRange}>
                <input
                  type="date"
                  className={styles.filterSelect}
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    setPage(1);
                  }}
                />
                <span className={styles.dateSep}>→</span>
                <input
                  type="date"
                  className={styles.filterSelect}
                  value={toDate}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>

            <button
              className={styles.btnPrimary}
              onClick={fetchAll}
              disabled={loading}
            >
              {loading ? <span className={styles.spinnerSm} /> : "🔄"} Làm mới
            </button>
          </div>

          {/* ══ TABLE ══ */}
          {loading ? (
            <div className={styles.loadingWrap}>
              <div className={styles.spinner} />
              <p>Đang tải danh sách booking...</p>
            </div>
          ) : (
            <>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>#ID</th>
                      <th>Khách hàng</th>
                      <th>SĐT</th>
                      <th>Ngày tạo</th>
                      <th>Số sân</th>
                      <th>Tổng tiền</th>
                      <th>Trạng thái</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.length === 0 && (
                      <tr>
                        <td colSpan={8} className={styles.emptyTd}>
                          Không có booking nào
                        </td>
                      </tr>
                    )}
                    {bookings.map((b, idx) => (
                      <tr
                        key={b.id}
                        className={styles.tableRow}
                        style={{ animationDelay: `${idx * 0.04}s` }}
                      >
                        <td className={styles.tdId}>#{b.id}</td>
                        <td>
                          <span className={styles.customerName}>
                            {b.customerName}
                          </span>
                        </td>
                        <td className={styles.mutedCell}>{b.customerPhone}</td>
                        <td className={styles.mutedCell}>
                          {formatDate(b.createdAt)}
                        </td>
                        <td>
                          <span className={styles.detailBadge}>
                            🏸 {b.totalDetails} sân
                          </span>
                        </td>
                        <td className={styles.tdMoney}>
                          {formatMoney(b.totalPrice)}
                        </td>
                        <td>
                          <StatusBadge status={b.status} />
                        </td>
                        <td>
                          <div className={styles.actionBtns}>
                            <button
                              className={styles.btnView}
                              onClick={() => openDetail(b.id)}
                            >
                              👁️ Chi tiết
                            </button>
                            {b.status?.toLowerCase() === "pending" && (
                              <button
                                className={styles.btnConfirm}
                                onClick={() =>
                                  setConfirmModal({
                                    id: b.id,
                                    action: "confirm",
                                  })
                                }
                              >
                                ✅ Duyệt
                              </button>
                            )}
                            {b.status?.toLowerCase() !== "cancelled" && (
                              <button
                                className={styles.btnCancel}
                                onClick={() =>
                                  setConfirmModal({
                                    id: b.id,
                                    action: "cancel",
                                  })
                                }
                              >
                                🚫 Hủy
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {bookings.length === 0 && !loading && (
                  <div className={styles.emptyState}>
                    <span className={styles.emptyIcon}>🏸</span>
                    <p>
                      {search
                        ? `Không tìm thấy booking cho "${search}"`
                        : "Chưa có booking nào."}
                    </p>
                  </div>
                )}
              </div>

              <Pagination
                currentPage={page}
                totalPages={Math.max(1, Math.ceil(totalItems / itemsPerPage))}
                itemsPerPage={itemsPerPage}
                totalItems={totalItems}
                onPageChange={setPage}
                onItemsPerPageChange={(val) => {
                  setItemsPerPage(val);
                  setPage(1);
                }}
              />
            </>
          )}
        </main>
      </div>

      {/* ══ MODAL: CHI TIẾT BOOKING ══ */}
      {showDetail && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowDetail(false)}
        >
          <div
            className={styles.modalLarge}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleGroup}>
                <span className={styles.modalTitleIcon}>🏸</span>
                <h3 className={styles.modalTitle}>
                  Chi tiết Booking {detail ? `#${detail.id}` : ""}
                </h3>
              </div>
              <button
                className={styles.modalClose}
                onClick={() => setShowDetail(false)}
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              {detailLoading ? (
                <div className={styles.loadingWrap}>
                  <div className={styles.spinner} />
                  <p>Đang tải chi tiết...</p>
                </div>
              ) : detail ? (
                <>
                  {/* Thông tin khách */}
                  <div className={styles.detailSection}>
                    <h4 className={styles.detailSectionTitle}>
                      👤 Thông tin khách hàng
                    </h4>
                    <div className={styles.detailGrid}>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Họ tên</span>
                        <span className={styles.detailValue}>
                          {detail.customerName}
                        </span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>
                          Số điện thoại
                        </span>
                        <span className={styles.detailValue}>
                          {detail.customerPhone}
                        </span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Email</span>
                        <span className={styles.detailValue}>
                          {detail.customerEmail ?? "—"}
                        </span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Ngày tạo</span>
                        <span className={styles.detailValue}>
                          {formatDate(detail.createdAt)}
                        </span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Tổng tiền</span>
                        <span
                          className={`${styles.detailValue} ${styles.detailMoney}`}
                        >
                          {formatMoney(detail.totalPrice)}
                        </span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Trạng thái</span>
                        <StatusBadge status={detail.status} />
                      </div>
                    </div>
                  </div>

                  {/* Danh sách sân đã đặt */}
                  <div className={styles.detailSection}>
                    <h4 className={styles.detailSectionTitle}>
                      🏸 Danh sách sân đặt
                    </h4>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Sân</th>
                          <th>Chi nhánh</th>
                          <th>Loại sân</th>
                          <th>Ngày chơi</th>
                          <th>Giờ chơi</th>
                          <th>Giá</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.details?.map((d, i) => (
                          <tr
                            key={d.id}
                            className={styles.tableRow}
                            style={{ animationDelay: `${i * 0.05}s` }}
                          >
                            <td>
                              <span className={styles.customerName}>
                                {d.courtName}
                              </span>
                            </td>
                            <td className={styles.mutedCell}>{d.branchName}</td>
                            <td>
                              <span className={styles.detailBadge}>
                                {d.courtTypeName}
                              </span>
                            </td>
                            <td className={styles.mutedCell}>
                              {new Date(d.playDate).toLocaleDateString("vi-VN")}
                            </td>
                            <td className={styles.mutedCell}>
                              {d.startTime?.slice(0, 5)} –{" "}
                              {d.endTime?.slice(0, 5)}
                            </td>
                            <td className={styles.tdMoney}>
                              {formatMoney(d.priceSnapshot)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : null}
            </div>

            {/* Footer actions */}
            {detail && detail.status?.toLowerCase() !== "cancelled" && (
              <div className={styles.modalFooter}>
                <button
                  className={styles.btnCancel2}
                  onClick={() => setShowDetail(false)}
                >
                  Đóng
                </button>
                {detail.status?.toLowerCase() === "pending" && (
                  <button
                    className={styles.btnConfirmLarge}
                    onClick={() => {
                      setShowDetail(false);
                      setConfirmModal({ id: detail.id, action: "confirm" });
                    }}
                  >
                    ✅ Duyệt booking
                  </button>
                )}
                <button
                  className={styles.btnCancelLarge}
                  onClick={() => {
                    setShowDetail(false);
                    setConfirmModal({ id: detail.id, action: "cancel" });
                  }}
                >
                  🚫 Hủy booking
                </button>
              </div>
            )}
            {detail && detail.status?.toLowerCase() === "cancelled" && (
              <div className={styles.modalFooter}>
                <button
                  className={styles.btnCancel2}
                  onClick={() => setShowDetail(false)}
                >
                  Đóng
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ MODAL: XÁC NHẬN HÀNH ĐỘNG ══ */}
      {confirmModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => !actionLoading && setConfirmModal(null)}
        >
          <div
            className={styles.modalSmall}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.deleteIconWrap}>
              {confirmModal.action === "confirm" ? "✅" : "🚫"}
            </div>
            <h3 className={styles.deleteTitle}>
              {confirmModal.action === "confirm"
                ? "Xác nhận duyệt?"
                : "Xác nhận hủy?"}
            </h3>
            <p className={styles.deleteDesc}>
              {confirmModal.action === "confirm"
                ? `Bạn có chắc muốn duyệt booking #${confirmModal.id} không?`
                : `Bạn có chắc muốn hủy booking #${confirmModal.id}? Hành động này không thể hoàn tác!`}
            </p>
            <div className={styles.modalFooter}>
              <button
                className={styles.btnCancel2}
                disabled={actionLoading}
                onClick={() => setConfirmModal(null)}
              >
                Hủy bỏ
              </button>
              {confirmModal.action === "confirm" ? (
                <button
                  className={styles.btnConfirmLarge}
                  disabled={actionLoading}
                  onClick={handleAction}
                >
                  {actionLoading ? "⏳ Đang xử lý..." : "✅ Xác nhận duyệt"}
                </button>
              ) : (
                <button
                  className={styles.btnDeleteConfirm}
                  disabled={actionLoading}
                  onClick={handleAction}
                >
                  {actionLoading ? "⏳ Đang xử lý..." : "🚫 Xác nhận hủy"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBooking;
