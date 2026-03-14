import { useState, useEffect, useCallback, useMemo } from "react";
import styles from "./PriceConfigManager.module.css";
import SidebarMenu from "../../../components/Admin/SidebarMenu";
import Pagination from "../../../components/Admin/Pagination";
import { useNavigate } from "react-router-dom";

const API_BASE = "http://localhost:5043/api";

const api = {
  getPriceConfigs: () => fetch(`${API_BASE}/admin/price-configs`),
  createPriceConfig: (data) =>
    fetch(`${API_BASE}/admin/price-configs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  updatePriceConfig: (id, data) =>
    fetch(`${API_BASE}/admin/price-configs/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  deletePriceConfig: (id) =>
    fetch(`${API_BASE}/admin/price-configs/${id}`, { method: "DELETE" }),
  bulkUpsert: (items) =>
    fetch(`${API_BASE}/admin/price-configs/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    }),
  getCourtTypes: () => fetch(`${API_BASE}/courttypes`),
  getTimeSlots: () => fetch(`${API_BASE}/timeslots`),
};

const DAY_LABELS = [
  { value: 0, short: "CN", label: "Chủ nhật" },
  { value: 1, short: "T2", label: "Thứ 2" },
  { value: 2, short: "T3", label: "Thứ 3" },
  { value: 3, short: "T4", label: "Thứ 4" },
  { value: 4, short: "T5", label: "Thứ 5" },
  { value: 5, short: "T6", label: "Thứ 6" },
  { value: 6, short: "T7", label: "Thứ 7" },
];

const WEEKEND = [0, 6];
const WEEKDAYS = [1, 2, 3, 4, 5];

// Form chỉnh sửa đơn lẻ
const emptyEditForm = {
  courtTypeId: "",
  timeSlotId: "",
  dayOfWeek: "",
  price: "",
};

// Form tạo nhiều cùng lúc
const emptyMultiForm = {
  courtTypeIds: [],
  timeSlotIds: [],
  dayOfWeeks: [],
  price: "",
};

const formatTime = (t) => (t ? t.slice(0, 5) : "");
const getSlotLabel = (slot) => {
  if (!slot) return "";
  if (slot.label) return slot.label;
  return `${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}`;
};
const formatPrice = (p) =>
  p != null ? new Intl.NumberFormat("vi-VN").format(p) + "đ" : "—";

// Toggle giá trị trong mảng
const toggleArr = (arr, val) =>
  arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];

const VIEW_LIST = "list";
const VIEW_GRID = "grid";

const PriceConfigManager = () => {
  const navigate = useNavigate();

  const [configs, setConfigs] = useState([]);
  const [courtTypes, setCourtTypes] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);

  const [view, setView] = useState(VIEW_GRID);
  const [filterCourtType, setFilterCourtType] = useState("all");
  const [filterDay, setFilterDay] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Modal tạo mới (multi-select)
  const [createModal, setCreateModal] = useState(false);
  const [multiForm, setMultiForm] = useState(emptyMultiForm);

  // Modal chỉnh sửa đơn
  const [editModal, setEditModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(emptyEditForm);

  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Pagination — list view
  const [listPage, setListPage] = useState(1);
  const [listItemsPerPage, setListItemsPerPage] = useState(10);

  // Grid
  const [gridCourtType, setGridCourtType] = useState("");
  const [gridEdits, setGridEdits] = useState({});
  const [gridDirty, setGridDirty] = useState(false);

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
      const [cfgRes, ctRes, tsRes] = await Promise.all([
        api.getPriceConfigs(),
        api.getCourtTypes(),
        api.getTimeSlots(),
      ]);
      if (!cfgRes.ok)
        throw new Error(`Lỗi tải cấu hình giá (${cfgRes.status})`);
      if (!ctRes.ok) throw new Error(`Lỗi tải loại sân (${ctRes.status})`);
      if (!tsRes.ok) throw new Error(`Lỗi tải khung giờ (${tsRes.status})`);

      const [cfgData, ctData, tsData] = await Promise.all([
        cfgRes.json(),
        ctRes.json(),
        tsRes.json(),
      ]);

      setConfigs(cfgData);
      setCourtTypes(ctData);
      setTimeSlots(
        [...tsData].sort((a, b) =>
          (a.startTime || "").localeCompare(b.startTime || ""),
        ),
      );
      if (ctData.length > 0)
        setGridCourtType((prev) => prev || String(ctData[0].id));
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
  // DERIVED / GRID
  // ============================================================
  const filteredConfigs = useMemo(
    () =>
      configs.filter((c) => {
        const matchCT =
          filterCourtType === "all" ||
          c.courtTypeId === Number(filterCourtType);
        const matchDay =
          filterDay === "all" || c.dayOfWeek === Number(filterDay);
        return matchCT && matchDay;
      }),
    [configs, filterCourtType, filterDay],
  );

  const paginatedConfigs = useMemo(() => {
    const start = (listPage - 1) * listItemsPerPage;
    return filteredConfigs.slice(start, start + listItemsPerPage);
  }, [filteredConfigs, listPage, listItemsPerPage]);

  const gridData = useMemo(() => {
    if (!gridCourtType) return {};
    const map = {};
    configs
      .filter((c) => c.courtTypeId === Number(gridCourtType))
      .forEach((c) => {
        map[`${c.timeSlotId}_${c.dayOfWeek}`] = { id: c.id, price: c.price };
      });
    return map;
  }, [configs, gridCourtType]);

  const getGridPrice = (slotId, day) => {
    const key = `${slotId}_${day}`;
    if (key in gridEdits) return gridEdits[key];
    return gridData[key]?.price != null ? String(gridData[key].price) : "";
  };

  const handleGridChange = (slotId, day, val) => {
    setGridEdits((prev) => ({ ...prev, [`${slotId}_${day}`]: val }));
    setGridDirty(true);
  };

  const saveGrid = async () => {
    if (!gridCourtType) return;
    const items = [];
    for (const [key, val] of Object.entries(gridEdits)) {
      if (!val) continue;
      const price = parseFloat(val);
      if (isNaN(price) || price < 0) continue;
      const [slotId, day] = key.split("_").map(Number);
      items.push({
        courtTypeId: Number(gridCourtType),
        timeSlotId: slotId,
        dayOfWeek: day,
        price,
      });
    }
    if (items.length === 0) {
      setError("Không có thay đổi hợp lệ để lưu.");
      return;
    }
    setSaving(true);
    try {
      const res = await api.bulkUpsert(items);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Lưu thất bại (${res.status})`);
      }
      await fetchAll();
      setGridEdits({});
      setGridDirty(false);
      showSuccess(`✅ Đã lưu ${items.length} cấu hình giá thành công!`);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // CREATE MULTI — tạo nhiều cùng lúc (bulkUpsert)
  // ============================================================
  const openCreate = () => {
    setMultiForm(emptyMultiForm);
    setError(null);
    setCreateModal(true);
  };

  // Số tổ hợp sẽ tạo = |courtTypes| × |timeSlots| × |days|
  const comboCount =
    multiForm.courtTypeIds.length *
    multiForm.timeSlotIds.length *
    multiForm.dayOfWeeks.length;

  const saveMulti = async () => {
    const { courtTypeIds, timeSlotIds, dayOfWeeks, price } = multiForm;
    if (
      !courtTypeIds.length ||
      !timeSlotIds.length ||
      !dayOfWeeks.length ||
      !price
    ) {
      setError(
        "Vui lòng chọn ít nhất 1 loại sân, 1 khung giờ, 1 ngày và nhập giá.",
      );
      return;
    }
    const priceVal = parseFloat(price);
    if (isNaN(priceVal) || priceVal < 0) {
      setError("Giá thuê phải là số không âm.");
      return;
    }

    // Tạo tất cả tổ hợp
    const items = [];
    for (const ctId of courtTypeIds)
      for (const tsId of timeSlotIds)
        for (const dow of dayOfWeeks)
          items.push({
            courtTypeId: ctId,
            timeSlotId: tsId,
            dayOfWeek: dow,
            price: priceVal,
          });

    setSaving(true);
    setError(null);
    try {
      const res = await api.bulkUpsert(items);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Tạo thất bại (${res.status})`);
      }
      await fetchAll();
      setCreateModal(false);
      showSuccess(`✅ Đã tạo ${items.length} cấu hình giá thành công!`);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // EDIT SINGLE
  // ============================================================
  const openEdit = (c) => {
    setEditForm({
      courtTypeId: String(c.courtTypeId),
      timeSlotId: String(c.timeSlotId),
      dayOfWeek: String(c.dayOfWeek),
      price: String(c.price),
    });
    setEditingId(c.id);
    setError(null);
    setEditModal(true);
  };

  const saveEdit = async () => {
    if (
      !editForm.courtTypeId ||
      !editForm.timeSlotId ||
      editForm.dayOfWeek === "" ||
      !editForm.price
    ) {
      setError("Vui lòng điền đầy đủ tất cả các trường.");
      return;
    }
    const priceVal = parseFloat(editForm.price);
    if (isNaN(priceVal) || priceVal < 0) {
      setError("Giá thuê phải là số không âm.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await api.updatePriceConfig(editingId, {
        courtTypeId: Number(editForm.courtTypeId),
        timeSlotId: Number(editForm.timeSlotId),
        dayOfWeek: Number(editForm.dayOfWeek),
        price: priceVal,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Cập nhật thất bại (${res.status})`);
      }
      await fetchAll();
      setEditModal(false);
      showSuccess("✅ Cập nhật giá thành công!");
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // DELETE
  // ============================================================
  const confirmDelete = async (id) => {
    setSaving(true);
    try {
      const res = await api.deletePriceConfig(id);
      if (!res.ok) throw new Error(`Xóa thất bại (${res.status})`);
      await fetchAll();
      setDeleteConfirm(null);
      showSuccess("🗑️ Đã xóa cấu hình giá.");
    } catch (e) {
      setError(e.message);
      setDeleteConfirm(null);
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // STATS
  // ============================================================
  const stats = useMemo(
    () => ({
      total: configs.length,
      peakCount: configs.filter((c) => WEEKEND.includes(c.dayOfWeek)).length,
      maxPrice: configs.length ? Math.max(...configs.map((c) => c.price)) : 0,
    }),
    [configs],
  );

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
            <span className={styles.headerIcon}>💰</span>
            <div>
              <h1 className={styles.headerTitle}>Cấu hình Bảng Giá</h1>
              <p className={styles.headerSub}>
                Admin · Giá thuê sân theo khung giờ & ngày
              </p>
            </div>
          </div>
          <div className={styles.headerRight}>
            <div className={styles.headerStats}>
              <div className={styles.statChip}>
                <span className={styles.statNum}>{stats.total}</span>
                <span className={styles.statLabel}>Cấu hình</span>
              </div>
              <div className={styles.statChipWarn}>
                <span className={styles.statNum}>{stats.peakCount}</span>
                <span className={styles.statLabel}>Cuối tuần</span>
              </div>
              <div className={styles.statChipAccent}>
                <span className={styles.statNum}>
                  {stats.maxPrice > 0
                    ? new Intl.NumberFormat("vi-VN", {
                        notation: "compact",
                        maximumFractionDigits: 0,
                      }).format(stats.maxPrice) + "đ"
                    : "—"}
                </span>
                <span className={styles.statLabel}>Giá cao nhất</span>
              </div>
            </div>
            <button className={styles.btnLogout} onClick={handleLogout}>
              <span className={styles.btnLogoutIcon}>🚪</span>
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

        {/* VIEW TABS */}
        <div className={styles.tabBar}>
          <button
            className={`${styles.tab} ${view === VIEW_GRID ? styles.tabActive : ""}`}
            onClick={() => setView(VIEW_GRID)}
          >
            📊 Bảng giá tổng quan
          </button>
          <button
            className={`${styles.tab} ${view === VIEW_LIST ? styles.tabActive : ""}`}
            onClick={() => setView(VIEW_LIST)}
          >
            📋 Danh sách chi tiết
            <span className={styles.tabBadge}>{configs.length}</span>
          </button>
        </div>

        <main className={styles.content}>
          {loading ? (
            <div className={styles.loadingWrap}>
              <div className={styles.spinner} />
              <p>Đang tải dữ liệu...</p>
            </div>
          ) : (
            <>
              {/* ── GRID VIEW ── */}
              {view === VIEW_GRID && (
                <section>
                  <div className={styles.toolbar}>
                    <div className={styles.toolbarLeft}>
                      <label className={styles.toolbarLabel}>Loại sân:</label>
                      <div className={styles.courtTypeTabs}>
                        {courtTypes.map((ct) => (
                          <button
                            key={ct.id}
                            className={`${styles.ctTab} ${gridCourtType === String(ct.id) ? styles.ctTabActive : ""}`}
                            onClick={() => {
                              setGridCourtType(String(ct.id));
                              setGridEdits({});
                              setGridDirty(false);
                            }}
                          >
                            {ct.name}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className={styles.toolbarRight}>
                      {gridDirty && (
                        <span className={styles.dirtyBadge}>
                          ⚡ Có thay đổi chưa lưu
                        </span>
                      )}
                      <button
                        className={styles.btnOutline}
                        onClick={() => {
                          setGridEdits({});
                          setGridDirty(false);
                        }}
                        disabled={!gridDirty || saving}
                      >
                        ↺ Hoàn tác
                      </button>
                      <button
                        className={styles.btnPrimary}
                        onClick={saveGrid}
                        disabled={!gridDirty || saving}
                      >
                        {saving ? "⏳ Đang lưu..." : "💾 Lưu bảng giá"}
                      </button>
                    </div>
                  </div>

                  <div className={styles.gridLegend}>
                    <span className={styles.legendItem}>
                      <span className={styles.legendDot} data-type="weekday" />
                      Ngày thường (T2–T6)
                    </span>
                    <span className={styles.legendItem}>
                      <span className={styles.legendDot} data-type="weekend" />
                      Cuối tuần (T7, CN)
                    </span>
                    <span className={styles.legendItem}>
                      <span className={styles.legendDot} data-type="empty" />
                      Chưa cấu hình
                    </span>
                  </div>

                  {timeSlots.length === 0 ? (
                    <div className={styles.emptyState}>
                      <span className={styles.emptyIcon}>⏰</span>
                      <p>Chưa có khung giờ nào trong database.</p>
                    </div>
                  ) : (
                    <div className={styles.gridWrapper}>
                      <table className={styles.gridTable}>
                        <thead>
                          <tr>
                            <th className={styles.gridThSlot}>Khung giờ</th>
                            {DAY_LABELS.map((d) => (
                              <th
                                key={d.value}
                                className={`${styles.gridTh} ${WEEKEND.includes(d.value) ? styles.gridThWeekend : styles.gridThWeekday}`}
                              >
                                <span className={styles.gridDayShort}>
                                  {d.short}
                                </span>
                                <span className={styles.gridDayFull}>
                                  {d.label}
                                </span>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {timeSlots.map((slot, idx) => (
                            <tr
                              key={slot.id}
                              className={styles.gridRow}
                              style={{ animationDelay: `${idx * 0.03}s` }}
                            >
                              <td className={styles.gridTdSlot}>
                                <span className={styles.slotBadge}>
                                  {formatTime(slot.startTime)}–
                                  {formatTime(slot.endTime)}
                                </span>
                              </td>
                              {DAY_LABELS.map((d) => {
                                const key = `${slot.id}_${d.value}`;
                                const rawVal = getGridPrice(slot.id, d.value);
                                const isEdited = key in gridEdits;
                                const existInDB = gridData[key] != null;
                                const isWeekend = WEEKEND.includes(d.value);
                                return (
                                  <td
                                    key={d.value}
                                    className={`${styles.gridTdPrice} ${isWeekend ? styles.gridCellWeekend : styles.gridCellWeekday} ${isEdited ? styles.gridCellEdited : ""} ${!existInDB && !isEdited ? styles.gridCellEmpty : ""}`}
                                  >
                                    <div className={styles.priceInputWrap}>
                                      <input
                                        type="number"
                                        className={styles.priceInput}
                                        value={rawVal}
                                        onChange={(e) =>
                                          handleGridChange(
                                            slot.id,
                                            d.value,
                                            e.target.value,
                                          )
                                        }
                                        placeholder="—"
                                        min="0"
                                      />
                                      {rawVal && (
                                        <span className={styles.priceUnit}>
                                          đ
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <p className={styles.gridHint}>
                    💡 Nhập giá trực tiếp vào ô, sau đó nhấn{" "}
                    <strong>Lưu bảng giá</strong>.
                  </p>
                </section>
              )}

              {/* ── LIST VIEW ── */}
              {view === VIEW_LIST && (
                <section>
                  <div className={styles.toolbar}>
                    <div className={styles.toolbarLeft}>
                      <select
                        className={styles.filterSelect}
                        value={filterCourtType}
                        onChange={(e) => setFilterCourtType(e.target.value)}
                      >
                        <option value="all">🏸 Tất cả loại sân</option>
                        {courtTypes.map((ct) => (
                          <option key={ct.id} value={ct.id}>
                            {ct.name}
                          </option>
                        ))}
                      </select>
                      <select
                        className={styles.filterSelect}
                        value={filterDay}
                        onChange={(e) => setFilterDay(e.target.value)}
                      >
                        <option value="all">📅 Tất cả các ngày</option>
                        {DAY_LABELS.map((d) => (
                          <option key={d.value} value={d.value}>
                            {d.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button className={styles.btnPrimary} onClick={openCreate}>
                      + Thêm cấu hình giá
                    </button>
                  </div>

                  <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Loại sân</th>
                          <th>Khung giờ</th>
                          <th>Ngày trong tuần</th>
                          <th>Giá thuê</th>
                          <th>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedConfigs.map((c, idx) => {
                          const dayInfo = DAY_LABELS.find(
                            (d) => d.value === c.dayOfWeek,
                          );
                          const isWeekend = WEEKEND.includes(c.dayOfWeek);
                          return (
                            <tr
                              key={c.id}
                              className={styles.tableRow}
                              style={{ animationDelay: `${idx * 0.03}s` }}
                            >
                              <td>
                                <span className={styles.typeBadge}>
                                  🏸 {c.courtTypeName}
                                </span>
                              </td>
                              <td>
                                <span className={styles.slotBadge}>
                                  ⏰ {c.timeSlotLabel}
                                </span>
                              </td>
                              <td>
                                <span
                                  className={`${styles.dayBadge} ${isWeekend ? styles.dayBadgeWeekend : styles.dayBadgeWeekday}`}
                                >
                                  {dayInfo?.label}
                                </span>
                              </td>
                              <td>
                                <span className={styles.priceDisplay}>
                                  {formatPrice(c.price)}
                                </span>
                              </td>
                              <td>
                                <div className={styles.actionBtns}>
                                  <button
                                    className={styles.btnEdit}
                                    onClick={() => openEdit(c)}
                                  >
                                    ✏️ Sửa
                                  </button>
                                  <button
                                    className={styles.btnDelete}
                                    onClick={() => setDeleteConfirm(c.id)}
                                  >
                                    🗑️ Xóa
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {filteredConfigs.length === 0 && (
                      <div className={styles.emptyState}>
                        <span className={styles.emptyIcon}>💰</span>
                        <p>Chưa có cấu hình giá nào phù hợp.</p>
                      </div>
                    )}
                  </div>

                  <Pagination
                    currentPage={listPage}
                    totalPages={Math.max(
                      1,
                      Math.ceil(filteredConfigs.length / listItemsPerPage),
                    )}
                    itemsPerPage={listItemsPerPage}
                    totalItems={filteredConfigs.length}
                    onPageChange={setListPage}
                    onItemsPerPageChange={(val) => {
                      setListItemsPerPage(val);
                      setListPage(1);
                    }}
                  />
                </section>
              )}
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

      {/* ================================================================
          MODAL — TẠO NHIỀU CÙNG LÚC (multi-select)
          ================================================================ */}
      {createModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => !saving && setCreateModal(false)}
        >
          <div
            className={`${styles.modal} ${styles.modalWide}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleGroup}>
                <span className={styles.modalTitleIcon}>💰</span>
                <h3 className={styles.modalTitle}>Thêm cấu hình giá</h3>
              </div>
              <button
                className={styles.modalClose}
                onClick={() => !saving && setCreateModal(false)}
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              {error && <div className={styles.inlineError}>⚠️ {error}</div>}

              {/* ── LOẠI SÂN ── */}
              <div className={styles.formGroup}>
                <div className={styles.multiLabelRow}>
                  <label className={styles.label}>
                    Loại sân <span className={styles.required}>*</span>
                  </label>
                  <div className={styles.selectAllBtns}>
                    <button
                      type="button"
                      className={styles.selAllBtn}
                      onClick={() =>
                        setMultiForm((f) => ({
                          ...f,
                          courtTypeIds: courtTypes.map((ct) => ct.id),
                        }))
                      }
                    >
                      Chọn tất cả
                    </button>
                    <button
                      type="button"
                      className={styles.selAllBtn}
                      onClick={() =>
                        setMultiForm((f) => ({ ...f, courtTypeIds: [] }))
                      }
                    >
                      Bỏ chọn
                    </button>
                  </div>
                </div>
                <div className={styles.multiChipGroup}>
                  {courtTypes.map((ct) => {
                    const active = multiForm.courtTypeIds.includes(ct.id);
                    return (
                      <button
                        key={ct.id}
                        type="button"
                        className={`${styles.multiChip} ${active ? styles.multiChipActive : ""}`}
                        onClick={() =>
                          setMultiForm((f) => ({
                            ...f,
                            courtTypeIds: toggleArr(f.courtTypeIds, ct.id),
                          }))
                        }
                      >
                        🏸 {ct.name}
                        {active && <span className={styles.chipCheck}>✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── KHUNG GIỜ ── */}
              <div className={styles.formGroup}>
                <div className={styles.multiLabelRow}>
                  <label className={styles.label}>
                    Khung giờ <span className={styles.required}>*</span>
                  </label>
                  <div className={styles.selectAllBtns}>
                    <button
                      type="button"
                      className={styles.selAllBtn}
                      onClick={() =>
                        setMultiForm((f) => ({
                          ...f,
                          timeSlotIds: timeSlots.map((ts) => ts.id),
                        }))
                      }
                    >
                      Chọn tất cả
                    </button>
                    <button
                      type="button"
                      className={styles.selAllBtn}
                      onClick={() =>
                        setMultiForm((f) => ({ ...f, timeSlotIds: [] }))
                      }
                    >
                      Bỏ chọn
                    </button>
                  </div>
                </div>
                {/* Dropdown multi-select — Ctrl+Click để chọn nhiều */}
                <select
                  multiple
                  className={styles.multiSelect}
                  size={Math.min(timeSlots.length, 8)}
                  value={multiForm.timeSlotIds.map(String)}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions).map(
                      (o) => Number(o.value),
                    );
                    setMultiForm((f) => ({ ...f, timeSlotIds: selected }));
                  }}
                >
                  {timeSlots.map((ts) => (
                    <option key={ts.id} value={ts.id}>
                      {getSlotLabel(ts)}
                    </option>
                  ))}
                </select>
                <p className={styles.selectHint}>
                  💡 Giữ <kbd>Ctrl</kbd> (Windows) hoặc <kbd>⌘ Cmd</kbd> (Mac)
                  để chọn nhiều khung giờ
                </p>
              </div>

              {/* ── NGÀY TRONG TUẦN ── */}
              <div className={styles.formGroup}>
                <div className={styles.multiLabelRow}>
                  <label className={styles.label}>
                    Ngày trong tuần <span className={styles.required}>*</span>
                  </label>
                  <div className={styles.selectAllBtns}>
                    <button
                      type="button"
                      className={styles.selAllBtn}
                      onClick={() =>
                        setMultiForm((f) => ({
                          ...f,
                          dayOfWeeks: [0, 1, 2, 3, 4, 5, 6],
                        }))
                      }
                    >
                      Cả tuần
                    </button>
                    <button
                      type="button"
                      className={styles.selAllBtn}
                      onClick={() =>
                        setMultiForm((f) => ({ ...f, dayOfWeeks: WEEKDAYS }))
                      }
                    >
                      T2–T6
                    </button>
                    <button
                      type="button"
                      className={styles.selAllBtn}
                      onClick={() =>
                        setMultiForm((f) => ({ ...f, dayOfWeeks: WEEKEND }))
                      }
                    >
                      Cuối tuần
                    </button>
                    <button
                      type="button"
                      className={styles.selAllBtn}
                      onClick={() =>
                        setMultiForm((f) => ({ ...f, dayOfWeeks: [] }))
                      }
                    >
                      Bỏ chọn
                    </button>
                  </div>
                </div>
                <div className={styles.dayGrid}>
                  {DAY_LABELS.map((d) => {
                    const active = multiForm.dayOfWeeks.includes(d.value);
                    const isWeekend = WEEKEND.includes(d.value);
                    return (
                      <button
                        key={d.value}
                        type="button"
                        className={`${styles.dayBtn} ${active ? (isWeekend ? styles.dayBtnWeekendActive : styles.dayBtnActive) : ""}`}
                        onClick={() =>
                          setMultiForm((f) => ({
                            ...f,
                            dayOfWeeks: toggleArr(f.dayOfWeeks, d.value),
                          }))
                        }
                      >
                        <span className={styles.dayBtnShort}>{d.short}</span>
                        <span className={styles.dayBtnFull}>{d.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── GIÁ ── */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Giá thuê (VNĐ) <span className={styles.required}>*</span>
                </label>
                <div className={styles.priceFieldWrap}>
                  <input
                    type="number"
                    className={`${styles.input} ${styles.priceField}`}
                    placeholder="VD: 150000"
                    value={multiForm.price}
                    min="0"
                    onChange={(e) =>
                      setMultiForm((f) => ({ ...f, price: e.target.value }))
                    }
                  />
                  <span className={styles.priceFieldUnit}>đ</span>
                  {multiForm.price && !isNaN(multiForm.price) && (
                    <span className={styles.pricePreview}>
                      = {new Intl.NumberFormat("vi-VN").format(multiForm.price)}{" "}
                      đồng
                    </span>
                  )}
                </div>
                <div className={styles.quickFill}>
                  <span className={styles.quickFillLabel}>Điền nhanh:</span>
                  {[80000, 100000, 120000, 150000, 200000].map((v) => (
                    <button
                      key={v}
                      type="button"
                      className={styles.quickFillBtn}
                      onClick={() =>
                        setMultiForm((f) => ({ ...f, price: String(v) }))
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

              {/* ── PREVIEW SỐ TỔ HỢP ── */}
              {comboCount > 0 && (
                <div className={styles.comboBadge}>
                  🎯 Sẽ tạo / cập nhật <strong>{comboCount}</strong> cấu hình
                  giá &nbsp;({multiForm.courtTypeIds.length} loại sân ×{" "}
                  {multiForm.timeSlotIds.length} khung giờ ×{" "}
                  {multiForm.dayOfWeeks.length} ngày)
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button
                className={styles.btnCancel}
                disabled={saving}
                onClick={() => setCreateModal(false)}
              >
                Hủy
              </button>
              <button
                className={styles.btnPrimary}
                disabled={saving || comboCount === 0}
                onClick={saveMulti}
              >
                {saving
                  ? "⏳ Đang lưu..."
                  : `✅ Tạo ${comboCount > 0 ? comboCount + " cấu hình" : ""}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================
          MODAL — CHỈNH SỬA ĐƠN LẺ
          ================================================================ */}
      {editModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => !saving && setEditModal(false)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleGroup}>
                <span className={styles.modalTitleIcon}>✏️</span>
                <h3 className={styles.modalTitle}>Chỉnh sửa cấu hình giá</h3>
              </div>
              <button
                className={styles.modalClose}
                onClick={() => !saving && setEditModal(false)}
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              {error && <div className={styles.inlineError}>⚠️ {error}</div>}

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Loại sân <span className={styles.required}>*</span>
                  </label>
                  <select
                    className={styles.input}
                    value={editForm.courtTypeId}
                    onChange={(e) =>
                      setEditForm({ ...editForm, courtTypeId: e.target.value })
                    }
                  >
                    <option value="">-- Chọn loại sân --</option>
                    {courtTypes.map((ct) => (
                      <option key={ct.id} value={ct.id}>
                        {ct.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Khung giờ <span className={styles.required}>*</span>
                  </label>
                  <select
                    className={styles.input}
                    value={editForm.timeSlotId}
                    onChange={(e) =>
                      setEditForm({ ...editForm, timeSlotId: e.target.value })
                    }
                  >
                    <option value="">-- Chọn khung giờ --</option>
                    {timeSlots.map((ts) => (
                      <option key={ts.id} value={ts.id}>
                        {getSlotLabel(ts)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Ngày trong tuần <span className={styles.required}>*</span>
                </label>
                <div className={styles.dayGrid}>
                  {DAY_LABELS.map((d) => (
                    <button
                      key={d.value}
                      type="button"
                      className={`${styles.dayBtn} ${editForm.dayOfWeek === String(d.value) ? (WEEKEND.includes(d.value) ? styles.dayBtnWeekendActive : styles.dayBtnActive) : ""}`}
                      onClick={() =>
                        setEditForm({ ...editForm, dayOfWeek: String(d.value) })
                      }
                    >
                      <span className={styles.dayBtnShort}>{d.short}</span>
                      <span className={styles.dayBtnFull}>{d.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Giá thuê (VNĐ) <span className={styles.required}>*</span>
                </label>
                <div className={styles.priceFieldWrap}>
                  <input
                    type="number"
                    className={`${styles.input} ${styles.priceField}`}
                    placeholder="VD: 150000"
                    value={editForm.price}
                    min="0"
                    onChange={(e) =>
                      setEditForm({ ...editForm, price: e.target.value })
                    }
                  />
                  <span className={styles.priceFieldUnit}>đ</span>
                  {editForm.price && !isNaN(editForm.price) && (
                    <span className={styles.pricePreview}>
                      = {new Intl.NumberFormat("vi-VN").format(editForm.price)}{" "}
                      đồng
                    </span>
                  )}
                </div>
                <div className={styles.quickFill}>
                  <span className={styles.quickFillLabel}>Điền nhanh:</span>
                  {[80000, 100000, 120000, 150000, 200000].map((v) => (
                    <button
                      key={v}
                      type="button"
                      className={styles.quickFillBtn}
                      onClick={() =>
                        setEditForm({ ...editForm, price: String(v) })
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
            </div>

            <div className={styles.modalFooter}>
              <button
                className={styles.btnCancel}
                disabled={saving}
                onClick={() => setEditModal(false)}
              >
                Hủy
              </button>
              <button
                className={styles.btnPrimary}
                disabled={saving}
                onClick={saveEdit}
              >
                {saving ? "⏳ Đang lưu..." : "💾 Lưu thay đổi"}
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
              Bạn có chắc muốn xóa cấu hình giá này không? Hành động này không
              thể hoàn tác.
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

export default PriceConfigManager;
