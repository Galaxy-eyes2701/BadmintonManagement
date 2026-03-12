import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import styles from './BookingManagement.module.css';
import Pagination from "../../../components/Admin/Pagination.jsx";
const BookingManagement = () => {
    const [bookings, setBookings] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [loading, setLoading] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(5);

    const fetchBookings = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`http://localhost:5043/api/staff/bookings?search=${searchTerm}&status=${statusFilter}`);
            setBookings(res.data);
        } catch (error) {
            toast.error('Lỗi khi tải danh sách Booking');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setCurrentPage(1);

        const delayDebounceFn = setTimeout(() => {
            fetchBookings();
        }, 300);
        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, statusFilter]);

    const handleCancelBooking = async (id) => {
        if (window.confirm('Bạn có chắc chắn muốn HỦY lịch đặt sân này không? Sân sẽ được làm trống ngay lập tức.')) {
            try {
                await axios.put(`http://localhost:5043/api/staff/bookings/${id}/cancel`);
                toast.success('Hủy thành công!');
                fetchBookings();
            } catch (error) {
                toast.error(error.response?.data || 'Có lỗi xảy ra');
            }
        }
    };

    const formatCurrency = (amount) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);

    const getStatusBadge = (status) => {
        switch (status) {
            case 'confirmed': return <span className={`${styles.badge} ${styles.badgeConfirmed}`}>Đã cọc / Chờ đá</span>;
            case 'completed': return <span className={`${styles.badge} ${styles.badgeCompleted}`}>Đã hoàn thành</span>;
            case 'cancelled': return <span className={`${styles.badge} ${styles.badgeCancelled}`}>Đã hủy</span>;
            default: return <span className={styles.badge}>{status}</span>;
        }
    };

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentBookings = bookings.slice(indexOfFirstItem, indexOfLastItem); // Chỉ lấy data của trang hiện tại
    const totalPages = Math.ceil(bookings.length / itemsPerPage);

    return (
        <div className={styles.container}>
            <ToastContainer position="top-right" autoClose={3000} />

            <header className={styles.header}>
                <h1 className={styles.title}>Quản lý Danh sách Booking</h1>
            </header>

            <div className={styles.mainContent}>
                <div className={styles.filterCard}>
                    <div className={styles.searchWrapper}>
                        <span className={`material-symbols-outlined ${styles.searchIcon}`}>search</span>
                        <input
                            type="text"
                            className={styles.searchInput}
                            placeholder="Tìm theo tên khách hàng hoặc Số điện thoại..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <select
                        className={styles.filterSelect}
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="">Tất cả trạng thái</option>
                        <option value="confirmed">Chờ đá (Đã cọc)</option>
                        <option value="completed">Đã hoàn thành</option>
                        <option value="cancelled">Đã hủy</option>
                    </select>
                </div>

                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th style={{ width: '50px', textAlign: 'center' }}>STT</th>
                                <th>Mã Đơn</th>
                                <th>Khách hàng</th>
                                <th>Thông tin Sân</th>
                                <th>Tổng tiền (Sân)</th>
                                <th>Trạng thái</th>
                                <th style={{ textAlign: 'right' }}>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '32px' }}>Đang tải dữ liệu...</td></tr>
                            ) : bookings.length === 0 ? (
                                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '32px' }}>Không tìm thấy kết quả nào.</td></tr>
                            ) : (
                                // MAP QUA currentBookings THAY VÌ bookings
                                currentBookings.map((b, index) => (
                                    <tr key={b.id}>
                                        {/* Tính toán STT chuẩn xác dù ở bất kỳ trang nào */}
                                        <td style={{ textAlign: 'center', fontWeight: 700, color: '#94a3b8' }}>
                                            {indexOfFirstItem + index + 1}
                                        </td>
                                        <td style={{ fontWeight: 700 }}>#{b.id}</td>
                                        <td>
                                            <div className={styles.customerCol}>
                                                <p className={styles.cusName}>{b.customerName}</p>
                                                <p className={styles.cusPhone}>
                                                    <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>call</span>
                                                    {b.phone}
                                                </p>
                                            </div>
                                        </td>
                                        <td>
                                            {b.courtInfo ? (
                                                <div className={styles.courtInfo}>
                                                    <span className={styles.courtName}>{b.courtInfo.courtName}</span>
                                                    <span className={styles.playTime}>
                                                        <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>schedule</span>
                                                        {b.courtInfo.time} | {new Date(b.courtInfo.date).toLocaleDateString('vi-VN')}
                                                    </span>
                                                </div>
                                            ) : <span style={{ color: '#94a3b8' }}>Chưa xếp sân</span>}
                                        </td>
                                        <td className={styles.price}>{formatCurrency(b.totalPrice)}</td>
                                        <td>{getStatusBadge(b.status)}</td>
                                        <td style={{ textAlign: 'right' }}>
                                            <button
                                                onClick={() => handleCancelBooking(b.id)}
                                                className={styles.btnCancel}
                                                disabled={b.status !== 'confirmed'}
                                                style={{ opacity: b.status !== 'confirmed' ? 0.3 : 1, marginLeft: 'auto' }}
                                            >
                                                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>block</span>
                                                Hủy Lịch
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {bookings.length > 0 && (
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        itemsPerPage={itemsPerPage}
                        totalItems={bookings.length}
                        onPageChange={setCurrentPage}
                        onItemsPerPageChange={(newSize) => {
                            setItemsPerPage(newSize);
                            setCurrentPage(1);
                        }}
                    />
                )}
            </div>
        </div>
    );
};

export default BookingManagement;