import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const VoucherManagement = () => {
    const [vouchers, setVouchers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        code: '',
        discountAmount: 0,
        usageLimit: 0,
        expiryDate: ''
    });

    const fetchVouchers = async () => {
        try {
            setLoading(true);
            const response = await axios.get('http://localhost:5043/api/vouchers');
            setVouchers(response.data);
        } catch (error) {
            toast.error('Lỗi tải danh sách mã giảm giá');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVouchers();
    }, []);

    const openModal = (voucher = null) => {
        if (voucher) {
            setEditingId(voucher.id);
            setFormData({
                code: voucher.code,
                discountAmount: voucher.discountAmount,
                usageLimit: voucher.usageLimit,
                expiryDate: voucher.expiryDate ? voucher.expiryDate.split('T')[0] : ''
            });
        } else {
            setEditingId(null);
            setFormData({ code: '', discountAmount: 0, usageLimit: 100, expiryDate: '' });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await axios.put(`http://localhost:5043/api/vouchers/${editingId}`, { id: editingId, ...formData });
                toast.success('Cập nhật thành công!');
            } else {
                await axios.post('http://localhost:5043/api/vouchers', formData);
                toast.success('Tạo mã giảm giá thành công!');
            }
            setIsModalOpen(false);
            fetchVouchers();
        } catch (error) {
            toast.error('Có lỗi xảy ra khi lưu mã giảm giá');
        }
    };

    const handleDelete = async (id, code) => {
        if (window.confirm(`Bạn có chắc chắn muốn xóa mã "${code}" không?`)) {
            try {
                await axios.delete(`http://localhost:5043/api/vouchers/${id}`);
                toast.success('Đã xóa mã giảm giá');
                fetchVouchers();
            } catch (error) {
                toast.error('Lỗi khi xóa mã');
            }
        }
    };

    const filteredVouchers = vouchers.filter(v =>
        v.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const formatCurrency = (amount) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

    // Kiểm tra trạng thái (Còn hạn / Hết hạn)
    const getStatus = (expiryDate, usageLimit) => {
        if (usageLimit <= 0) return <span className="px-2.5 py-1 bg-slate-100 text-slate-500 rounded-md text-[11px] font-bold">Hết lượt</span>;
        if (new Date(expiryDate) < new Date()) return <span className="px-2.5 py-1 bg-red-50 text-red-600 rounded-md text-[11px] font-bold">Hết hạn</span>;
        return <span className="px-2.5 py-1 bg-green-50 text-green-600 rounded-md text-[11px] font-bold">Đang chạy</span>;
    };

    return (
        <div className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC] h-full overflow-y-auto font-['Inter']">
            <ToastContainer position="top-right" autoClose={3000} />

            <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
                <h1 className="text-lg font-bold text-slate-800">Quản lý Mã Giảm Giá (Voucher)</h1>
                <div className="text-sm font-medium text-slate-500">Phân hệ Quản trị</div>
            </header>

            <div className="p-8 max-w-6xl mx-auto w-full space-y-6">
                <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <p className="text-sm text-slate-500">Thiết lập các chương trình khuyến mãi, giảm giá cho khách hàng đặt sân.</p>
                    </div>
                    <button onClick={() => openModal()} className="inline-flex items-center justify-center gap-2 bg-[#0d7ff2] hover:bg-blue-600 text-white font-semibold py-2.5 px-5 rounded-xl transition-all shadow-sm active:scale-95">
                        <span className="material-symbols-outlined text-xl">add_circle</span>
                        <span>Tạo mã mới</span>
                    </button>
                </section>

                <section className="bg-white p-4 rounded-t-xl border border-slate-200 border-b-0">
                    <div className="relative w-full max-w-md">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                        <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 pr-4 py-2 w-full border border-slate-200 rounded-xl text-sm focus:border-[#0d7ff2] focus:ring-[#0d7ff2] outline-none uppercase" placeholder="Tìm kiếm theo mã Code..." type="text" />
                    </div>
                </section>

                <section className="bg-white border border-slate-200 rounded-b-xl shadow-sm overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Mã Code</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Mức giảm</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Lượt dùng</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Hết hạn</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan="6" className="text-center py-8 text-slate-500">Đang tải dữ liệu...</td></tr>
                            ) : filteredVouchers.length === 0 ? (
                                <tr><td colSpan="6" className="text-center py-8 text-slate-500">Không có mã giảm giá nào.</td></tr>
                            ) : (
                                filteredVouchers.map((v) => (
                                    <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="font-bold text-[#0d7ff2] bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 tracking-wider">{v.code}</span>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-bold text-slate-800">
                                            {formatCurrency(v.discountAmount)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600 font-medium">{v.usageLimit} lần</td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            {new Date(v.expiryDate).toLocaleDateString('vi-VN')}
                                        </td>
                                        <td className="px-6 py-4">
                                            {getStatus(v.expiryDate, v.usageLimit)}
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            <button onClick={() => openModal(v)} className="p-2 text-slate-400 hover:text-[#0d7ff2] hover:bg-blue-50 rounded-lg transition-colors">
                                                <span className="material-symbols-outlined text-lg">edit</span>
                                            </button>
                                            <button onClick={() => handleDelete(v.id, v.code)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                                <span className="material-symbols-outlined text-lg">delete</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </section>
            </div>

            {/* MODAL THÊM / SỬA */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-[fadeIn_0.2s_ease-out]">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-slate-800">{editingId ? 'Cập nhật Voucher' : 'Tạo Voucher mới'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Mã Code (Ví dụ: TET2026) *</label>
                                <input required type="text" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-[#0d7ff2] text-sm font-bold tracking-wider uppercase" placeholder="TET2026" />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Số tiền giảm (VND) *</label>
                                <div className="relative">
                                    <input
                                        required
                                        type="text"
                                        value={formData.discountAmount === 0 ? '' : formData.discountAmount.toLocaleString('en-US')}
                                        onChange={e => {
                                            const rawValue = e.target.value.replace(/,/g, '').replace(/\D/g, '');
                                            setFormData({ ...formData, discountAmount: rawValue ? parseInt(rawValue, 10) : 0 });
                                        }}
                                        className="w-full px-3 py-2 pr-8 border border-slate-200 rounded-lg outline-none focus:border-[#0d7ff2] text-sm"
                                        placeholder="VD: 20,000"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">đ</span>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Giới hạn lượt dùng</label>
                                    <input required type="number" min="1" value={formData.usageLimit} onChange={e => setFormData({ ...formData, usageLimit: parseInt(e.target.value) })} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-[#0d7ff2] text-sm" />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Ngày hết hạn *</label>
                                    <input required type="date" value={formData.expiryDate} onChange={e => setFormData({ ...formData, expiryDate: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-[#0d7ff2] text-sm" />
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-6">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                                    Hủy
                                </button>
                                <button type="submit" className="px-5 py-2 text-sm font-medium text-white bg-[#0d7ff2] hover:bg-blue-600 rounded-lg transition-colors shadow-sm">
                                    Lưu mã giảm giá
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VoucherManagement;