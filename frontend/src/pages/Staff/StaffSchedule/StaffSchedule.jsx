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

    // State cho Popup Tất toán
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [billData, setBillData] = useState(null);

    const formatCurrency = (amount) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);

    useEffect(() => {
        const fetchSchedule = async () => {
            setLoading(true);
            try {
                const response = await axios.get(`http://localhost:5043/api/staff/daily-schedule?date=${selectedDate}`);
                setScheduleData(response.data);

                if (response.data.length > 0) {
                    setTimeSlots(response.data[0].schedule.map(s => s.time));
                }
            } catch (error) {
                toast.error('Lỗi khi tải lịch sân');
            } finally {
                setLoading(false);
            }
        };
        fetchSchedule();
    }, [selectedDate]);

    const handleSlotClick = async (court, slot) => {
        if (court.status === 'Bảo trì') return toast.warning('Sân đang bảo trì!');

        if (slot.isBooked) {
            // Mở Hóa đơn để Tất toán
            try {
                const res = await axios.get(`http://localhost:5043/api/pos/booking-bill/${slot.bookingInfo.bookingId}`);
                setBillData(res.data);
                setIsCheckoutOpen(true);
            } catch (err) {
                toast.error('Lỗi khi lấy hóa đơn. Hãy kiểm tra Backend.');
            }
        } else {
            toast.info('Sân trống. Khách hàng vui lòng tự đặt qua ứng dụng!');
        }
    };

    // Hàm ấn nút Tất toán
    const handleCompletePayment = async () => {
        try {
            const res = await axios.post(`http://localhost:5043/api/staff/checkout/${billData.bookingId}`, {
                paymentMethod: 'CASH'
            });

            toast.success(`Trả sân thành công! Khách được cộng ${res.data.pointsAdded} điểm.`);
            setIsCheckoutOpen(false);

            // Xóa cache và tải lại trang để sân trống trở lại
            setTimeout(() => {
                window.location.reload();
            }, 1500);

        } catch (err) {
            toast.error(err.response?.data || 'Lỗi khi thanh toán');
        }
    };

    return (
        <div className={styles.container}>
            <ToastContainer position="top-right" autoClose={3000} />

            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <h1 className={styles.title}>Lịch Sân Hôm Nay</h1>
                    <div className={styles.datePickerWrap}>
                        <div className={styles.dateDisplay}>
                            <span className={`material-symbols-outlined ${styles.icon}`}>calendar_month</span>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className={styles.dateInput}
                            />
                        </div>
                    </div>
                </div>
                <div className={styles.headerRight}>
                    <div className={styles.legend}>
                        <div className={styles.legendItem}><span className={`${styles.dot} ${styles.dotEmpty}`}></span> Trống</div>
                        <div className={styles.legendItem}><span className={`${styles.dot} ${styles.dotBooked}`}></span> Đã đặt / Cọc</div>
                        <div className={styles.legendItem}><span className={`${styles.dot} ${styles.dotMaintenance}`}></span> Bảo trì</div>
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
                                    {court.status === 'Bảo trì' && <span className={styles.badgeMaintain}>Bảo trì</span>}
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
                                <div key={court.courtId} className={`${styles.courtCol} ${court.status === 'Bảo trì' ? styles.courtColMaintenance : ''}`}>
                                    {court.status === 'Bảo trì' && <div className={styles.maintenanceWatermark}>Maintenance</div>}

                                    {court.schedule.map(slot => (
                                        court.status === 'Bảo trì' ? (
                                            <div key={slot.timeSlotId} className={`${styles.slotCard} ${styles.slotMaintenance}`}>
                                                <span className="material-symbols-outlined">engineering</span>
                                            </div>
                                        ) : slot.isBooked ? (
                                            <div key={slot.timeSlotId} onClick={() => handleSlotClick(court, slot)} className={`${styles.slotCard} ${styles.slotBooked}`}>
                                                <span className={`material-symbols-outlined ${styles.slotBgIcon}`}>verified</span>
                                                <div className={styles.customerRow}>
                                                    <h3 className={styles.customerName}>{slot.bookingInfo.customerName}</h3>
                                                    <span className={styles.statusBadge}>
                                                        {slot.bookingInfo.paymentStatus === 'confirmed' ? 'Đã cọc' : 'Hoàn tất'}
                                                    </span>
                                                </div>
                                                <div className={styles.phoneRow}>
                                                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>call</span>
                                                    {slot.bookingInfo.phone}
                                                </div>
                                                <span className={styles.timeTag}>{slot.time}</span>
                                            </div>
                                        ) : (
                                            <div key={slot.timeSlotId} onClick={() => handleSlotClick(court, slot)} className={`${styles.slotCard} ${styles.slotEmpty}`}>
                                                <span className={`material-symbols-outlined ${styles.addIcon}`}>add_circle</span>
                                                <span className={styles.addText}>Đặt sân</span>
                                            </div>
                                        )
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <footer className={styles.footer}>
                <div className={styles.footerLeft}>
                    <div className={styles.statItem}>
                        <span>Tổng số sân:</span>
                        <span className={styles.statValue}>{scheduleData.length}</span>
                    </div>
                    <div className={styles.statItem}>
                        <span>Sân hoạt động:</span>
                        <span className={`${styles.statValue} ${styles.statPrimary}`}>
                            {scheduleData.filter(c => c.status !== 'Bảo trì').length}
                        </span>
                    </div>
                </div>
            </footer>

            {/* POPUP TẤT TOÁN HÓA ĐƠN */}
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
                                <span>Tiền nước / Dịch vụ (POS):</span>
                                <strong>{formatCurrency(billData.posTotal)}</strong>
                            </div>
                            <div className={`${styles.billRow} ${styles.deduct}`}>
                                <span>Đã thanh toán (Cọc):</span>
                                <strong>- {formatCurrency(billData.alreadyPaid)}</strong>
                            </div>

                            <div className={styles.divider}></div>

                            <div className={styles.totalRow}>
                                <span>CẦN THU THÊM:</span>
                                <span className={styles.totalAmount}>{formatCurrency(billData.remainingAmount)}</span>
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