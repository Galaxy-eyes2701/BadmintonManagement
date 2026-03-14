import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../../../hooks/useAuth.jsx";
import styles from "./CourtBookingPage.module.css";

const API = "http://localhost:5043/api";

const CourtBookingPage = () => {
  const navigate = useNavigate();
  const authCtx = useAuth();

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

  const [step, setStep] = useState(1);

  // ── Step 1 filters ──
  const [branches, setBranches]         = useState([]);
  const [courtTypes, setCourtTypes]     = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [branchId, setBranchId]         = useState("");
  const [courtTypeId, setCourtTypeId]   = useState("");

  // ── Step 2 ──
  // GET /api/bookings/available-courts → { success, date, data: AvailableCourtDto[] }
  // AvailableCourtDto: { courtId, courtName, courtType, branchId, branchName, branchAddress,
  //   availableSlots: [{ timeSlotId, startTime, endTime, price, isAvailable }] }
  const [courts, setCourts]           = useState([]);
  const [loadingCourts, setLoadingCourts] = useState(false);
  const [selectedCourt, setSelectedCourt] = useState(null);
  // selectedSlots: [{ courtId, timeSlotId, playDate(string), startTime, endTime, price }]
  const [selectedSlots, setSelectedSlots] = useState([]);

  // ── Step 3 voucher ──
  // POST /api/bookings/validate-voucher
  // Body: { code: string, totalAmount: number }
  // Response: { success, data: { isValid, message, discountAmount, code } }
  const [voucherCode, setVoucherCode]   = useState("");
  const [voucherResult, setVoucherResult] = useState(null); // data object
  const [voucherError, setVoucherError] = useState("");
  const [voucherLoading, setVoucherLoading] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState("");
  const [successData, setSuccessData] = useState(null); // BookingResponseDto

  // ── Load dropdowns ──
  // Branch: { id, name, address, hotline }
  // CourtType: { id, name, description }
  useEffect(() => {
    fetch(`${API}/branches`).then(r => r.json()).then(setBranches).catch(console.error);
    fetch(`${API}/courttypes`).then(r => r.json()).then(setCourtTypes).catch(console.error);
  }, []);

  const authHeader = () => { const t = getToken(); return t ? { Authorization: `Bearer ${t}` } : {}; };

  // ── Step 1 → 2: tìm sân ──
  const handleSearch = async () => {
    if (!selectedDate) return;
    setLoadingCourts(true);
    setError("");
    setCourts([]);
    setSelectedCourt(null);
    setSelectedSlots([]);
    try {
      const params = new URLSearchParams({ date: selectedDate });
      if (branchId)    params.append("branchId", branchId);
      if (courtTypeId) params.append("courtTypeId", courtTypeId);

      const res = await fetch(`${API}/bookings/available-courts?${params}`, { headers: authHeader() });
      if (!res.ok) throw new Error("Không thể tải danh sách sân.");
      const json = await res.json();
      // json.data = AvailableCourtDto[]
      setCourts(json.data ?? json);
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingCourts(false);
    }
  };

  // ── Toggle slot ──
  const toggleSlot = (court, slot) => {
    if (!slot.isAvailable) return;
    const key = `${court.courtId}_${slot.timeSlotId}`;
    setSelectedSlots(prev => {
      const exists = prev.find(s => s._key === key);
      if (exists) return prev.filter(s => s._key !== key);
      return [...prev, {
        _key: key,
        courtId: court.courtId,
        timeSlotId: slot.timeSlotId,
        playDate: selectedDate,          // "YYYY-MM-DD"
        startTime: slot.startTime,
        endTime: slot.endTime,
        price: slot.price,
        courtName: court.courtName,
      }];
    });
  };

  const isSlotSelected = (courtId, timeSlotId) =>
    selectedSlots.some(s => s.courtId === courtId && s.timeSlotId === timeSlotId);

  // ── Totals ──
  const subtotal = selectedSlots.reduce((sum, s) => sum + (s.price || 0), 0);
  // voucherResult.discountAmount: decimal (từ Math.Min(voucher.DiscountAmount, totalAmount))
  const discount = voucherResult?.discountAmount ?? 0;
  const total    = Math.max(0, subtotal - discount);

  // ── Validate voucher ──
  // POST /api/bookings/validate-voucher
  const handleValidateVoucher = async () => {
    if (!voucherCode.trim()) return;
    setVoucherLoading(true);
    setVoucherError("");
    setVoucherResult(null);
    try {
      const res = await fetch(`${API}/bookings/validate-voucher`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ code: voucherCode.trim(), totalAmount: subtotal }),
      });
      const json = await res.json();
      // json: { success, data: { isValid, message, discountAmount, code } }
      const data = json.data ?? json;
      if (!res.ok || !data.isValid) throw new Error(data.message || "Mã không hợp lệ.");
      setVoucherResult(data);
    } catch (err) {
      setVoucherError(err.message);
    } finally {
      setVoucherLoading(false);
    }
  };

  // ── Confirm booking ──
  // POST /api/bookings
  // Body: { slots: [{courtId, timeSlotId, playDate: DateTime}], voucherCode?, paymentMethod }
  // Response: { success, data: BookingResponseDto }
  // BookingResponseDto: { bookingId, subTotal, discount, totalPrice, status, createdAt,
  //   voucherApplied, details: BookingDetailItemDto[], payment: PaymentInfoDto }
  const handleConfirm = async () => {
    if (selectedSlots.length === 0) return;
    setSubmitting(true);
    setError("");
    try {
      const payload = {
        slots: selectedSlots.map(s => ({
          courtId:    s.courtId,
          timeSlotId: s.timeSlotId,
          playDate:   s.playDate,   // "YYYY-MM-DD" → backend parse DateTime
        })),
        voucherCode:   voucherResult ? voucherCode.trim() : null,
        paymentMethod: "CASH",      // mặc định thanh toán tại quầy
      };

      const res = await fetch(`${API}/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || `Lỗi ${res.status}`);
      // json.data = BookingResponseDto
      setSuccessData(json.data ?? json);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const fmt = n =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n || 0);

  const fmtDate = str =>
    str ? new Date(str + "T00:00:00").toLocaleDateString("vi-VN", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    }) : "";

  const resetAll = () => {
    setSuccessData(null); setStep(1);
    setSelectedCourt(null); setSelectedSlots([]);
    setVoucherCode(""); setVoucherResult(null); setVoucherError(""); setError("");
    setCourts([]);
  };

  // ── SUCCESS SCREEN ──
  // successData = BookingResponseDto: { bookingId, subTotal, discount, totalPrice, status,
  //   details: [{ courtName, branchName, courtType, timeSlot, playDate, price }],
  //   payment: { method, status, amount } }
  if (successData) {
    const firstDetail = successData.details?.[0];
    return (
      <div className={styles.successWrap}>
        <div className={styles.successCard}>
          <div className={styles.successAnim}>✅</div>
          <h2 className={styles.successTitle}>Đặt sân thành công!</h2>
          <p className={styles.successDesc}>Mã booking #{successData.bookingId} đã được ghi nhận.</p>
          <div className={styles.successInfo}>
            {[
              ["🏸 Sân",       firstDetail?.courtName],
              ["📍 Chi nhánh", firstDetail?.branchName],
              ["📅 Ngày",      firstDetail?.playDate],
              ["⏰ Ca chơi",   successData.details?.map(d => d.timeSlot).join(", ")],
              ["💵 Tạm tính",  fmt(successData.subTotal)],
              ["🏷️ Giảm giá", successData.discount > 0 ? `- ${fmt(successData.discount)}` : "Không"],
              ["💰 Tổng",      fmt(successData.totalPrice)],
            ].map(([label, value]) => value && (
              <div key={label} className={styles.successRow}>
                <span>{label}</span><strong>{value}</strong>
              </div>
            ))}
          </div>
          <div className={styles.successActions}>
            <button className={styles.btnPrimary} onClick={() => navigate("/user/history")}>
              Xem lịch sử đặt sân
            </button>
            <button className={styles.btnOutline} onClick={resetAll}>Đặt thêm sân</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* STEPPER */}
      <div className={styles.stepper}>
        {["Chọn ngày & bộ lọc", "Chọn sân & ca", "Xác nhận"].map((label, i) => (
          <div key={i} className={`${styles.stepItem} ${step > i+1 ? styles.stepDone : ""} ${step === i+1 ? styles.stepCurrent : ""}`}>
            <div className={styles.stepCircle}>{step > i+1 ? "✓" : i+1}</div>
            <span className={styles.stepLabel}>{label}</span>
            {i < 2 && <div className={styles.stepLine} />}
          </div>
        ))}
      </div>

      {/* ── STEP 1 ── */}
      {step === 1 && (
        <section className={styles.filterSection}>
          <div className={styles.filterCard}>
            <h1 className={styles.pageTitle}>🏟️ Tìm sân trống</h1>
            <p className={styles.pageDesc}>Chọn ngày, chi nhánh và loại sân</p>
            <div className={styles.filterGrid}>
              <div className={styles.formGroup}>
                <label className={styles.label}>📅 Ngày chơi *</label>
                <input type="date" className={styles.input} value={selectedDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={e => setSelectedDate(e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>🏢 Chi nhánh</label>
                <select className={styles.input} value={branchId} onChange={e => setBranchId(e.target.value)}>
                  <option value="">Tất cả chi nhánh</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>🏸 Loại sân</label>
                <select className={styles.input} value={courtTypeId} onChange={e => setCourtTypeId(e.target.value)}>
                  <option value="">Tất cả loại sân</option>
                  {courtTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>
            {error && <div className={styles.errorBanner}>⚠️ {error}</div>}
            <button className={styles.btnSearch} onClick={handleSearch}
              disabled={loadingCourts || !selectedDate}>
              {loadingCourts ? "⏳ Đang tìm..." : "🔍 Tìm sân trống"}
            </button>
          </div>
        </section>
      )}

      {/* ── STEP 2 ── */}
      {step === 2 && (
        <section className={styles.step2}>
          <div className={styles.step2Header}>
            <div>
              <h1 className={styles.pageTitle}>🏸 Chọn sân & ca chơi</h1>
              <p className={styles.pageDesc}>Ngày: <strong>{fmtDate(selectedDate)}</strong></p>
            </div>
            <button className={styles.btnBack}
              onClick={() => { setStep(1); setCourts([]); setSelectedCourt(null); setSelectedSlots([]); }}>
              ← Thay đổi ngày
            </button>
          </div>

          {courts.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>🏟️</span>
              <p>Không có sân trống vào ngày này.</p>
              <p className={styles.emptyHint}>Hãy thử chọn ngày khác!</p>
            </div>
          ) : (
            <div className={styles.courtGrid}>
              {courts.map(court => {
                // court: { courtId, courtName, courtType, branchName, branchAddress, availableSlots[] }
                const availCount = court.availableSlots?.filter(s => s.isAvailable).length ?? 0;
                const isChosen   = selectedCourt?.courtId === court.courtId;
                return (
                  <div key={court.courtId}
                    className={`${styles.courtCard} ${isChosen ? styles.courtCardSelected : ""} ${availCount === 0 ? styles.courtCardFull : ""}`}
                    onClick={() => { if (availCount === 0) return; setSelectedCourt(isChosen ? null : court); }}>
                    <div className={styles.courtCardHeader}>
                      <div>
                        <h3 className={styles.courtName}>{court.courtName}</h3>
                        <p className={styles.courtMeta}>📍 {court.branchName}</p>
                        {/* courtType là string tên loại sân */}
                        <span className={styles.courtTypeBadge}>{court.courtType}</span>
                      </div>
                      <div className={styles.courtMeta2}>
                        <span className={availCount > 0 ? styles.slotsAvail : styles.slotsFull}>
                          {availCount > 0 ? `${availCount} ca trống` : "Hết ca"}
                        </span>
                        {isChosen && <span className={styles.selectedBadge}>✓ Đang chọn</span>}
                      </div>
                    </div>

                    {isChosen && (
                      <div className={styles.slotsWrap}>
                        <p className={styles.slotsLabel}>Chọn ca chơi (có thể chọn nhiều):</p>
                        <div className={styles.slotsGrid}>
                          {court.availableSlots?.map(slot => (
                            // slot: { timeSlotId, startTime, endTime, price, isAvailable }
                            // startTime/endTime: "HH:mm" string
                            <button key={slot.timeSlotId}
                              className={`${styles.slotBtn}
                                ${!slot.isAvailable ? styles.slotBusy : ""}
                                ${isSlotSelected(court.courtId, slot.timeSlotId) ? styles.slotSelected : ""}`}
                              onClick={e => { e.stopPropagation(); toggleSlot(court, slot); }}
                              disabled={!slot.isAvailable}>
                              <span className={styles.slotTime}>
                                {slot.startTime} – {slot.endTime}
                              </span>
                              <span className={styles.slotPrice}>
                                {slot.isAvailable ? fmt(slot.price) : "Đã đặt"}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {selectedSlots.length > 0 && (
            <div className={styles.stickyBar}>
              <div className={styles.stickyInfo}>
                <div>
                  <strong>
                    {[...new Set(selectedSlots.map(s => s.courtName))].join(", ")}
                  </strong>
                  <span className={styles.stickyMeta}>
                    {" · "}{selectedSlots.length} ca · {selectedSlots.map(s => `${s.startTime}–${s.endTime}`).join(", ")}
                  </span>
                </div>
                <span className={styles.stickyTotal}>{fmt(subtotal)}</span>
              </div>
              <button className={styles.btnPrimary} onClick={() => setStep(3)}>
                Tiếp tục: Xác nhận →
              </button>
            </div>
          )}
        </section>
      )}

      {/* ── STEP 3 ── */}
      {step === 3 && (
        <section className={styles.step3}>
          <div className={styles.step3Layout}>
            <div className={styles.summaryCard}>
              <h2 className={styles.cardTitle}>📋 Thông tin đặt sân</h2>
              <div className={styles.summarySection}>
                {[
                  ["📅 Ngày", fmtDate(selectedDate)],
                  ["🏸 Số ca",  `${selectedSlots.length} ca`],
                ].map(([label, value]) => (
                  <div key={label} className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>{label}</span>
                    <span>{value}</span>
                  </div>
                ))}
              </div>

              <div className={styles.summarySection}>
                <p className={styles.sectionSubTitle}>⏰ Ca đã chọn:</p>
                {selectedSlots.map(s => (
                  <div key={s._key} className={styles.slotRow}>
                    <span className={styles.slotRowLeft}>
                      <strong>{s.courtName}</strong>
                      <small> {s.startTime}–{s.endTime}</small>
                    </span>
                    <span className={styles.slotRowPrice}>{fmt(s.price)}</span>
                  </div>
                ))}
              </div>

              {/* VOUCHER */}
              <div className={styles.voucherSection}>
                <label className={styles.label}>🏷️ Mã giảm giá</label>
                <div className={styles.voucherRow}>
                  <input className={styles.voucherInput} placeholder="Nhập mã voucher..."
                    value={voucherCode}
                    onChange={e => { setVoucherCode(e.target.value.toUpperCase()); setVoucherResult(null); setVoucherError(""); }} />
                  <button className={styles.btnApplyVoucher}
                    onClick={handleValidateVoucher}
                    disabled={voucherLoading || !voucherCode.trim()}>
                    {voucherLoading ? "..." : "Áp dụng"}
                  </button>
                </div>
                {voucherError  && <p className={styles.voucherError}>❌ {voucherError}</p>}
                {voucherResult && (
                  <p className={styles.voucherSuccess}>
                    ✅ {voucherResult.message}
                  </p>
                )}
              </div>

              {/* TOTAL */}
              <div className={styles.totalSection}>
                <div className={styles.totalRow}><span>Tạm tính</span><span>{fmt(subtotal)}</span></div>
                {discount > 0 && (
                  <div className={`${styles.totalRow} ${styles.discountRow}`}>
                    <span>Giảm voucher ({voucherCode})</span><span>− {fmt(discount)}</span>
                  </div>
                )}
                <div className={`${styles.totalRow} ${styles.grandTotal}`}>
                  <span>Tổng cộng</span><strong>{fmt(total)}</strong>
                </div>
              </div>
            </div>

            <div className={styles.actionCard}>
              <h2 className={styles.cardTitle}>💳 Xác nhận đặt sân</h2>
              <p className={styles.paymentNote}>
                💡 Trạng thái booking: <strong>pending</strong> → sẽ chuyển <strong>confirmed</strong> khi thanh toán tại quầy.
              </p>
              <div className={styles.paymentAmountBox}>
                <span>Số tiền thanh toán tại sân</span>
                <strong className={styles.paymentAmountNum}>{fmt(total)}</strong>
              </div>
              {error && <div className={styles.errorBanner}>⚠️ {error}</div>}
              <button className={styles.btnConfirm} onClick={handleConfirm} disabled={submitting}>
                {submitting ? "⏳ Đang xử lý..." : "✅ Xác nhận đặt sân"}
              </button>
              <button className={styles.btnBackFull} onClick={() => setStep(2)} disabled={submitting}>
                ← Quay lại chọn giờ
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default CourtBookingPage;