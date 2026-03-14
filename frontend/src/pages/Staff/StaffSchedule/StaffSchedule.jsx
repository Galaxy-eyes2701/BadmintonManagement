import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import styles from './StaffSchedule.module.css';

const StaffSchedule = () => {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [scheduleData, setScheduleData] = useState([]);
    const [timeSlots, setTimeSlots] = useState([]);
    const [loading, setLoading] = useState(false);

    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [billData, setBillData] = useState(null);
    const [selectedVoucherCode, setSelectedVoucherCode] = useState("");
    const [notifiedSlots, setNotifiedSlots] = useState(new Set());

    const formatCurrency = (amount) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);

    const fetchSchedule = async (showLoading = true) => {
        if (showLoading) setLoading(true);
        try {
            const response = await axios.get(`http://localhost:5043/api/staff/daily-schedule?date=${selectedDate}`);
            setScheduleData(response.data);
            if (response.data.length > 0) setTimeSlots(response.data[0].schedule.map(s => s.time));
        } catch (error) {
            toast.error('Lỗi khi tải lịch sân');
        } finally {
            if (showLoading) setLoading(false);
        }
    };

    // Gọi API khi đổi ngày
    useEffect(() => {
        fetchSchedule(true);
    }, [selectedDate]);

    // TỰ ĐỘNG LÀM MỚI DỮ LIỆU MỖI 60 GIÂY (Không làm giật màn hình)
    useEffect(() => {
        const intervalId = setInterval(() => {
            fetchSchedule(false);
        }, 60000);
        return () => clearInterval(intervalId);
    }, [selectedDate]);

    // THUẬT TOÁN KIỂM TRA LỐ GIỜ TỐI ƯU NHẤT
    const getOvertimeStatus = (currentSlotIndex, scheduleArray) => {
        const currentSlot = scheduleArray[currentSlotIndex];
        if (!currentSlot.isBooked) return 'normal';
        if (currentSlot.bookingInfo.paymentStatus === 'completed') return 'normal';

        const todayStr = new Date().toISOString().split('T')[0];
        if (selectedDate !== todayStr) return 'normal';

        const endTimeStr = currentSlot.time.split(' - ')[1];
        const [hours, minutes] = endTimeStr.split(':');

        const now = new Date();
        const endTime = new Date();
        // Ép kiểu chuẩn base 10 để chống lỗi 02:00 vs 14:00
        endTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

        if (now > endTime) {
            const nextSlot = scheduleArray[currentSlotIndex + 1];

            if (nextSlot && nextSlot.isBooked) {
                // CHỐNG BÁO LỖI NẾU CA SAU LÀ CỦA CHÍNH NGƯỜI ĐÓ GIA HẠN
                if (nextSlot.bookingInfo.bookingId === currentSlot.bookingInfo.bookingId) {
                    return 'normal';
                }
                return 'kick-out';
            }
            return 'extend';
        }
        return 'normal';
    };

    // QUÉT BÁO ĐỘNG BẰNG TOAST MỖI PHÚT
    useEffect(() => {
        if (!scheduleData || scheduleData.length === 0) return;
        const checkAndNotifyOvertime = () => {
            let newNotified = new Set(notifiedSlots);
            let hasNewAlert = false;

            scheduleData.forEach(court => {
                court.schedule.forEach((slot, index) => {
                    if (slot.isBooked) {
                        const ovStatus = getOvertimeStatus(index, court.schedule);
                        const slotKey = `${court.courtId}-${slot.timeSlotId}`;

                        if ((ovStatus === 'kick-out' || ovStatus === 'extend') && !notifiedSlots.has(slotKey)) {
                            if (ovStatus === 'kick-out') toast.error(`🚨 Sân ${court.courtName} đã lố giờ! Mời khách ra ngoài vì ca sau có người.`);
                            else toast.warning(`⏳ Sân ${court.courtName} đang lố giờ (Ca sau trống).`);
                            newNotified.add(slotKey);
                            hasNewAlert = true;
                        }
                    }
                });
            });
            if (hasNewAlert) setNotifiedSlots(newNotified);
        };

        checkAndNotifyOvertime();
        const interval = setInterval(checkAndNotifyOvertime, 60000);
        return () => clearInterval(interval);
    }, [scheduleData, notifiedSlots]);

    const handleSlotClick = async (court, slot) => {
        if (court.status === 'Bảo trì') return toast.warning('Sân đang bảo trì!');

        if (slot.isBooked) {
            if (slot.bookingInfo.paymentStatus === 'completed') {
                return toast.info(`✅ Ca này của ${slot.bookingInfo.customerName} đã thanh toán hoàn tất!`);
            }

            try {
                const res = await axios.get(`http://localhost:5043/api/staff/booking-bill/${slot.bookingInfo.bookingId}`);
                setBillData(res.data);
                setSelectedVoucherCode("");
                setIsCheckoutOpen(true);
            } catch (err) {
                toast.error('Lỗi khi lấy hóa đơn. Hãy kiểm tra Backend.');
            }
        } else {
            toast.info('Sân trống. Khách hàng vui lòng tự đặt qua ứng dụng!');
        }
    };

    // HÀM GIA HẠN CÓ THÔNG BÁO XÁC NHẬN CHỐNG BẤM NHẦM
    const handleExtendBooking = async (bookingId, courtId, nextTimeSlotId) => {
        const isConfirm = window.confirm("Xác nhận gia hạn thêm 1 ca cho khách này?\n(Hệ thống sẽ khóa sân ca sau và tự động tính thêm tiền).");
        if (!isConfirm) return;

        try {
            const res = await axios.post(`http://localhost:5043/api/staff/extend-booking/${bookingId}?courtId=${courtId}&nextSlotId=${nextTimeSlotId}`);
            toast.success(res.data.message);
            fetchSchedule(false);
        } catch (error) {
            toast.error(error.response?.data?.message || error.response?.data || "Lỗi khi gia hạn");
        }
    };

    const handleCompletePayment = async () => {
        try {
            const payload = {
                paymentMethod: 'CASH',
                VoucherCode: selectedVoucherCode || null
            };
            const res = await axios.post(`http://localhost:5043/api/staff/checkout/${billData.bookingId}`, payload);
            toast.success(res.data.message || `Trả sân thành công!`);
            setIsCheckoutOpen(false);
            fetchSchedule(false);
        } catch (err) {
            toast.error(err.response?.data || 'Lỗi khi thanh toán');
        }
    };

    // TÍNH TOÁN TIỀN REALTIME TRÊN POPUP
    let finalAmountToPay = billData ? billData.remainingAmount : 0;
    let currentDiscount = 0;

    if (billData && selectedVoucherCode) {
        const voucher = billData.availableVouchers.find(v => v.code === selectedVoucherCode);
        if (voucher) {
            currentDiscount = voucher.discountAmount;
            finalAmountToPay = finalAmountToPay - currentDiscount;
            if (finalAmountToPay < 0) finalAmountToPay = 0;
        }
    }

    return (
        <div className={styles.container}>
            <ToastContainer position="top-right" autoClose={5000} />

            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <h1 className={styles.title}>Lịch Sân Hôm Nay</h1>
                    <div className={styles.datePickerWrap}>
                        <div className={styles.dateDisplay}>
                            <span className={`material-symbols-outlined ${styles.icon}`}>calendar_month</span>
                            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className={styles.dateInput} />
                        </div>
                    </div>
                </div>
            </header>

            <div className={`${styles.scrollArea} custom-scrollbar`}>
                {loading ? (
                    <div className="flex justify-center items-center h-full text-slate-400 font-bold">Đang tải dữ liệu...</div>
                ) : (
                    <div className={styles.gridWrapper} style={{ '--cols': scheduleData.length || 1 }}>
                        <div className={styles.gridHeader}>
                            <div className={styles.timeSpacer}></div>
                            {scheduleData.map(court => (
                                <div key={court.courtId} className={styles.courtHeader}>
                                    <span className={styles.courtName}>{court.courtName}</span>
                                </div>
                            ))}
                        </div>

                        <div className={styles.gridBody}>
                            <div className={styles.timeCol}>
                                {timeSlots.map((time, idx) => (
                                    <div key={idx} className={styles.timeSlot}>
                                        <span className={styles.timeText}>{time.split(' - ')[0]}</span>
                                        <span className={styles.amPm}>{time.split(' - ')[1]}</span>
                                    </div>
                                ))}
                            </div>

                            {scheduleData.map(court => (
                                <div key={court.courtId} className={styles.courtCol}>
                                    {court.schedule.map((slot, index) => {
                                        const ovStatus = getOvertimeStatus(index, court.schedule);

                                        return slot.isBooked ? (
                                            <div
                                                key={slot.timeSlotId}
                                                onClick={() => handleSlotClick(court, slot)}
                                                className={`${styles.slotCard} ${styles.slotBooked}`}
                                                style={
                                                    slot.bookingInfo.paymentStatus === 'completed' ? { backgroundColor: '#f1f5f9', color: '#94a3b8', border: '1px solid #cbd5e1' } :
                                                        ovStatus === 'kick-out' ? { border: '2px solid red' } :
                                                            ovStatus === 'extend' ? { border: '2px solid #d97706' } : {}
                                                }
                                            >
                                                <div className={styles.customerRow}>
                                                    <h3 className={styles.customerName} style={slot.bookingInfo.paymentStatus === 'completed' ? { textDecoration: 'line-through' } : {}}>
                                                        {slot.bookingInfo.customerName}
                                                    </h3>
                                                </div>

                                                {slot.bookingInfo.paymentStatus === 'completed' && <div style={{ color: '#10b981', fontSize: '11px', fontWeight: 'bold' }}>✅ Hoàn tất</div>}
                                                {ovStatus === 'kick-out' && <div style={{ color: 'red', fontSize: '11px', fontWeight: 'bold' }}>🚨 Đuổi! Có khách sau!</div>}

                                                {ovStatus === 'extend' && (
                                                    <div style={{ marginTop: '4px' }}>
                                                        <div style={{ color: '#d97706', fontSize: '11px', fontWeight: 'bold', marginBottom: '4px' }}>⏳ Đang lố giờ...</div>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleExtendBooking(slot.bookingInfo.bookingId, court.courtId, court.schedule[index + 1].timeSlotId);
                                                            }}
                                                            style={{ background: '#d97706', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', width: '100%', fontWeight: 'bold' }}
                                                        >
                                                            + Gia hạn ca sau
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div key={slot.timeSlotId} onClick={() => handleSlotClick(court, slot)} className={`${styles.slotCard} ${styles.slotEmpty}`}>
                                                <span className={styles.addText}>Trống</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {isCheckoutOpen && billData && (
                <div className={styles.modalOverlay}>
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
                            <div className={styles.billRow}>
                                <span>Khách hàng:</span>
                                <strong>{billData.customerName}</strong>
                            </div>
                            <div className={styles.billRow}>
                                <span>Tiền thuê sân:</span>
                                <strong>{formatCurrency(billData.courtTotal)}</strong>
                            </div>
                            <div className={styles.billRow}>
                                <span>Tiền nước / Dịch vụ:</span>
                                <strong>{formatCurrency(billData.posTotal)}</strong>
                            </div>
                            <div className={`${styles.billRow} ${styles.deduct}`}>
                                <span>Đã thanh toán (Cọc):</span>
                                <strong>- {formatCurrency(billData.alreadyPaid)}</strong>
                            </div>

                            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', marginTop: '15px', border: '1px dashed #cbd5e1' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#64748b', marginBottom: '8px' }}>
                                    🎟️ Áp dụng Voucher
                                </label>
                                <select
                                    value={selectedVoucherCode}
                                    onChange={(e) => setSelectedVoucherCode(e.target.value)}
                                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0', outline: 'none' }}
                                >
                                    <option value="">-- Không sử dụng Voucher --</option>
                                    {billData.availableVouchers && billData.availableVouchers.map(v => (
                                        <option key={v.code} value={v.code}>{v.label}</option>
                                    ))}
                                </select>

                                {currentDiscount > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a', fontWeight: 'bold', marginTop: '10px' }}>
                                        <span>Giảm giá Voucher:</span>
                                        <span>- {formatCurrency(currentDiscount)}</span>
                                    </div>
                                )}
                            </div>

                            <div className={styles.divider}></div>

                            <div className={styles.totalRow}>
                                <span>CẦN THU THÊM:</span>
                                <span className={styles.totalAmount} style={currentDiscount > 0 ? { color: '#ef4444' } : {}}>
                                    {formatCurrency(finalAmountToPay)}
                                </span>
                            </div>
                        </div>

                        <div className={styles.actionBtns}>
                            <button onClick={() => setIsCheckoutOpen(false)} className={styles.btnCancel}>Đóng</button>
                            <button onClick={handleCompletePayment} className={styles.btnComplete}>
                                <span className="material-symbols-outlined text-sm">payments</span> Thu Tiền & Trả Sân
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StaffSchedule;