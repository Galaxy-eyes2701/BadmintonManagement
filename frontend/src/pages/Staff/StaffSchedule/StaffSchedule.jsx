import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import styles from './StaffSchedule.module.css';
import useAuth from '../../../hooks/useAuth';

const StaffSchedule = () => {
    const { token } = useAuth();
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [scheduleData, setScheduleData] = useState([]);
    const [timeSlots, setTimeSlots] = useState([]);
    const [loading, setLoading] = useState(false);

    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [billData, setBillData] = useState(null);
    const [selectedVoucherCode, setSelectedVoucherCode] = useState("");
    const [notifiedSlots, setNotifiedSlots] = useState(new Set());

    // THÊM REF ĐỂ QUẢN LÝ CUỘN GIAO DIỆN MƯỢT MÀ
    const scrollContainerRef = useRef(null);

    const formatCurrency = (amount) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);

    const getAuthHeaders = () => {
        return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
    };

    const fetchSchedule = async (showLoading = true) => {
        if (showLoading) setLoading(true);
        try {
            const response = await axios.get(`http://localhost:5043/api/staff/daily-schedule?date=${selectedDate}`, getAuthHeaders());
            setScheduleData(response.data);
            if (response.data.length > 0) setTimeSlots(response.data[0].schedule.map(s => s.time));
        } catch (error) {
            toast.error('Lỗi khi tải lịch sân. Vui lòng thử lại!');
        } finally {
            if (showLoading) setLoading(false);
        }
    };

    useEffect(() => {
        fetchSchedule(true);
    }, [selectedDate, token]);

    // TỰ ĐỘNG CUỘN TỚI GIỜ HIỆN TẠI KHI DATA LOAD XONG LẦN ĐẦU
    useEffect(() => {
        if (timeSlots.length > 0) {
            setTimeout(() => {
                scrollToCurrentTime();
            }, 500); // Đợi DOM render xong mới cuộn
        }
    }, [timeSlots]);

    useEffect(() => {
        const intervalId = setInterval(() => { fetchSchedule(false); }, 60000);
        return () => clearInterval(intervalId);
    }, [selectedDate, token]);

    // =======================================================
    // UX: HÀM CUỘN ĐẾN GIỜ HIỆN TẠI 
    // =======================================================
    const scrollToCurrentTime = () => {
        const currentHour = new Date().getHours();
        const element = document.getElementById(`time-row-${currentHour}`);

        if (element && scrollContainerRef.current) {
            // Căn phần tử nằm giữa màn hình cuộn một cách mượt mà
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // Nháy sáng ô để Lễ tân chú ý
            element.style.transition = "background-color 0.5s ease";
            element.style.backgroundColor = "#fef08a"; // Màu vàng nhạt
            setTimeout(() => { element.style.backgroundColor = "transparent"; }, 2000);
        } else {
            toast.info("Hiện không có ca nào trong khung giờ này.");
        }
    };

    const getOvertimeStatus = (currentSlotIndex, scheduleArray) => {
        const currentSlot = scheduleArray[currentSlotIndex];
        if (!currentSlot.isBooked || currentSlot.bookingInfo.paymentStatus === 'completed') return 'normal';

        const todayStr = new Date().toISOString().split('T')[0];
        if (selectedDate !== todayStr) return 'normal';

        const endTimeStr = currentSlot.time.split(' - ')[1];
        const [hours, minutes] = endTimeStr.split(':');
        const now = new Date();
        const endTime = new Date();
        endTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

        if (now > endTime) {
            const nextSlot = scheduleArray[currentSlotIndex + 1];
            if (nextSlot && nextSlot.isBooked) {
                if (nextSlot.bookingInfo.bookingId === currentSlot.bookingInfo.bookingId) return 'normal';
                return 'kick-out';
            }
            return 'extend';
        }
        return 'normal';
    };

    const handleSlotClick = async (court, slot) => {
        if (court.status === 'maintenance') {
            return toast.warning(`🚨 ${court.courtName} đang bảo trì. Không thể xếp lịch!`);
        }
        if (slot.isBooked) {
            if (slot.bookingInfo.paymentStatus === 'completed') return toast.info(`✅ Ca này đã thanh toán hoàn tất!`);
            try {
                const res = await axios.get(`http://localhost:5043/api/staff/booking-bill/${slot.bookingInfo.bookingId}`, getAuthHeaders());
                setBillData({ ...res.data, status: slot.bookingInfo.paymentStatus });
                setSelectedVoucherCode("");
                setIsCheckoutOpen(true);
            } catch (err) { toast.error('Lỗi khi lấy hóa đơn.'); }
        } else {
            toast.info('Sân trống. Khách hàng vui lòng đặt qua app!');
        }
    };

    const handleExtendBooking = async (bookingId, courtId, nextTimeSlotId) => {
        if (!window.confirm("Xác nhận gia hạn thêm 1 ca?")) return;
        try {
            const res = await axios.post(`http://localhost:5043/api/staff/extend-booking/${bookingId}?courtId=${courtId}&nextSlotId=${nextTimeSlotId}`, {}, getAuthHeaders());
            toast.success(res.data.message);
            fetchSchedule(false);
        } catch (error) { toast.error(error.response?.data?.message || "Lỗi khi gia hạn"); }
    };

    const handleCompletePayment = async (method) => {
        try {
            const payload = { paymentMethod: method, VoucherCode: selectedVoucherCode || null };
            const res = await axios.post(`http://localhost:5043/api/staff/checkout/${billData.bookingId}`, payload, getAuthHeaders());
            toast.success(res.data.message || `Trả sân bằng ${method} thành công!`);
            setIsCheckoutOpen(false);
            fetchSchedule(false);
        } catch (err) { toast.error(err.response?.data || 'Lỗi khi thanh toán'); }
    };

    const handlePrintBill = () => { window.print(); };

    let finalAmountToPay = billData ? billData.remainingAmount : 0;
    let currentDiscount = 0;
    if (billData && selectedVoucherCode) {
        const voucher = billData.availableVouchers.find(v => v.code === selectedVoucherCode);
        if (voucher) {
            currentDiscount = voucher.discountAmount;
            finalAmountToPay = Math.max(0, finalAmountToPay - currentDiscount);
        }
    }

    return (
        <div className={styles.container} style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            <ToastContainer position="top-right" autoClose={3000} />

            <header className={styles.header} style={{ flexShrink: 0 }}>
                <div className={styles.headerLeft}>
                    <h1 className={styles.title}>Lịch Sân Hôm Nay</h1>
                    <div style={{ display: 'flex', gap: '15px', marginTop: '10px', alignItems: 'center' }}>
                        <div className={styles.dateDisplay} style={{ background: '#f1f5f9', padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                            <span className={`material-symbols-outlined ${styles.icon}`}>calendar_month</span>
                            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className={styles.dateInput} style={{ border: 'none', background: 'transparent', outline: 'none', fontWeight: 'bold' }} />
                        </div>

                        {/* NÚT CUỘN NHANH ĐẾN GIỜ HIỆN TẠI */}
                        <button
                            onClick={scrollToCurrentTime}
                            style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '8px', border: 'none', background: '#0f172a', color: 'white', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>my_location</span>
                            Về giờ hiện tại
                        </button>
                    </div>
                </div>
            </header>

            <div
                ref={scrollContainerRef}
                className={`${styles.scrollArea} custom-scrollbar`}
                style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', position: 'relative', background: '#fff' }}
            >
                {loading ? (
                    <div className="flex justify-center items-center h-full text-slate-400 font-bold">Đang tải dữ liệu...</div>
                ) : (
                    <div className={styles.gridWrapper} style={{ '--cols': scheduleData.length || 1, minWidth: 'max-content' }}>

                        {/* CSS STICKY CHO TIÊU ĐỀ SÂN */}
                        <div className={styles.gridHeader} style={{ position: 'sticky', top: 0, zIndex: 20, backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                            {/* CSS STICKY CHO GÓC TRÁI TRÊN CÙNG */}
                            <div className={styles.timeSpacer} style={{ position: 'sticky', left: 0, zIndex: 30, backgroundColor: '#f8fafc', borderRight: '2px solid #e2e8f0', minWidth: '90px' }}></div>

                            {scheduleData.map(court => (
                                <div key={court.courtId} className={styles.courtHeader} style={{ padding: '10px' }}>
                                    <span className={styles.courtName} style={{ fontSize: '14px' }}>{court.courtName}</span>
                                    {court.status === 'maintenance' && (
                                        <div style={{ color: '#ef4444', fontSize: '11px', fontWeight: 'bold', marginTop: '2px' }}>(Đang bảo trì)</div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className={styles.gridBody}>
                            {/* CSS STICKY CHO CỘT GIỜ BÊN TRÁI */}
                            <div className={styles.timeCol} style={{ position: 'sticky', left: 0, zIndex: 10, backgroundColor: '#f8fafc', borderRight: '2px solid #e2e8f0', minWidth: '90px' }}>
                                {timeSlots.map((time, idx) => {
                                    // Tách lấy giờ bắt đầu để làm ID cho thẻ (VD: 14:00 -> 14)
                                    const hourMark = parseInt(time.split(' - ')[0].split(':')[0]);
                                    return (
                                        <div key={idx} id={`time-row-${hourMark}`} className={styles.timeSlot} style={{ height: '80px', display: 'flex', flexDirection: 'column', justifyContent: 'center', borderBottom: '1px dashed #e2e8f0' }}>
                                            <span className={styles.timeText} style={{ fontSize: '13px' }}>{time.split(' - ')[0]}</span>
                                            <span className={styles.amPm} style={{ fontSize: '11px' }}>{time.split(' - ')[1]}</span>
                                        </div>
                                    );
                                })}
                            </div>

                            {scheduleData.map(court => (
                                <div key={court.courtId} className={styles.courtCol}>
                                    {court.schedule.map((slot, index) => {
                                        const ovStatus = getOvertimeStatus(index, court.schedule);
                                        const isPending = slot.isBooked && slot.bookingInfo.paymentStatus === 'pending';

                                        // ÉP CHIỀU CAO Ô COMPACT (80px) ĐỂ VỪA VẶN MÀN HÌNH
                                        const slotStyleBase = { height: '80px', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '6px', borderBottom: '1px dashed #e2e8f0' };

                                        return slot.isBooked ? (
                                            <div
                                                key={slot.timeSlotId}
                                                onClick={() => handleSlotClick(court, slot)}
                                                className={`${styles.slotCard} ${styles.slotBooked}`}
                                                style={{
                                                    ...slotStyleBase,
                                                    ...(slot.bookingInfo.paymentStatus === 'completed' ? { backgroundColor: '#f1f5f9', color: '#94a3b8', borderRight: '1px solid #e2e8f0' } :
                                                        isPending ? { border: '2px dashed #eab308', backgroundColor: '#fefce8' } :
                                                            ovStatus === 'kick-out' ? { border: '2px solid red' } :
                                                                ovStatus === 'extend' ? { border: '2px solid #d97706' } : { borderRight: '1px solid #e2e8f0', borderLeft: '1px solid #e2e8f0' })
                                                }}
                                            >
                                                <div className={styles.customerRow} style={{ marginBottom: '2px' }}>
                                                    <h3 className={styles.customerName} style={{ ...(slot.bookingInfo.paymentStatus === 'completed' ? { textDecoration: 'line-through' } : {}), fontSize: '13px', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {slot.bookingInfo.customerName}
                                                    </h3>
                                                </div>

                                                {slot.bookingInfo.paymentStatus === 'completed' && <div style={{ color: '#10b981', fontSize: '11px', fontWeight: 'bold' }}>✅ Hoàn tất</div>}
                                                {ovStatus === 'kick-out' && <div style={{ color: 'red', fontSize: '11px', fontWeight: 'bold' }}>🚨 Đuổi khách!</div>}
                                                {isPending && <div><span style={{ color: '#eab308', fontSize: '10px', fontWeight: 'bold' }}>⏳ Chờ duyệt</span></div>}

                                                {ovStatus === 'extend' && !isPending && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleExtendBooking(slot.bookingInfo.bookingId, court.courtId, court.schedule[index + 1].timeSlotId);
                                                        }}
                                                        style={{ background: '#d97706', color: 'white', border: 'none', padding: '2px 4px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer', width: '100%', fontWeight: 'bold', marginTop: 'auto' }}
                                                    >
                                                        + Gia hạn
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            <div
                                                key={slot.timeSlotId}
                                                onClick={() => handleSlotClick(court, slot)}
                                                className={`${styles.slotCard} ${styles.slotEmpty}`}
                                                style={{
                                                    ...slotStyleBase,
                                                    borderRight: '1px solid #e2e8f0', borderLeft: '1px solid #e2e8f0',
                                                    ...(court.status === 'maintenance' ? { backgroundColor: '#fee2e2', opacity: 0.5, cursor: 'not-allowed' } : {})
                                                }}
                                            >
                                                <span className={styles.addText} style={{ fontSize: '12px', ...(court.status === 'maintenance' ? { color: '#ef4444' } : {}) }}>
                                                    {court.status === 'maintenance' ? 'Bảo trì' : 'Trống'}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* MÀN HÌNH TẤT TOÁN SÂN & IN HÓA ĐƠN (Giữ Nguyên Code) */}
            {isCheckoutOpen && billData && (
                <div className={styles.modalOverlay}>
                    {/* KHU VỰC NÀY TÔI GIỮ NGUYÊN HOÀN TOÀN CỦA ANH, không cần sửa đổi */}
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h2 className={styles.modalTitle}>
                                <span className="material-symbols-outlined" style={{ color: '#10b981' }}>receipt_long</span>
                                Tất toán hóa đơn
                            </h2>
                            <button onClick={() => setIsCheckoutOpen(false)} className={styles.closeBtn}>
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div>
                            {billData.status === 'pending' && (
                                <div style={{ background: '#fefce8', border: '1px dashed #eab308', padding: '10px', borderRadius: '8px', marginBottom: '15px', color: '#a16207', fontSize: '13px', fontWeight: 'bold' }}>
                                    ⚠️ Lưu ý: Đơn này Admin chưa duyệt.
                                </div>
                            )}

                            <div className={styles.billRow}><span>Khách hàng:</span><strong>{billData.customerName}</strong></div>
                            <div className={styles.billRow}><span>Tiền thuê sân:</span><strong>{formatCurrency(billData.courtTotal)}</strong></div>
                            <div className={styles.billRow}><span>Tiền nước / Dịch vụ:</span><strong>{formatCurrency(billData.posTotal)}</strong></div>
                            <div className={`${styles.billRow} ${styles.deduct}`}><span>Đã thanh toán (Cọc):</span><strong>- {formatCurrency(billData.alreadyPaid)}</strong></div>

                            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', marginTop: '15px', border: '1px dashed #cbd5e1' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#64748b', marginBottom: '8px' }}>🎟️ Áp dụng Voucher</label>
                                <select value={selectedVoucherCode} onChange={(e) => setSelectedVoucherCode(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0', outline: 'none' }}>
                                    <option value="">-- Không sử dụng Voucher --</option>
                                    {billData.availableVouchers && billData.availableVouchers.map(v => <option key={v.code} value={v.code}>{v.label}</option>)}
                                </select>
                                {currentDiscount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a', fontWeight: 'bold', marginTop: '10px' }}><span>Giảm giá:</span><span>- {formatCurrency(currentDiscount)}</span></div>}
                            </div>
                            <div className={styles.divider}></div>
                            <div className={styles.totalRow}><span>CẦN THU THÊM:</span><span className={styles.totalAmount} style={currentDiscount > 0 ? { color: '#ef4444' } : {}}>{formatCurrency(finalAmountToPay)}</span></div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px', width: '100%' }}>
                            <button onClick={handlePrintBill} style={{ padding: '10px', borderRadius: '8px', border: '1px dashed #94a3b8', background: '#f8fafc', fontWeight: 'bold', cursor: 'pointer', color: '#334155' }}>🖨️ In Hóa Đơn Tạm Tính</button>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button onClick={() => handleCompletePayment('CASH')} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', background: '#0f172a', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>💵 Tiền Mặt</button>
                                <button onClick={() => handleCompletePayment('VNPAY')} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', background: '#005baa', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>📱 Chuyển Khoản / VNPay</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* PHÔI IN HÓA ĐƠN TÀNG HÌNH */}
            {billData && (
                <div id="print-section" className={styles.printArea}>
                    <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                        <h2 style={{ margin: 0, fontSize: '20px', textTransform: 'uppercase' }}>SÂN CẦU LÔNG FPT</h2>
                        <p style={{ margin: '5px 0', fontSize: '12px' }}>Khu Công Nghệ Cao Hòa Lạc</p>
                        <hr style={{ borderTop: '1px dashed #000', margin: '10px 0' }} />
                        <h3 style={{ fontSize: '16px', margin: '10px 0' }}>HÓA ĐƠN DỊCH VỤ</h3>
                        <p style={{ textAlign: 'left', fontSize: '12px', margin: '4px 0' }}>Khách: {billData.customerName}</p>
                        <p style={{ textAlign: 'left', fontSize: '12px', margin: '4px 0' }}>Ngày: {new Date().toLocaleString('vi-VN')}</p>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '15px', fontSize: '12px' }}>
                        <tbody>
                            <tr><td style={{ padding: '4px 0' }}>Tiền Thuê Sân</td><td style={{ textAlign: 'right' }}>{formatCurrency(billData.courtTotal)}</td></tr>
                            <tr><td style={{ padding: '4px 0' }}>Dịch Vụ (Nước)</td><td style={{ textAlign: 'right' }}>{formatCurrency(billData.posTotal)}</td></tr>
                            <tr><td style={{ padding: '4px 0' }}>Đã Đặt Cọc</td><td style={{ textAlign: 'right' }}>- {formatCurrency(billData.alreadyPaid)}</td></tr>
                            {currentDiscount > 0 && <tr><td style={{ padding: '4px 0' }}>Voucher {selectedVoucherCode}</td><td style={{ textAlign: 'right' }}>- {formatCurrency(currentDiscount)}</td></tr>}
                        </tbody>
                    </table>
                    <hr style={{ borderTop: '1px dashed #000', margin: '10px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold' }}><span>TỔNG THANH TOÁN:</span><span>{formatCurrency(finalAmountToPay)}</span></div>
                    <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', fontStyle: 'italic' }}><p>Cảm ơn quý khách!</p></div>
                </div>
            )}
        </div>
    );
};

export default StaffSchedule;