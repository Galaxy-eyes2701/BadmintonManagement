import { useState, useEffect, useCallback, useMemo } from "react";
import styles from "./VoucherManager.module.css";
import SidebarMenu from "../../../components/Admin/SidebarMenu";
import Pagination from "../../../components/Admin/Pagination";
import { useNavigate } from "react-router-dom";

const API_BASE = "http://localhost:5043/api/admin/vouchers";

const api = {
  getAll: (status) =>
    fetch(
      status && status !== "all" ? `${API_BASE}?status=${status}` : API_BASE,
    ),
  getById: (id) => fetch(`${API_BASE}/${id}`),
  create: (data) =>
    fetch(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  update: (id, data) =>
    fetch(`${API_BASE}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  remove: (id) => fetch(`${API_BASE}/${id}`, { method: "DELETE" }),
};

const emptyForm = {
  code: "",
  discountAmount: "",
  usageLimit: "",
  expiryDate: "",
};

const formatMoney = (n) =>
  n != null ? new Intl.NumberFormat("vi-VN").format(n) + "đ" : "—";

const today = () => new Date().toISOString().slice(0, 10);

// ============================================================
// COMPONENT
// ============================================================
const VoucherManager = () => {
  const navigate = useNavigate();

  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Filter / Search
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // Sort
  const [sortField, setSortField] = useState("id");
  const [sortDir, setSortDir] = useState("desc");

  // Pagination
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modal
  const [modal, setModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const handleLogout = () => {
    if (window.confirm("Bạn có chắc chắn muốn đăng xuất?")) {
      localStorage.removeItem("adminLoggedIn");
      navigate("/admin/login");
    }
  };

  // ============================================================
  // FETCH
  // ============================================================
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getAll();
      if (!res.ok) throw new Error(`Lỗi tải dữ liệu (${res.status})`);
      setVouchers(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // ============================================================
  // DERIVED DATA
  // ============================================================
  const todayStr = today();

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let list = vouchers.filter((v) => {
      const matchSearch = v.code.toLowerCase().includes(q);
      const matchStatus =
        filterStatus === "all" ||
        (filterStatus === "active" && !v.isExpired) ||
        (filterStatus === "expired" && v.isExpired);
      return matchSearch && matchStatus;
    });

    return [...list].sort((a, b) => {
      let vA = a[sortField] ?? "";
      let vB = b[sortField] ?? "";
      if (typeof vA === "string") {
        vA = vA.toLowerCase();
        vB = vB.toLowerCase();
      }
      return vA < vB
        ? sortDir === "asc"
          ? -1
          : 1
        : vA > vB
          ? sortDir === "asc"
            ? 1
            : -1
          : 0;
    });
  }, [vouchers, search, filterStatus, sortField, sortDir]);

  const paginated = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, page, itemsPerPage]);

  const stats = useMemo(
    () => ({
      total: vouchers.length,
      active: vouchers.filter((v) => !v.isExpired).length,
      expired: vouchers.filter((v) => v.isExpired).length,
    }),
    [vouchers],
  );

  // ============================================================
  // SORT
  // ============================================================
  const handleSort = (field) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("asc");
    }
    setPage(1);
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field)
      return (
        <span style={{ opacity: 0.3, marginLeft: 4, fontSize: 11 }}>⇅</span>
      );
    return (
      <span style={{ marginLeft: 4, fontSize: 11 }}>
        {sortDir === "asc" ? "↑" : "↓"}
      </span>
    );
  };

  // ============================================================
  // MODAL
  // ============================================================
  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setError(null);
    setModal(true);
  };

  const openEdit = (v) => {
    setForm({
      code: v.code,
      discountAmount: String(v.discountAmount),
      usageLimit: String(v.usageLimit),
      expiryDate: v.expiryDate,
    });
    setEditingId(v.id);
    setError(null);
    setModal(true);
  };

  const saveForm = async () => {
    if (
      !form.code.trim() ||
      !form.discountAmount ||
      !form.usageLimit ||
      !form.expiryDate
    ) {
      setError("Vui lòng điền đầy đủ tất cả các trường bắt buộc.");
      return;
    }
    const discount = parseFloat(form.discountAmount);
    const limit = parseInt(form.usageLimit);
    if (isNaN(discount) || discount < 0) {
      setError("Số tiền giảm phải là số không âm.");
      return;
    }
    if (isNaN(limit) || limit < 1) {
      setError("Giới hạn sử dụng phải >= 1.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        discountAmount: discount,
        usageLimit: limit,
        expiryDate: form.expiryDate,
      };
      const res = editingId
        ? await api.update(editingId, payload)
        : await api.create(payload);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Thao tác thất bại (${res.status})`);
      }
      await fetchAll();
      setModal(false);
      showSuccess(
        editingId
          ? "✅ Cập nhật voucher thành công!"
          : "✅ Tạo voucher mới thành công!",
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async (id) => {
    setSaving(true);
    try {
      const res = await api.remove(id);
      if (!res.ok) throw new Error(`Xóa thất bại (${res.status})`);
      await fetchAll();
      setDeleteConfirm(null);
      showSuccess("🗑️ Đã xóa voucher.");
    } catch (e) {
      setError(e.message);
      setDeleteConfirm(null);
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className={styles.layout}>
      <SidebarMenu />

      <div className={styles.mainArea}>
        {/* HEADER */}
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <span className={styles.headerIcon}>🎟️</span>
            <div>
              <h1 className={styles.headerTitle}>Quản lý Voucher</h1>
              <p className={styles.headerSub}>
                Admin · Mã giảm giá & khuyến mãi
              </p>
            </div>
          </div>
          <div className={styles.headerRight}>
            <div className={styles.headerStats}>
              <div className={styles.statChip}>
                <span className={styles.statNum}>{stats.total}</span>
                <span className={styles.statLabel}>Tổng</span>
              </div>
              <div className={styles.statChipSuccess}>
                <span className={styles.statNum}>{stats.active}</span>
                <span className={styles.statLabel}>Còn hiệu lực</span>
              </div>
              <div className={styles.statChipWarn}>
                <span className={styles.statNum}>{stats.expired}</span>
                <span className={styles.statLabel}>Hết hạn</span>
              </div>
            </div>
            <button className={styles.btnLogout} onClick={handleLogout}>
              <span>🚪</span>
              <span>Đăng xuất</span>
            </button>
          </div>
        </header>

        {/* BANNERS */}
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
          {/* TOOLBAR */}
          <div className={styles.toolbar}>
            <div className={styles.toolbarLeft}>
              <div className={styles.searchBox}>
                <span className={styles.searchIcon}>🔍</span>
                <input
                  className={styles.searchInput}
                  placeholder="Tìm mã voucher..."
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
              <select
                className={styles.filterSelect}
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">🎟️ Tất cả</option>
                <option value="active">✅ Còn hiệu lực</option>
                <option value="expired">⏰ Hết hạn</option>
              </select>
            </div>
            <button className={styles.btnPrimary} onClick={openCreate}>
              + Thêm voucher
            </button>
          </div>

          {/* TABLE */}
          {loading ? (
            <div className={styles.loadingWrap}>
              <div className={styles.spinner} />
              <p>Đang tải dữ liệu...</p>
            </div>
          ) : (
            <>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th
                        className={styles.thSortable}
                        onClick={() => handleSort("id")}
                      >
                        ID <SortIcon field="id" />
                      </th>
                      <th
                        className={styles.thSortable}
                        onClick={() => handleSort("code")}
                      >
                        Mã voucher <SortIcon field="code" />
                      </th>
                      <th
                        className={styles.thSortable}
                        onClick={() => handleSort("discountAmount")}
                      >
                        Giảm giá <SortIcon field="discountAmount" />
                      </th>
                      <th
                        className={styles.thSortable}
                        onClick={() => handleSort("usageLimit")}
                      >
                        Giới hạn dùng <SortIcon field="usageLimit" />
                      </th>
                      <th
                        className={styles.thSortable}
                        onClick={() => handleSort("expiryDate")}
                      >
                        Ngày hết hạn <SortIcon field="expiryDate" />
                      </th>
                      <th>Trạng thái</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((v, idx) => (
                      <tr
                        key={v.id}
                        className={styles.tableRow}
                        style={{ animationDelay: `${idx * 0.04}s` }}
                      >
                        <td className={styles.tdId}>#{v.id}</td>
                        <td>
                          <div className={styles.codeCell}>
                            <span className={styles.codeBadge}>{v.code}</span>
                            <button
                              className={styles.copyBtn}
                              title="Sao chép mã"
                              onClick={() => {
                                navigator.clipboard.writeText(v.code);
                                showSuccess(`📋 Đã sao chép "${v.code}"`);
                              }}
                            >
                              📋
                            </button>
                          </div>
                        </td>
                        <td className={styles.tdDiscount}>
                          {formatMoney(v.discountAmount)}
                        </td>
                        <td>
                          <span className={styles.limitBadge}>
                            🔢 {v.usageLimit} lượt
                          </span>
                        </td>
                        <td>
                          <span
                            className={
                              v.isExpired
                                ? styles.dateExpired
                                : styles.dateActive
                            }
                          >
                            📅 {v.expiryDate}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`${styles.statusBadge} ${v.isExpired ? styles.statusExpired : styles.statusActive}`}
                          >
                            {v.isExpired ? "⏰ Hết hạn" : "✅ Hiệu lực"}
                          </span>
                        </td>
                        <td>
                          <div className={styles.actionBtns}>
                            <button
                              className={styles.btnEdit}
                              onClick={() => openEdit(v)}
                            >
                              ✏️ Sửa
                            </button>
                            <button
                              className={styles.btnDelete}
                              onClick={() => setDeleteConfirm(v.id)}
                            >
                              🗑️ Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filtered.length === 0 && (
                  <div className={styles.emptyState}>
                    <span className={styles.emptyIcon}>🎟️</span>
                    <p>
                      {search
                        ? `Không tìm thấy voucher "${search}"`
                        : "Chưa có voucher nào."}
                    </p>
                  </div>
                )}
              </div>

              <Pagination
                currentPage={page}
                totalPages={Math.max(
                  1,
                  Math.ceil(filtered.length / itemsPerPage),
                )}
                itemsPerPage={itemsPerPage}
                totalItems={filtered.length}
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

      {/* SAVING OVERLAY */}
      {saving && (
        <div className={styles.savingOverlay}>
          <div className={styles.savingBox}>
            <div className={styles.spinner} />
            <span>Đang xử lý...</span>
          </div>
        </div>
      )}

      {/* MODAL — CREATE / EDIT */}
      {modal && (
        <div
          className={styles.modalOverlay}
          onClick={() => !saving && setModal(false)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleGroup}>
                <span className={styles.modalTitleIcon}>🎟️</span>
                <h3 className={styles.modalTitle}>
                  {editingId ? "Chỉnh sửa Voucher" : "Thêm Voucher mới"}
                </h3>
              </div>
              <button
                className={styles.modalClose}
                onClick={() => !saving && setModal(false)}
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              {error && <div className={styles.inlineError}>⚠️ {error}</div>}

              {/* Mã voucher */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Mã voucher <span className={styles.required}>*</span>
                </label>
                <div className={styles.codeInputWrap}>
                  <input
                    className={`${styles.input} ${styles.codeInput}`}
                    placeholder="VD: SALE20, SUMMER2025"
                    value={form.code}
                    onChange={(e) =>
                      setForm({ ...form, code: e.target.value.toUpperCase() })
                    }
                  />
                  {form.code && (
                    <span className={styles.codePreview}>
                      {form.code.trim().toUpperCase()}
                    </span>
                  )}
                </div>
                <p className={styles.fieldHint}>
                  Mã sẽ tự động chuyển thành CHỮ HOA khi lưu
                </p>
              </div>

              {/* Số tiền giảm & Giới hạn */}
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Số tiền giảm (VNĐ){" "}
                    <span className={styles.required}>*</span>
                  </label>
                  <div className={styles.priceFieldWrap}>
                    <input
                      type="number"
                      className={`${styles.input} ${styles.priceField}`}
                      placeholder="VD: 50000"
                      value={form.discountAmount}
                      min="0"
                      onChange={(e) =>
                        setForm({ ...form, discountAmount: e.target.value })
                      }
                    />
                    <span className={styles.priceFieldUnit}>đ</span>
                  </div>
                  {form.discountAmount && !isNaN(form.discountAmount) && (
                    <p className={styles.fieldHint}>
                      ={" "}
                      {new Intl.NumberFormat("vi-VN").format(
                        form.discountAmount,
                      )}{" "}
                      đồng
                    </p>
                  )}
                  {/* Quick fill */}
                  <div className={styles.quickFill}>
                    {[20000, 50000, 100000, 200000].map((v) => (
                      <button
                        key={v}
                        type="button"
                        className={styles.quickFillBtn}
                        onClick={() =>
                          setForm((f) => ({ ...f, discountAmount: String(v) }))
                        }
                      >
                        {new Intl.NumberFormat("vi-VN", {
                          notation: "compact",
                        }).format(v)}
                        đ
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Giới hạn sử dụng <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="number"
                    className={styles.input}
                    placeholder="VD: 100"
                    value={form.usageLimit}
                    min="1"
                    onChange={(e) =>
                      setForm({ ...form, usageLimit: e.target.value })
                    }
                  />
                  <p className={styles.fieldHint}>Số lượt tối đa có thể dùng</p>
                  <div className={styles.quickFill}>
                    {[10, 50, 100, 500].map((v) => (
                      <button
                        key={v}
                        type="button"
                        className={styles.quickFillBtn}
                        onClick={() =>
                          setForm((f) => ({ ...f, usageLimit: String(v) }))
                        }
                      >
                        {v} lượt
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Ngày hết hạn */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Ngày hết hạn <span className={styles.required}>*</span>
                </label>
                <input
                  type="date"
                  className={styles.input}
                  value={form.expiryDate}
                  min={todayStr}
                  onChange={(e) =>
                    setForm({ ...form, expiryDate: e.target.value })
                  }
                />
                {/* Quick expire shortcuts */}
                <div className={styles.quickFill}>
                  {[
                    { label: "+7 ngày", days: 7 },
                    { label: "+1 tháng", days: 30 },
                    { label: "+3 tháng", days: 90 },
                    { label: "+1 năm", days: 365 },
                  ].map(({ label, days }) => (
                    <button
                      key={days}
                      type="button"
                      className={styles.quickFillBtn}
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() + days);
                        setForm((f) => ({
                          ...f,
                          expiryDate: d.toISOString().slice(0, 10),
                        }));
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                className={styles.btnCancel}
                disabled={saving}
                onClick={() => setModal(false)}
              >
                Hủy
              </button>
              <button
                className={styles.btnPrimary}
                disabled={saving}
                onClick={saveForm}
              >
                {saving
                  ? "⏳ Đang lưu..."
                  : editingId
                    ? "💾 Lưu thay đổi"
                    : "✅ Tạo voucher"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL — DELETE */}
      {deleteConfirm !== null && (
        <div
          className={styles.modalOverlay}
          onClick={() => !saving && setDeleteConfirm(null)}
        >
          <div
            className={styles.modalSmall}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.deleteIconWrap}>🗑️</div>
            <h3 className={styles.deleteTitle}>Xác nhận xóa</h3>
            <p className={styles.deleteDesc}>
              Bạn có chắc muốn xóa voucher này không? Hành động này không thể
              hoàn tác!
            </p>
            <div className={styles.modalFooter}>
              <button
                className={styles.btnCancel}
                disabled={saving}
                onClick={() => setDeleteConfirm(null)}
              >
                Hủy
              </button>
              <button
                className={styles.btnDeleteConfirm}
                disabled={saving}
                onClick={() => confirmDelete(deleteConfirm)}
              >
                {saving ? "⏳ Đang xóa..." : "Xóa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoucherManager;
