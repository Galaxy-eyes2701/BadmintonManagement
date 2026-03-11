import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import styles from './VoucherManagement.module.css';

const VoucherManagement = () => {
    const [vouchers, setVouchers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({ code: '', discountAmount: 0, usageLimit: 0, expiryDate: '', description: '' });

    const fetchVouchers = async () => {
        try {
            const response = await axios.get('http://localhost:5043/api/vouchers');
            setVouchers(response.data);
        } catch (error) { toast.error('Lỗi tải danh sách voucher'); }
    };

    useEffect(() => { fetchVouchers(); }, []);

    const openModal = (voucher = null) => {
        if (voucher) {
            setEditingId(voucher.id);
            setFormData({ code: voucher.code, discountAmount: voucher.discountAmount, usageLimit: voucher.usageLimit, expiryDate: voucher.expiryDate ? voucher.expiryDate.split('T')[0] : '', description: voucher.description || '' });
        } else {
            setEditingId(null); setFormData({ code: '', discountAmount: 0, usageLimit: 100, expiryDate: '', description: '' });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) await axios.put(`http://localhost:5043/api/vouchers/${editingId}`, { id: editingId, ...formData });
            else await axios.post('http://localhost:5043/api/vouchers', formData);
            toast.success('Lưu thành công!'); setIsModalOpen(false); fetchVouchers();
        } catch (error) { toast.error('Lỗi khi lưu voucher'); }
    };

    const handleDelete = async (id, code) => {
        if (window.confirm(`Xóa mã "${code}"?`)) {
            await axios.delete(`http://localhost:5043/api/vouchers/${id}`);
            toast.success('Đã xóa!'); fetchVouchers();
        }
    };

    const formatCurrency = (amount) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

    const getStatusBadge = (expiryDate, usageLimit) => {
        if (usageLimit <= 0) return <span className={`${styles.statusBadge} ${styles.statusEmpty}`}>Hết lượt</span>;
        if (new Date(expiryDate) < new Date()) return <span className={`${styles.statusBadge} ${styles.statusExpired}`}>Hết hạn</span>;
        return <span className={`${styles.statusBadge} ${styles.statusActive}`}>Đang chạy</span>;
    };

    return (
        <div className={styles.container}>
            <ToastContainer position="top-right" autoClose={3000} />
            <header className={styles.header}>
                <h1 className={styles.headerTitle}>Quản lý Mã Giảm Giá</h1>
                <div className={styles.headerSubtitle}>Phân hệ Quản trị</div>
            </header>

            <div className={styles.mainContent}>
                <section className={styles.topSection}>
                    <div className={styles.description}>Thiết lập các chương trình khuyến mãi cho khách hàng.</div>
                    <button onClick={() => openModal()} className={styles.addBtn}>
                        <span className="material-symbols-outlined">add_circle</span> Thêm Voucher mới
                    </button>
                </section>

                <section className={styles.filterCard}>
                    <div className={styles.searchWrapper}>
                        <span className={`material-symbols-outlined ${styles.searchIcon}`}>search</span>
                        <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={styles.searchInput} placeholder="Tìm mã Code..." type="text" />
                    </div>
                </section>

                <section className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr><th>Mã Code</th> <th>Mức giảm</th> <th>Lượt dùng</th> <th>Hết hạn</th> <th>Trạng thái</th> <th style={{ textAlign: 'right' }}>Thao tác</th></tr>
                        </thead>
                        <tbody>
                            {vouchers.filter(v => v.code.toLowerCase().includes(searchTerm.toLowerCase())).map((v) => (
                                <tr key={v.id}>
                                    <td><span className={styles.voucherCode}>{v.code}</span></td>
                                    <td className={styles.price}>{formatCurrency(v.discountAmount)}</td>
                                    <td>{v.usageLimit} lần</td>
                                    <td>{new Date(v.expiryDate).toLocaleDateString('vi-VN')}</td>
                                    <td>{getStatusBadge(v.expiryDate, v.usageLimit)}</td>
                                    <td className={styles.actions}>
                                        <button onClick={() => openModal(v)} className={`${styles.iconBtn} ${styles.edit}`}><span className="material-symbols-outlined">edit</span></button>
                                        <button onClick={() => handleDelete(v.id, v.code)} className={`${styles.iconBtn} ${styles.delete}`}><span className="material-symbols-outlined">delete</span></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>
            </div>

            {isModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h2>{editingId ? 'Cập nhật Voucher' : 'Tạo Voucher mới'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className={styles.closeBtn}><span className="material-symbols-outlined">close</span></button>
                        </div>
                        <form onSubmit={handleSubmit} className={styles.form}>
                            <div className={styles.formGroup}>
                                <label>Mã Code *</label>
                                <input required type="text" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })} className={styles.inputBase} placeholder="TET2026" />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Số tiền giảm (VND) *</label>
                                <div className={styles.inputWithSuffix}>
                                    <input required type="text" value={formData.discountAmount === 0 ? '' : formData.discountAmount.toLocaleString('en-US')} onChange={e => { const raw = e.target.value.replace(/,/g, '').replace(/\D/g, ''); setFormData({ ...formData, discountAmount: raw ? parseInt(raw, 10) : 0 }); }} />
                                    <span className={styles.suffix}>đ</span>
                                </div>
                            </div>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label>Giới hạn lượt dùng</label>
                                    <input required type="number" min="1" value={formData.usageLimit} onChange={e => setFormData({ ...formData, usageLimit: parseInt(e.target.value) })} className={styles.inputBase} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Ngày hết hạn *</label>
                                    <input required type="date" value={formData.expiryDate} onChange={e => setFormData({ ...formData, expiryDate: e.target.value })} className={styles.inputBase} />
                                </div>
                            </div>
                            <div className={styles.formGroup}>
                                <label>Mô tả (Điều kiện áp dụng)</label>
                                <textarea rows="2" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className={styles.textareaBase} placeholder="VD: Áp dụng khung giờ vàng..." />
                            </div>
                            <div className={styles.modalFooter}>
                                <button type="button" onClick={() => setIsModalOpen(false)} className={styles.cancelBtn}>Hủy</button>
                                <button type="submit" className={styles.submitBtn}>Lưu mã giảm giá</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VoucherManagement;