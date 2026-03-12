import { useState, useMemo, useEffect, useCallback } from "react";
import styles from "./BranchCourtManager.module.css";
import SidebarMenu from "../../../components/Admin/SidebarMenu";
import SortIcon from "../../../components/Admin/SortIcon";
import Pagination from "../../../components/Admin/Pagination";
import { useNavigate } from "react-router-dom";

const API_BASE = "http://localhost:5043/api";

const api = {
  // BRANCHES
  getBranches: () => fetch(`${API_BASE}/branches`),
  createBranch: (data) =>
    fetch(`${API_BASE}/branches`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  updateBranch: (id, data) =>
    fetch(`${API_BASE}/branches/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  deleteBranch: (id) =>
    fetch(`${API_BASE}/branches/${id}`, { method: "DELETE" }),

  // COURTS
  getCourts: () => fetch(`${API_BASE}/courts`),
  createCourt: (data) =>
    fetch(`${API_BASE}/courts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  updateCourt: (id, data) =>
    fetch(`${API_BASE}/courts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  deleteCourt: (id) => fetch(`${API_BASE}/courts/${id}`, { method: "DELETE" }),

  // COURT TYPES
  getCourtTypes: () => fetch(`${API_BASE}/courttypes`),
};

// ============================================================
// CONSTANTS
// ============================================================
const emptyBranch = { name: "", address: "", hotline: "" };
const emptyCourt = {
  branchId: "",
  courtTypeId: "",
  name: "",
  status: "active",
};

// ============================================================
// COMPONENT
// ============================================================
const BranchCourtManager = () => {
  const [activeTab, setActiveTab] = useState("branches");
  const navigate = useNavigate();

  const handleLogout = () => {
    if (window.confirm("Bạn có chắc chắn muốn đăng xuất?")) {
      localStorage.removeItem("adminLoggedIn");
      navigate("/admin/login");
    }
  };

  // ── Data từ API ──
  const [branches, setBranches] = useState([]);
  const [courts, setCourts] = useState([]);
  const [courtTypes, setCourtTypes] = useState([]);

  // ── Loading / Error ──
  const [loading, setLoading] = useState({
    branches: false,
    courts: false,
    courtTypes: false,
  });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false); // đang gọi POST/PUT/DELETE

  // ── Form state ──
  const [branchForm, setBranchForm] = useState(emptyBranch);
  const [editingBranchId, setEditingBranchId] = useState(null);
  const [branchModal, setBranchModal] = useState(false);

  const [courtForm, setCourtForm] = useState(emptyCourt);
  const [editingCourtId, setEditingCourtId] = useState(null);
  const [courtModal, setCourtModal] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState(null); // { type, id }

  // ── Search / Filter ──
  const [branchSearch, setBranchSearch] = useState("");
  const [courtSearch, setCourtSearch] = useState("");
  const [filterBranch, setFilterBranch] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // ── Sort ──
  const [sortField, setSortField] = useState("name");
  const [sortDirection, setSortDirection] = useState("asc");

  // ── Pagination ──
  const [branchPage, setBranchPage] = useState(1);
  const [branchItemsPerPage, setBranchItemsPerPage] = useState(6);
  const [courtPage, setCourtPage] = useState(1);
  const [courtItemsPerPage, setCourtItemsPerPage] = useState(5);

  // ============================================================
  // FETCH DATA
  // ============================================================
  const fetchBranches = useCallback(async () => {
    setLoading((l) => ({ ...l, branches: true }));
    try {
      const res = await api.getBranches();
      if (!res.ok) throw new Error(`Lỗi tải chi nhánh: ${res.status}`);
      const data = await res.json();
      setBranches(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading((l) => ({ ...l, branches: false }));
    }
  }, []);

  const fetchCourts = useCallback(async () => {
    setLoading((l) => ({ ...l, courts: true }));
    try {
      const res = await api.getCourts();
      if (!res.ok) throw new Error(`Lỗi tải sân: ${res.status}`);
      const data = await res.json();
      setCourts(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading((l) => ({ ...l, courts: false }));
    }
  }, []);

  const fetchCourtTypes = useCallback(async () => {
    setLoading((l) => ({ ...l, courtTypes: true }));
    try {
      const res = await api.getCourtTypes();
      if (!res.ok) throw new Error(`Lỗi tải loại sân: ${res.status}`);
      const data = await res.json();
      setCourtTypes(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading((l) => ({ ...l, courtTypes: false }));
    }
  }, []);

  // Gọi API lần đầu khi mount
  useEffect(() => {
    fetchBranches();
    fetchCourts();
    fetchCourtTypes();
  }, [fetchBranches, fetchCourts, fetchCourtTypes]);

  // ============================================================
  // HELPERS
  // ============================================================
  const getBranchName = (id) => branches.find((b) => b.id === id)?.name ?? "—";
  const getCourtTypeName = (id) =>
    courtTypes.find((t) => t.id === id)?.name ?? "—";

  const handleSort = (field) => {
    if (sortField === field)
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCourtPage(1);
  };

  // ============================================================
  // DERIVED DATA (filter + sort + paginate)
  // ============================================================
  const filteredBranches = useMemo(
    () =>
      branches.filter(
        (b) =>
          b.name.toLowerCase().includes(branchSearch.toLowerCase()) ||
          b.address.toLowerCase().includes(branchSearch.toLowerCase()) ||
          b.hotline.includes(branchSearch),
      ),
    [branches, branchSearch],
  );

  const paginatedBranches = useMemo(() => {
    const start = (branchPage - 1) * branchItemsPerPage;
    return filteredBranches.slice(start, start + branchItemsPerPage);
  }, [filteredBranches, branchPage, branchItemsPerPage]);

  const filteredCourts = useMemo(() => {
    let result = courts.filter((c) => {
      const matchSearch = c.name
        .toLowerCase()
        .includes(courtSearch.toLowerCase());
      const matchBranch =
        filterBranch === "all" || c.branchId === Number(filterBranch);
      const matchStatus = filterStatus === "all" || c.status === filterStatus;
      return matchSearch && matchBranch && matchStatus;
    });
    return [...result].sort((a, b) => {
      let vA =
        sortField === "branchId"
          ? getBranchName(a.branchId)
          : sortField === "courtTypeId"
            ? getCourtTypeName(a.courtTypeId)
            : (a[sortField] ?? "");
      let vB =
        sortField === "branchId"
          ? getBranchName(b.branchId)
          : sortField === "courtTypeId"
            ? getCourtTypeName(b.courtTypeId)
            : (b[sortField] ?? "");
      vA = typeof vA === "string" ? vA.toLowerCase() : vA;
      vB = typeof vB === "string" ? vB.toLowerCase() : vB;
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
  }, [
    courts,
    courtSearch,
    filterBranch,
    filterStatus,
    sortField,
    sortDirection,
  ]);

  const paginatedCourts = useMemo(() => {
    const start = (courtPage - 1) * courtItemsPerPage;
    return filteredCourts.slice(start, start + courtItemsPerPage);
  }, [filteredCourts, courtPage, courtItemsPerPage]);

  // ============================================================
  // BRANCH HANDLERS — gọi API thực
  // ============================================================
  const openBranchCreate = () => {
    setBranchForm(emptyBranch);
    setEditingBranchId(null);
    setBranchModal(true);
    setError(null);
  };
  const openBranchEdit = (b) => {
    setBranchForm({ name: b.name, address: b.address, hotline: b.hotline });
    setEditingBranchId(b.id);
    setBranchModal(true);
    setError(null);
  };

  const saveBranch = async () => {
    if (
      !branchForm.name.trim() ||
      !branchForm.address.trim() ||
      !branchForm.hotline.trim()
    )
      return;
    setSaving(true);
    setError(null);
    try {
      if (editingBranchId) {
        // PUT /api/branches/{id}
        const res = await api.updateBranch(editingBranchId, branchForm);
        if (!res.ok) throw new Error(`Cập nhật thất bại: ${res.status}`);
      } else {
        // POST /api/branches
        const res = await api.createBranch(branchForm);
        if (!res.ok) throw new Error(`Tạo chi nhánh thất bại: ${res.status}`);
      }
      await fetchBranches(); // reload lại từ server
      setBranchModal(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteBranch = async (id) => {
    setSaving(true);
    setError(null);
    try {
      const res = await api.deleteBranch(id);
      if (!res.ok) throw new Error(`Xóa thất bại: ${res.status}`);
      await fetchBranches();
      await fetchCourts(); // sân thuộc chi nhánh đó cũng cần reload
      setDeleteConfirm(null);
    } catch (err) {
      setError(err.message);
      setDeleteConfirm(null);
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // COURT HANDLERS — gọi API thực
  // ============================================================
  const openCourtCreate = () => {
    setCourtForm(emptyCourt);
    setEditingCourtId(null);
    setCourtModal(true);
    setError(null);
  };
  const openCourtEdit = (c) => {
    setCourtForm({
      branchId: c.branchId,
      courtTypeId: c.courtTypeId,
      name: c.name,
      status: c.status,
    });
    setEditingCourtId(c.id);
    setCourtModal(true);
    setError(null);
  };

  const saveCourt = async () => {
    if (!courtForm.name.trim() || !courtForm.branchId || !courtForm.courtTypeId)
      return;
    setSaving(true);
    setError(null);
    try {
      if (editingCourtId) {
        // PUT /api/courts/{id}
        const res = await api.updateCourt(editingCourtId, courtForm);
        if (!res.ok) throw new Error(`Cập nhật sân thất bại: ${res.status}`);
      } else {
        // POST /api/courts
        const res = await api.createCourt(courtForm);
        if (!res.ok) throw new Error(`Tạo sân thất bại: ${res.status}`);
      }
      await fetchCourts();
      setCourtModal(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteCourt = async (id) => {
    setSaving(true);
    setError(null);
    try {
      const res = await api.deleteCourt(id);
      if (!res.ok) throw new Error(`Xóa sân thất bại: ${res.status}`);
      await fetchCourts();
      setDeleteConfirm(null);
    } catch (err) {
      setError(err.message);
      setDeleteConfirm(null);
    } finally {
      setSaving(false);
    }
  };

  // Toggle status — gọi PUT ngay trên bảng (không mở modal)
  const toggleStatus = async (court) => {
    const updated = {
      ...court,
      status: court.status === "active" ? "maintenance" : "active",
    };
    setSaving(true);
    try {
      const res = await api.updateCourt(court.id, {
        branchId: updated.branchId,
        courtTypeId: updated.courtTypeId,
        name: updated.name,
        status: updated.status,
      });
      if (!res.ok) throw new Error(`Đổi trạng thái thất bại: ${res.status}`);
      await fetchCourts();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // LOADING SKELETON
  // ============================================================
  const isPageLoading =
    loading.branches || loading.courts || loading.courtTypes;

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
            <span className={styles.headerIcon}>🏸</span>
            <div>
              <h1 className={styles.headerTitle}>Quản lý Cơ sở & Sân</h1>
              <p className={styles.headerSub}>
                Admin · Hệ thống chuỗi sân cầu lông
              </p>
            </div>
          </div>
          <div className={styles.headerRight}>
            {" "}
            {/* ← ĐỔI từ headerStats thành headerRight */}
            <div className={styles.headerStats}>
              <div className={styles.statChip}>
                <span className={styles.statNum}>{branches.length}</span>
                <span className={styles.statLabel}>Chi nhánh</span>
              </div>
              <div className={styles.statChip}>
                <span className={styles.statNum}>
                  {courts.filter((c) => c.status === "active").length}
                </span>
                <span className={styles.statLabel}>Sân hoạt động</span>
              </div>
              <div className={styles.statChipWarn}>
                <span className={styles.statNum}>
                  {courts.filter((c) => c.status === "maintenance").length}
                </span>
                <span className={styles.statLabel}>Bảo trì</span>
              </div>
            </div>
            {/* ← THÊM NÚT LOGOUT */}
            <button className={styles.btnLogout} onClick={handleLogout}>
              <span className={styles.btnLogoutIcon}>🚪</span>
              <span>Đăng xuất</span>
            </button>
          </div>
        </header>

        {/* GLOBAL ERROR BANNER */}
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
            className={`${styles.tab} ${activeTab === "branches" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("branches")}
          >
            🏢 Chi nhánh{" "}
            <span className={styles.tabBadge}>{branches.length}</span>
          </button>
          <button
            className={`${styles.tab} ${activeTab === "courts" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("courts")}
          >
            🏟️ Danh sách sân{" "}
            <span className={styles.tabBadge}>{courts.length}</span>
          </button>
        </div>

        <main className={styles.content}>
          {/* ── LOADING STATE ── */}
          {isPageLoading && (
            <div className={styles.loadingWrap}>
              <div className={styles.spinner} />
              <p>Đang tải dữ liệu...</p>
            </div>
          )}

          {/* ── BRANCHES TAB ── */}
          {!isPageLoading && activeTab === "branches" && (
            <section>
              <div className={styles.toolbar}>
                <div className={styles.searchBox}>
                  <span className={styles.searchIcon}>🔍</span>
                  <input
                    className={styles.searchInput}
                    placeholder="Tìm theo tên, địa chỉ, hotline..."
                    value={branchSearch}
                    onChange={(e) => {
                      setBranchSearch(e.target.value);
                      setBranchPage(1);
                    }}
                  />
                  {branchSearch && (
                    <button
                      className={styles.searchClear}
                      onClick={() => setBranchSearch("")}
                    >
                      ✕
                    </button>
                  )}
                </div>
                <button
                  className={styles.btnPrimary}
                  onClick={openBranchCreate}
                >
                  + Thêm chi nhánh
                </button>
              </div>

              <div className={styles.cardGrid}>
                {paginatedBranches.map((branch) => (
                  <div key={branch.id} className={styles.branchCard}>
                    <div className={styles.branchCardAccent} />
                    <div className={styles.branchCardBody}>
                      <div className={styles.branchIconWrap}>🏢</div>
                      <div className={styles.branchInfo}>
                        <h3 className={styles.branchName}>{branch.name}</h3>
                        <p className={styles.branchMeta}>📍 {branch.address}</p>
                        <p className={styles.branchMeta}>📞 {branch.hotline}</p>
                      </div>
                    </div>
                    <div className={styles.branchCardFooter}>
                      <span className={styles.courtCount}>
                        🏸{" "}
                        {courts.filter((c) => c.branchId === branch.id).length}{" "}
                        sân
                      </span>
                      <div className={styles.actionBtns}>
                        <button
                          className={styles.btnEdit}
                          onClick={() => openBranchEdit(branch)}
                        >
                          ✏️ Sửa
                        </button>
                        <button
                          className={styles.btnDelete}
                          onClick={() =>
                            setDeleteConfirm({ type: "branch", id: branch.id })
                          }
                        >
                          🗑️ Xóa
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {paginatedBranches.length === 0 && (
                  <div className={styles.emptyState}>
                    <span className={styles.emptyIcon}>🏢</span>
                    <p>
                      {branchSearch
                        ? `Không tìm thấy kết quả cho "${branchSearch}"`
                        : "Chưa có chi nhánh nào."}
                    </p>
                  </div>
                )}
              </div>

              <Pagination
                currentPage={branchPage}
                totalPages={Math.max(
                  1,
                  Math.ceil(filteredBranches.length / branchItemsPerPage),
                )}
                itemsPerPage={branchItemsPerPage}
                totalItems={filteredBranches.length}
                onPageChange={setBranchPage}
                onItemsPerPageChange={(val) => {
                  setBranchItemsPerPage(val);
                  setBranchPage(1);
                }}
              />
            </section>
          )}

          {/* ── COURTS TAB ── */}
          {!isPageLoading && activeTab === "courts" && (
            <section>
              <div className={styles.toolbar}>
                <div className={styles.toolbarLeft}>
                  <div className={styles.searchBox}>
                    <span className={styles.searchIcon}>🔍</span>
                    <input
                      className={styles.searchInput}
                      placeholder="Tìm tên sân..."
                      value={courtSearch}
                      onChange={(e) => {
                        setCourtSearch(e.target.value);
                        setCourtPage(1);
                      }}
                    />
                    {courtSearch && (
                      <button
                        className={styles.searchClear}
                        onClick={() => setCourtSearch("")}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <select
                    className={styles.filterSelect}
                    value={filterBranch}
                    onChange={(e) => {
                      setFilterBranch(e.target.value);
                      setCourtPage(1);
                    }}
                  >
                    <option value="all">Tất cả chi nhánh</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                  <select
                    className={styles.filterSelect}
                    value={filterStatus}
                    onChange={(e) => {
                      setFilterStatus(e.target.value);
                      setCourtPage(1);
                    }}
                  >
                    <option value="all">Tất cả trạng thái</option>
                    <option value="active">✅ Hoạt động</option>
                    <option value="maintenance">🔧 Bảo trì</option>
                  </select>
                </div>
                <button className={styles.btnPrimary} onClick={openCourtCreate}>
                  + Thêm sân
                </button>
              </div>

              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th
                        className={styles.thSortable}
                        onClick={() => handleSort("name")}
                      >
                        Tên sân{" "}
                        <SortIcon
                          field="name"
                          sortField={sortField}
                          sortDirection={sortDirection}
                        />
                      </th>
                      <th
                        className={styles.thSortable}
                        onClick={() => handleSort("branchId")}
                      >
                        Chi nhánh{" "}
                        <SortIcon
                          field="branchId"
                          sortField={sortField}
                          sortDirection={sortDirection}
                        />
                      </th>
                      <th
                        className={styles.thSortable}
                        onClick={() => handleSort("courtTypeId")}
                      >
                        Loại sân{" "}
                        <SortIcon
                          field="courtTypeId"
                          sortField={sortField}
                          sortDirection={sortDirection}
                        />
                      </th>
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
                    {paginatedCourts.map((court, idx) => (
                      <tr
                        key={court.id}
                        className={styles.tableRow}
                        style={{ animationDelay: `${idx * 0.04}s` }}
                      >
                        <td className={styles.tdCourtName}>{court.name}</td>
                        <td>{getBranchName(court.branchId)}</td>
                        <td>
                          <span className={styles.typeBadge}>
                            {getCourtTypeName(court.courtTypeId)}
                          </span>
                        </td>
                        <td>
                          <button
                            className={`${styles.statusBadge} ${court.status === "active" ? styles.statusActive : styles.statusMaintenance}`}
                            onClick={() => toggleStatus(court)}
                            disabled={saving}
                            title="Nhấn để đổi trạng thái"
                          >
                            {court.status === "active"
                              ? "✅ Hoạt động"
                              : "🔧 Bảo trì"}
                          </button>
                        </td>
                        <td>
                          <div className={styles.actionBtns}>
                            <button
                              className={styles.btnEdit}
                              onClick={() => openCourtEdit(court)}
                            >
                              ✏️ Sửa
                            </button>
                            <button
                              className={styles.btnDelete}
                              onClick={() =>
                                setDeleteConfirm({
                                  type: "court",
                                  id: court.id,
                                })
                              }
                            >
                              🗑️ Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredCourts.length === 0 && (
                  <div className={styles.emptyState}>
                    <span className={styles.emptyIcon}>🏟️</span>
                    <p>Không tìm thấy sân nào phù hợp.</p>
                  </div>
                )}
              </div>

              <Pagination
                currentPage={courtPage}
                totalPages={Math.max(
                  1,
                  Math.ceil(filteredCourts.length / courtItemsPerPage),
                )}
                itemsPerPage={courtItemsPerPage}
                totalItems={filteredCourts.length}
                onPageChange={setCourtPage}
                onItemsPerPageChange={(val) => {
                  setCourtItemsPerPage(val);
                  setCourtPage(1);
                }}
              />
            </section>
          )}
        </main>
      </div>

      {/* ── SAVING OVERLAY ── */}
      {saving && (
        <div className={styles.savingOverlay}>
          <div className={styles.savingBox}>
            <div className={styles.spinner} />
            <span>Đang xử lý...</span>
          </div>
        </div>
      )}

      {/* MODAL — BRANCH */}
      {branchModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => !saving && setBranchModal(false)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleGroup}>
                <span className={styles.modalTitleIcon}>🏢</span>
                <h3 className={styles.modalTitle}>
                  {editingBranchId
                    ? "Chỉnh sửa Chi nhánh"
                    : "Thêm Chi nhánh mới"}
                </h3>
              </div>
              <button
                className={styles.modalClose}
                onClick={() => !saving && setBranchModal(false)}
              >
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Tên chi nhánh <span className={styles.required}>*</span>
                </label>
                <input
                  className={styles.input}
                  placeholder="VD: Cơ sở Quận 9"
                  value={branchForm.name}
                  onChange={(e) =>
                    setBranchForm({ ...branchForm, name: e.target.value })
                  }
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Địa chỉ <span className={styles.required}>*</span>
                </label>
                <input
                  className={styles.input}
                  placeholder="VD: 123 Đường Lê Văn Việt, Q.9"
                  value={branchForm.address}
                  onChange={(e) =>
                    setBranchForm({ ...branchForm, address: e.target.value })
                  }
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Hotline <span className={styles.required}>*</span>
                </label>
                <input
                  className={styles.input}
                  placeholder="VD: 0901234567"
                  value={branchForm.hotline}
                  onChange={(e) =>
                    setBranchForm({ ...branchForm, hotline: e.target.value })
                  }
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button
                className={styles.btnCancel}
                disabled={saving}
                onClick={() => setBranchModal(false)}
              >
                Hủy
              </button>
              <button
                className={styles.btnPrimary}
                disabled={saving}
                onClick={saveBranch}
              >
                {saving
                  ? "⏳ Đang lưu..."
                  : editingBranchId
                    ? "💾 Lưu thay đổi"
                    : "✅ Tạo chi nhánh"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL — COURT */}
      {courtModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => !saving && setCourtModal(false)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleGroup}>
                <span className={styles.modalTitleIcon}>🏸</span>
                <h3 className={styles.modalTitle}>
                  {editingCourtId ? "Chỉnh sửa Sân" : "Thêm Sân mới"}
                </h3>
              </div>
              <button
                className={styles.modalClose}
                onClick={() => !saving && setCourtModal(false)}
              >
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Tên sân <span className={styles.required}>*</span>
                </label>
                <input
                  className={styles.input}
                  placeholder="VD: Sân số 1"
                  value={courtForm.name}
                  onChange={(e) =>
                    setCourtForm({ ...courtForm, name: e.target.value })
                  }
                />
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Chi nhánh <span className={styles.required}>*</span>
                  </label>
                  <select
                    className={styles.input}
                    value={courtForm.branchId}
                    onChange={(e) =>
                      setCourtForm({
                        ...courtForm,
                        branchId: Number(e.target.value),
                      })
                    }
                  >
                    <option value="">-- Chọn chi nhánh --</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Loại mặt sân <span className={styles.required}>*</span>
                  </label>
                  <select
                    className={styles.input}
                    value={courtForm.courtTypeId}
                    onChange={(e) =>
                      setCourtForm({
                        ...courtForm,
                        courtTypeId: Number(e.target.value),
                      })
                    }
                  >
                    <option value="">-- Chọn loại sân --</option>
                    {courtTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Trạng thái</label>
                <div className={styles.radioGroup}>
                  <label
                    className={`${styles.radioCard} ${courtForm.status === "active" ? styles.radioCardActive : ""}`}
                  >
                    <input
                      type="radio"
                      value="active"
                      checked={courtForm.status === "active"}
                      onChange={() =>
                        setCourtForm({ ...courtForm, status: "active" })
                      }
                    />
                    <span>✅ Hoạt động</span>
                  </label>
                  <label
                    className={`${styles.radioCard} ${courtForm.status === "maintenance" ? styles.radioCardMaintenance : ""}`}
                  >
                    <input
                      type="radio"
                      value="maintenance"
                      checked={courtForm.status === "maintenance"}
                      onChange={() =>
                        setCourtForm({ ...courtForm, status: "maintenance" })
                      }
                    />
                    <span>🔧 Bảo trì</span>
                  </label>
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button
                className={styles.btnCancel}
                disabled={saving}
                onClick={() => setCourtModal(false)}
              >
                Hủy
              </button>
              <button
                className={styles.btnPrimary}
                disabled={saving}
                onClick={saveCourt}
              >
                {saving
                  ? "⏳ Đang lưu..."
                  : editingCourtId
                    ? "💾 Lưu thay đổi"
                    : "✅ Tạo sân"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL — DELETE */}
      {deleteConfirm && (
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
              {deleteConfirm.type === "branch"
                ? "⚠️ Xóa chi nhánh sẽ xóa toàn bộ sân bên trong. Hành động này không thể hoàn tác!"
                : "Bạn có chắc muốn xóa sân này không?"}
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
                onClick={() =>
                  deleteConfirm.type === "branch"
                    ? confirmDeleteBranch(deleteConfirm.id)
                    : confirmDeleteCourt(deleteConfirm.id)
                }
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
export default BranchCourtManager;
