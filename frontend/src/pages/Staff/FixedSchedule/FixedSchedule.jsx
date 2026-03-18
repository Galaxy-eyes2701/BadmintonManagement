import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styles from './FixedSchedule.module.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Pagination from '../../../components/Admin/Pagination.jsx';

const FixedSchedule = () => {
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(false);
    const [setupData, setSetupData] = useState({ customers: [], courts: [], timeSlots: [] });
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Xóa totalPrice đi vì backend sẽ tự tính
    const [formData, setFormData] = useState({
        userId: '', courtId: '', timeSlotId: '', dayOfWeek: '2', startDate: '', endDate: ''
    });

    // STATE MỚI: CHỨA THÔNG TIN BILL TẠM TÍNH
    const [previewBill, setPreviewBill] = useState({ playDays: 0, unitPrice: 0, totalPrice: 0 });

    const [statusFilter, setStatusFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(6);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [schedulesRes, setupRes] = await Promise.all([
                axios.get('http://localhost:5043/api/staff/fixed-schedules'),
                axios.get('http://localhost:5043/api/staff/setup-data')
            ]);
            setSchedules(schedulesRes.data);
            setSetupData(setupRes.data);

            if (setupRes.data.customers.length > 0) {
                setFormData(prev => ({
                    ...prev,
                    userId: setupRes.data.customers[0].id,
                    courtId: setupRes.data.courts[0]?.id || '',
                    timeSlotId: setupRes.data.timeSlots[0]?.id || ''
                }));
            }
        } catch (error) {
            toast.error('Lỗi khi tải dữ liệu hệ thống');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);
    useEffect(() => { setCurrentPage(1); }, [statusFilter]);

    // =======================================================
    // EFFECT TỰ ĐỘNG TÍNH TIỀN KHI THAY ĐỔI FORM
    // =======================================================
    useEffect(() => {
        const calculatePrice = async () => {
            const { courtId, timeSlotId, dayOfWeek, startDate, endDate } = formData;
            if (courtId && timeSlotId && dayOfWeek && startDate && endDate && startDate <= endDate) {
                try {
                    const res = await axios.get(`http://localhost:5043/api/staff/preview-fixed-price?courtId=${courtId}&timeSlotId=${timeSlotId}&dayOfWeek=${dayOfWeek}&startDate=${startDate}&endDate=${endDate}`);
                    setPreviewBill(res.data);
                } catch (err) {
                    console.error(err);
                }
            } else {
                setPreviewBill({ playDays: 0, unitPrice: 0, totalPrice: 0 });
            }
        };
        calculatePrice();
    }, [formData.courtId, formData.timeSlotId, formData.dayOfWeek, formData.startDate, formData.endDate]);

    const filteredSchedules = schedules.filter(item => {
        if (statusFilter === 'all') return true;
        if (statusFilter === 'active') return item.status === 'active' || item.status === 'warning';
        if (statusFilter === 'inactive') return item.status === 'expired' || item.status === 'cancelled';
        return true;
    });

    const totalPages = Math.ceil(filteredSchedules.length / itemsPerPage);
    const currentSchedules = filteredSchedules.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (previewBill.playDays === 0) {
            return toast.warning("Khoảng thời gian này không có buổi đá nào hợp lệ!");
        }
        try {
            const res = await axios.post('http://localhost:5043/api/staff/fixed-schedules', formData);
            toast.success(`${res.data.message} Đã khóa sân tự động ${res.data.autoBookings} ngày!`);
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data || 'Lỗi khi tạo hợp đồng');
        }
    };

    const handleCancelSchedule = async (id, teamName) => {
        if (window.confirm(`Bạn có chắc muốn HỦY hợp đồng của ${teamName} không? Các lịch sân chưa đá sẽ được giải phóng ngay lập tức!`)) {
            try {
                const res = await axios.put(`http://localhost:5043/api/staff/fixed-schedules/${id}/cancel`);
                toast.success(`${res.data.message} Đã nhả ${res.data.freedCourts} ngày trống cho khách!`);
                fetchData();
            } catch (error) {
                toast.error(error.response?.data?.message || error.response?.data || 'Có lỗi xảy ra khi hủy hợp đồng');
            }
        }
    };

    const getCardStyle = (status) => {
        if (status === 'active') return styles.cardActive;
        if (status === 'warning') return styles.cardWarning;
        return styles.cardExpired;
    };

    const getBadge = (status) => {
        if (status === 'active') return <span className={`${styles.badge} ${styles.badgeActive}`}>Đang hoạt động</span>;
        if (status === 'warning') return <span className={`${styles.badge} ${styles.badgeWarning}`}>Sắp hết hạn</span>;
        return <span className={`${styles.badge} ${styles.badgeExpired}`}>Đã hết hạn/Đã hủy</span>;
    };

    const formatCurrency = (amount) => new Intl.NumberFormat('vi-VN').format(amount || 0);

    return (
        <div className={styles.container}>
            <ToastContainer position="top-right" autoClose={3000} />

            <header className={styles.header}>
                <h1 className={styles.title}>Quản lý Lịch Cố Định</h1>
                <button className={styles.btnAdd} onClick={() => setIsModalOpen(true)}>
                    <span className="material-symbols-outlined">add</span>
                    Tạo Hợp Đồng Mới
                </button>
            </header>

            <div className={styles.mainContent}>
                <div className={styles.filterContainer}>
                    <button className={`${styles.filterBtn} ${statusFilter === 'all' ? styles.filterBtnActive : ''}`} onClick={() => setStatusFilter('all')}>Tất cả Hợp đồng</button>
                    <button className={`${styles.filterBtn} ${statusFilter === 'active' ? styles.filterBtnActive : ''}`} onClick={() => setStatusFilter('active')}>Đang hoạt động</button>
                    <button className={`${styles.filterBtn} ${statusFilter === 'inactive' ? styles.filterBtnActive : ''}`} onClick={() => setStatusFilter('inactive')}>Đã kết thúc / Đã hủy</button>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', color: '#64748b', fontWeight: 'bold', padding: '40px' }}>Đang tải dữ liệu...</div>
                ) : filteredSchedules.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#64748b', padding: '40px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>Không có hợp đồng nào phù hợp.</div>
                ) : (
                    <>
                        <div className={styles.grid}>
                            {currentSchedules.map(item => (
                                <div key={item.id} className={`${styles.card} ${getCardStyle(item.status)}`}>
                                    <div className={styles.cardHeader}>
                                        <div>
                                            <h3 className={styles.teamName}>{item.teamName}</h3>
                                            <p className={styles.phone}><span className="material-symbols-outlined" style={{ fontSize: '16px' }}>call</span>{item.phone}</p>
                                        </div>
                                        {getBadge(item.status)}
                                    </div>
                                    <div className={styles.infoRow}><span className={`material-symbols-outlined ${styles.icon}`}>stadium</span><strong>{item.courtName}</strong></div>
                                    <div className={styles.infoRow}><span className={`material-symbols-outlined ${styles.icon}`}>schedule</span><span>{item.timeInfo}</span></div>
                                    <div className={styles.infoRow}><span className={`material-symbols-outlined ${styles.icon}`}>event_available</span><span>Thời hạn: {item.duration}</span></div>
                                    <div className={styles.infoRow}><span className={`material-symbols-outlined ${styles.icon}`}>payments</span><span style={{ color: '#059669', fontWeight: 'bold' }}>Đã thu: {formatCurrency(item.totalPrice)} VNĐ</span></div>
                                    <div className={styles.divider}></div>
                                    <div className={styles.actionArea}>
                                        {item.status !== 'cancelled' && item.status !== 'expired' && (
                                            <button className={styles.actionBtn} title="Hủy hợp đồng" style={{ color: '#ef4444', border: '1px solid #fecaca', background: '#fef2f2' }} onClick={() => handleCancelSchedule(item.id, item.teamName)}>
                                                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete_forever</span>
                                                <span style={{ fontSize: '13px', marginLeft: '4px', fontWeight: '600' }}>Hủy HĐ</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        {filteredSchedules.length > 0 && <Pagination currentPage={currentPage} totalPages={totalPages} itemsPerPage={itemsPerPage} totalItems={filteredSchedules.length} onPageChange={setCurrentPage} onItemsPerPageChange={(newSize) => { setItemsPerPage(newSize); setCurrentPage(1); }} />}
                    </>
                )}
            </div>

            {isModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h2 className={styles.modalTitle}>Tạo Hợp Đồng Khách Ruột</h2>
                            <button className={styles.closeBtn} onClick={() => setIsModalOpen(false)}><span className="material-symbols-outlined">close</span></button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className={styles.formGroup}>
                                <label>Khách hàng (Đội trưởng)</label>
                                <select className={styles.formSelect} required value={formData.userId} onChange={e => setFormData({ ...formData, userId: e.target.value })}>
                                    <option value="">-- Chọn khách hàng --</option>
                                    {setupData.customers.map(c => <option key={c.id} value={c.id}>{c.fullName} ({c.phone})</option>)}
                                </select>
                            </div>

                            <div className={styles.row2}>
                                <div className={styles.formGroup}>
                                    <label>Chọn Sân</label>
                                    <select className={styles.formSelect} required value={formData.courtId} onChange={e => setFormData({ ...formData, courtId: e.target.value })}>
                                        <option value="">-- Chọn Sân --</option>
                                        {setupData.courts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Chọn Ca</label>
                                    <select className={styles.formSelect} required value={formData.timeSlotId} onChange={e => setFormData({ ...formData, timeSlotId: e.target.value })}>
                                        <option value="">-- Chọn Ca --</option>
                                        {setupData.timeSlots.map(t => <option key={t.id} value={t.id}>{t.time}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className={styles.row2}>
                                <div className={styles.formGroup}>
                                    <label>Ngày bắt đầu</label>
                                    <input type="date" required className={styles.formInput} value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Ngày kết thúc</label>
                                    <input type="date" required className={styles.formInput} value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} />
                                </div>
                            </div>

                            <div className={styles.row2}>
                                <div className={styles.formGroup}>
                                    <label>Đá vào Thứ mấy?</label>
                                    <select className={styles.formSelect} value={formData.dayOfWeek} onChange={e => setFormData({ ...formData, dayOfWeek: e.target.value })}>
                                        <option value="2">Thứ 2</option>
                                        <option value="3">Thứ 3</option>
                                        <option value="4">Thứ 4</option>
                                        <option value="5">Thứ 5</option>
                                        <option value="6">Thứ 6</option>
                                        <option value="7">Thứ 7</option>
                                        <option value="8">Chủ nhật</option>
                                    </select>
                                </div>

                                {/* KHU VỰC TỰ ĐỘNG TÍNH TOÁN HIỂN THỊ */}
                                <div className={styles.formGroup}>
                                    <label>Chi tiết hóa đơn tạm tính</label>
                                    <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                            <span style={{ color: '#64748b' }}>Số buổi đá hợp lệ:</span>
                                            <strong>{previewBill.playDays} buổi</strong>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                            <span style={{ color: '#64748b' }}>Đơn giá (Chuẩn giờ vàng):</span>
                                            <strong>{formatCurrency(previewBill.unitPrice)} đ/ca</strong>
                                        </div>
                                        <div style={{ borderTop: '1px dashed #cbd5e1', margin: '8px 0' }}></div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontWeight: 'bold', color: '#0f172a' }}>TỔNG TIỀN:</span>
                                            <span style={{ color: '#059669', fontSize: '16px', fontWeight: '900' }}>
                                                {formatCurrency(previewBill.totalPrice)} đ
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.actionBtns}>
                                <button type="button" className={styles.btnCancel} onClick={() => setIsModalOpen(false)}>Hủy</button>
                                <button type="submit" className={styles.btnSubmit} disabled={previewBill.playDays === 0}>Lưu & Tự động xếp lịch</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FixedSchedule;