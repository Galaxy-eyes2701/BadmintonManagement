import { useState, useMemo, useEffect, useCallback } from "react";
import styles from "./AccountManager.module.css";
import SidebarMenu from "../../../components/Admin/SidebarMenu";
import SortIcon from "../../../components/Admin/SortIcon";
import Pagination from "../../../components/Admin/Pagination";
import { useNavigate } from "react-router-dom";

const API_BASE = "http://localhost:5043/api/admin/users";

const api = {
  getUsers: (role) =>
    fetch(role && role !== "all" ? `${API_BASE}?role=${role}` : API_BASE),
  createStaff: (data) =>
    fetch(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  updateUser: (id, data) =>
    fetch(`${API_BASE}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  updateCustomer: (id, data) =>
    fetch(`${API_BASE}/${id}/customer`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  toggleStatus: (id) =>
    fetch(`${API_BASE}/${id}/toggle-status`, { method: "PATCH" }),
  deleteUser: (id) => fetch(`${API_BASE}/${id}`, { method: "DELETE" }),
};

const emptyStaffForm = {
  fullName: "",
  phone: "",
  email: "",
  password: "",
};

const emptyCustomerForm = {
  fullName: "",
  phone: "",
  email: "",
  loyaltyPoints: 0,
};

// ============================================================
// COMPONENT
// ============================================================
const AccountManager = () => {
  const [activeTab, setActiveTab] = useState("staff");
  const navigate = useNavigate();

  const handleLogout = () => {
    if (window.confirm("Bạn có chắc chắn muốn đăng xuất?")) {
      localStorage.removeItem("adminLoggedIn");
      navigate("/admin/login");
    }
  };

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  // ── Staff Form ──
  const [staffForm, setStaffForm] = useState(emptyStaffForm);
  const [editingUserId, setEditingUserId] = useState(null);
  const [staffModal, setStaffModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ── Customer Form ──
  const [customerForm, setCustomerForm] = useState(emptyCustomerForm);
  const [editingCustomerId, setEditingCustomerId] = useState(null);
  const [customerModal, setCustomerModal] = useState(false);

  // ── Delete confirm ──
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // ── Search / Filter ──
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // ── Sort ──
  const [sortField, setSortField] = useState("id");
  const [sortDirection, setSortDirection] = useState("desc");

  // ── Pagination ──
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);

  // ============================================================
  // FETCH
  // ============================================================
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getUsers(null);
      if (!res.ok) throw new Error(`Lỗi tải danh sách: ${res.status}`);
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // ============================================================
  // DERIVED DATA
  // ============================================================
  const currentRole = activeTab === "staff" ? "staff" : "customer";

  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase();
    let result = users
      .filter((u) => u.role === currentRole)
      .filter((u) => {
        const matchSearch =
          u.fullName.toLowerCase().includes(q) ||
          u.phone.includes(q) ||
          (u.email ?? "").toLowerCase().includes(q);
        const matchStatus = filterStatus === "all" || u.status === filterStatus;
        return matchSearch && matchStatus;
      });

    return [...result].sort((a, b) => {
      let vA = a[sortField] ?? "";
      let vB = b[sortField] ?? "";
      if (typeof vA === "string") vA = vA.toLowerCase();
      if (typeof vB === "string") vB = vB.toLowerCase();
      return vA < vB
        ? sortDirection === "asc"
          ? -1
          : 1
        : vA > vB
          ? sortDirection === "asc"
            ? 1
            : -1
          : 0;
    });
  }, [users, currentRole, search, filterStatus, sortField, sortDirection]);

  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return filteredUsers.slice(start, start + itemsPerPage);
  }, [filteredUsers, page, itemsPerPage]);

  const staffList = users.filter((u) => u.role === "staff");
  const customerList = users.filter((u) => u.role === "customer");
  const lockedCount = users.filter((u) => u.status === "inactive").length;

  // ============================================================
  // SORT
  // ============================================================
  const handleSort = (field) => {
    if (sortField === field)
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDirection("asc");
    }
    setPage(1);
  };

  // ============================================================
  // STAFF HANDLERS
  // ============================================================
  const openCreateStaff = () => {
    setStaffForm(emptyStaffForm);
    setEditingUserId(null);
    setShowPassword(false);
    setStaffModal(true);
    setError(null);
  };

  const openEditStaff = (u) => {
    setStaffForm({
      fullName: u.fullName,
      phone: u.phone,
      email: u.email ?? "",
      password: "",
    });
    setEditingUserId(u.id);
    setShowPassword(false);
    setStaffModal(true);
    setError(null);
  };

  const saveStaff = async () => {
    if (
      !staffForm.fullName.trim() ||
      !staffForm.phone.trim() ||
      (!editingUserId && !staffForm.password.trim())
    )
      return;

    setSaving(true);
    setError(null);
    try {
      if (editingUserId) {
        const res = await api.updateUser(editingUserId, staffForm);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.message ?? `Cập nhật thất bại: ${res.status}`);
        }
      } else {
        const res = await api.createStaff(staffForm);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(
            body.message ?? `Tạo tài khoản thất bại: ${res.status}`,
          );
        }
      }
      await fetchUsers();
      setStaffModal(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // CUSTOMER HANDLERS
  // ============================================================
  const openEditCustomer = (u) => {
    setCustomerForm({
      fullName: u.fullName,
      phone: u.phone,
      email: u.email ?? "",
      loyaltyPoints: u.loyaltyPoints ?? 0,
    });
    setEditingCustomerId(u.id);
    setCustomerModal(true);
    setError(null);
  };

  const saveCustomer = async () => {
    if (!customerForm.fullName.trim() || !customerForm.phone.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await api.updateCustomer(editingCustomerId, customerForm);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? `Cập nhật thất bại: ${res.status}`);
      }
      await fetchUsers();
      setCustomerModal(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // SHARED HANDLERS
  // ============================================================
  const handleToggleStatus = async (user) => {
    setSaving(true);
    try {
      const res = await api.toggleStatus(user.id);
      if (!res.ok) throw new Error(`Đổi trạng thái thất bại: ${res.status}`);
      await fetchUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async (id) => {
    setSaving(true);
    setError(null);
    try {
      const res = await api.deleteUser(id);
      if (!res.ok) throw new Error(`Xóa thất bại: ${res.status}`);
      await fetchUsers();
      setDeleteConfirm(null);
    } catch (err) {
      setError(err.message);
      setDeleteConfirm(null);
    } finally {
      setSaving(false);
    }
  };

  const switchTab = (tab) => {
    setActiveTab(tab);
    setSearch("");
    setFilterStatus("all");
    setPage(1);
    setSortField("id");
    setSortDirection("desc");
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
            <span className={styles.headerIcon}>👥</span>
            <div>
              <h1 className={styles.headerTitle}>Quản lý Tài khoản</h1>
              <p className={styles.headerSub}>Admin · Nhân viên & Khách hàng</p>
            </div>
          </div>
          <div className={styles.headerRight}>
            <div className={styles.headerStats}>
              <div className={styles.statChip}>
                <span className={styles.statNum}>{staffList.length}</span>
                <span className={styles.statLabel}>Nhân viên</span>
              </div>
              <div className={styles.statChip}>
                <span className={styles.statNum}>{customerList.length}</span>
                <span className={styles.statLabel}>Khách hàng</span>
              </div>
              <div className={styles.statChipWarn}>
                <span className={styles.statNum}>{lockedCount}</span>
                <span className={styles.statLabel}>Bị khóa</span>
              </div>
            </div>
            <button className={styles.btnLogout} onClick={handleLogout}>
              <span className={styles.btnLogoutIcon}>🚪</span>
              <span>Đăng xuất</span>
            </button>
          </div>
        </header>

        {/* ERROR BANNER */}
        {error && (
          <div className={styles.errorBanner}>
            <span>⚠️ {error}</span>
            <button
              className={styles.errorClose}
              onClick={() => setError(null)}
            >
              ✕
            </button>
          </div>
        )}

        {/* TABS */}
        <div className={styles.tabBar}>
          <button
            className={`${styles.tab} ${activeTab === "staff" ? styles.tabActive : ""}`}
            onClick={() => switchTab("staff")}
          >
            🧑‍💼 Nhân viên{" "}
            <span className={styles.tabBadge}>{staffList.length}</span>
          </button>
          <button
            className={`${styles.tab} ${activeTab === "customer" ? styles.tabActive : ""}`}
            onClick={() => switchTab("customer")}
          >
            🙋 Khách hàng{" "}
            <span className={styles.tabBadge}>{customerList.length}</span>
          </button>
        </div>

        <main className={styles.content}>
          {/* LOADING */}
          {loading && (
            <div className={styles.loadingWrap}>
              <div className={styles.spinner} />
              <p>Đang tải dữ liệu...</p>
            </div>
          )}

          {!loading && (
            <section>
              {/* TOOLBAR */}
              <div className={styles.toolbar}>
                <div className={styles.toolbarLeft}>
                  <div className={styles.searchBox}>
                    <span className={styles.searchIcon}>🔍</span>
                    <input
                      className={styles.searchInput}
                      placeholder={
                        activeTab === "staff"
                          ? "Tìm tên, SĐT, email nhân viên..."
                          : "Tìm tên, SĐT, email khách hàng..."
                      }
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                      }}
                    />
                    {search && (
                      <button
                        className={styles.searchClear}
                        onClick={() => setSearch("")}
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
                    <option value="all">Tất cả trạng thái</option>
                    <option value="active">✅ Hoạt động</option>
                    <option value="inactive">🔒 Bị khóa</option>
                  </select>
                </div>
                {activeTab === "staff" && (
                  <button
                    className={styles.btnPrimary}
                    onClick={openCreateStaff}
                  >
                    + Thêm nhân viên
                  </button>
                )}
              </div>

              {/* TABLE */}
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th
                        className={styles.thSortable}
                        onClick={() => handleSort("id")}
                      >
                        ID{" "}
                        <SortIcon
                          field="id"
                          sortField={sortField}
                          sortDirection={sortDirection}
                        />
                      </th>
                      <th
                        className={styles.thSortable}
                        onClick={() => handleSort("fullName")}
                      >
                        Họ & Tên{" "}
                        <SortIcon
                          field="fullName"
                          sortField={sortField}
                          sortDirection={sortDirection}
                        />
                      </th>
                      <th
                        className={styles.thSortable}
                        onClick={() => handleSort("phone")}
                      >
                        Số điện thoại{" "}
                        <SortIcon
                          field="phone"
                          sortField={sortField}
                          sortDirection={sortDirection}
                        />
                      </th>
                      <th>Email</th>
                      {activeTab === "customer" && (
                        <th
                          className={styles.thSortable}
                          onClick={() => handleSort("loyaltyPoints")}
                        >
                          Điểm tích lũy{" "}
                          <SortIcon
                            field="loyaltyPoints"
                            sortField={sortField}
                            sortDirection={sortDirection}
                          />
                        </th>
                      )}
                      <th
                        className={styles.thSortable}
                        onClick={() => handleSort("status")}
                      >
                        Trạng thái{" "}
                        <SortIcon
                          field="status"
                          sortField={sortField}
                          sortDirection={sortDirection}
                        />
                      </th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedUsers.map((user, idx) => (
                      <tr
                        key={user.id}
                        className={styles.tableRow}
                        style={{ animationDelay: `${idx * 0.04}s` }}
                      >
                        <td className={styles.tdId}>#{user.id}</td>
                        <td className={styles.tdName}>
                          <div className={styles.avatarCell}>
                            <div
                              className={`${styles.avatar} ${user.status === "inactive" ? styles.avatarLocked : ""}`}
                            >
                              {user.fullName.charAt(0).toUpperCase()}
                            </div>
                            <span>{user.fullName}</span>
                          </div>
                        </td>
                        <td>{user.phone}</td>
                        <td className={styles.tdEmail}>{user.email ?? "—"}</td>
                        {activeTab === "customer" && (
                          <td>
                            <span className={styles.pointsBadge}>
                              ⭐ {user.loyaltyPoints ?? 0}
                            </span>
                          </td>
                        )}
                        <td>
                          <button
                            className={`${styles.statusBadge} ${user.status === "active" ? styles.statusActive : styles.statusLocked}`}
                            onClick={() => handleToggleStatus(user)}
                            disabled={saving}
                            title={
                              user.status === "active"
                                ? "Nhấn để khóa tài khoản"
                                : "Nhấn để mở khóa"
                            }
                          >
                            {user.status === "active"
                              ? "✅ Hoạt động"
                              : "🔒 Bị khóa"}
                          </button>
                        </td>
                        <td>
                          <div className={styles.actionBtns}>
                            {activeTab === "staff" ? (
                              <button
                                className={styles.btnEdit}
                                onClick={() => openEditStaff(user)}
                              >
                                ✏️ Sửa
                              </button>
                            ) : (
                              <button
                                className={styles.btnEdit}
                                onClick={() => openEditCustomer(user)}
                              >
                                ✏️ Sửa
                              </button>
                            )}
                            <button
                              className={styles.btnDelete}
                              onClick={() => setDeleteConfirm(user.id)}
                            >
                              🗑️ Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredUsers.length === 0 && (
                  <div className={styles.emptyState}>
                    <span className={styles.emptyIcon}>
                      {activeTab === "staff" ? "🧑‍💼" : "🙋"}
                    </span>
                    <p>
                      {search
                        ? `Không tìm thấy kết quả cho "${search}"`
                        : activeTab === "staff"
                          ? "Chưa có nhân viên nào."
                          : "Chưa có khách hàng nào."}
                    </p>
                  </div>
                )}
              </div>

              <Pagination
                currentPage={page}
                totalPages={Math.max(
                  1,
                  Math.ceil(filteredUsers.length / itemsPerPage),
                )}
                itemsPerPage={itemsPerPage}
                totalItems={filteredUsers.length}
                onPageChange={setPage}
                onItemsPerPageChange={(val) => {
                  setItemsPerPage(val);
                  setPage(1);
                }}
              />
            </section>
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

      {/* MODAL — CREATE / EDIT STAFF */}
      {staffModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => !saving && setStaffModal(false)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleGroup}>
                <span className={styles.modalTitleIcon}>🧑‍💼</span>
                <h3 className={styles.modalTitle}>
                  {editingUserId ? "Chỉnh sửa Nhân viên" : "Thêm Nhân viên mới"}
                </h3>
              </div>
              <button
                className={styles.modalClose}
                onClick={() => !saving && setStaffModal(false)}
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Họ & Tên <span className={styles.required}>*</span>
                </label>
                <input
                  className={styles.input}
                  placeholder="VD: Nguyễn Văn A"
                  value={staffForm.fullName}
                  onChange={(e) =>
                    setStaffForm({ ...staffForm, fullName: e.target.value })
                  }
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Số điện thoại <span className={styles.required}>*</span>
                  </label>
                  <input
                    className={styles.input}
                    placeholder="VD: 0901234567"
                    value={staffForm.phone}
                    onChange={(e) =>
                      setStaffForm({ ...staffForm, phone: e.target.value })
                    }
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Email</label>
                  <input
                    className={styles.input}
                    placeholder="VD: nhanvien@gmail.com"
                    value={staffForm.email}
                    onChange={(e) =>
                      setStaffForm({ ...staffForm, email: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Mật khẩu{" "}
                  {!editingUserId && <span className={styles.required}>*</span>}
                  {editingUserId && (
                    <span className={styles.labelHint}>
                      (để trống nếu không đổi)
                    </span>
                  )}
                </label>
                <div className={styles.passwordWrap}>
                  <input
                    className={styles.input}
                    type={showPassword ? "text" : "password"}
                    placeholder={
                      editingUserId ? "••••••••" : "Nhập mật khẩu mới"
                    }
                    value={staffForm.password}
                    onChange={(e) =>
                      setStaffForm({ ...staffForm, password: e.target.value })
                    }
                  />
                  <button
                    type="button"
                    className={styles.eyeBtn}
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                className={styles.btnCancel}
                disabled={saving}
                onClick={() => setStaffModal(false)}
              >
                Hủy
              </button>
              <button
                className={styles.btnPrimary}
                disabled={saving}
                onClick={saveStaff}
              >
                {saving
                  ? "⏳ Đang lưu..."
                  : editingUserId
                    ? "💾 Lưu thay đổi"
                    : "✅ Tạo nhân viên"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL — EDIT CUSTOMER */}
      {customerModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => !saving && setCustomerModal(false)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleGroup}>
                <span className={styles.modalTitleIcon}>🙋</span>
                <h3 className={styles.modalTitle}>Chỉnh sửa Khách hàng</h3>
              </div>
              <button
                className={styles.modalClose}
                onClick={() => !saving && setCustomerModal(false)}
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Họ & Tên <span className={styles.required}>*</span>
                </label>
                <input
                  className={styles.input}
                  placeholder="VD: Nguyễn Văn A"
                  value={customerForm.fullName}
                  onChange={(e) =>
                    setCustomerForm({
                      ...customerForm,
                      fullName: e.target.value,
                    })
                  }
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Số điện thoại <span className={styles.required}>*</span>
                  </label>
                  <input
                    className={styles.input}
                    placeholder="VD: 0901234567"
                    value={customerForm.phone}
                    onChange={(e) =>
                      setCustomerForm({
                        ...customerForm,
                        phone: e.target.value,
                      })
                    }
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Email</label>
                  <input
                    className={styles.input}
                    placeholder="VD: khachhang@gmail.com"
                    value={customerForm.email}
                    onChange={(e) =>
                      setCustomerForm({
                        ...customerForm,
                        email: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Điểm tích lũy</label>
                <div className={styles.pointsInputWrap}>
                  <span className={styles.pointsPrefix}>⭐</span>
                  <input
                    className={`${styles.input} ${styles.pointsInput}`}
                    type="number"
                    min="0"
                    placeholder="0"
                    value={customerForm.loyaltyPoints}
                    onChange={(e) =>
                      setCustomerForm({
                        ...customerForm,
                        loyaltyPoints: Math.max(0, Number(e.target.value)),
                      })
                    }
                  />
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                className={styles.btnCancel}
                disabled={saving}
                onClick={() => setCustomerModal(false)}
              >
                Hủy
              </button>
              <button
                className={styles.btnPrimary}
                disabled={saving}
                onClick={saveCustomer}
              >
                {saving ? "⏳ Đang lưu..." : "💾 Lưu thay đổi"}
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
              Bạn có chắc muốn xóa tài khoản này không? Hành động này không thể
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

export default AccountManager;
