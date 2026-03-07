import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ProductManagement = () => {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    // States cho Lọc & Tìm kiếm
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');

    // States cho Popup (Modal) Thêm/Sửa
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        categoryId: '',
        stockQuantity: 0,
        unitPrice: 0
    });

    // Gọi API lấy dữ liệu
    const fetchData = async () => {
        try {
            setLoading(true);
            // Lấy danh sách sản phẩm
            const resProducts = await axios.get('http://localhost:5281/api/products');
            setProducts(resProducts.data);

            // Lấy danh mục để nạp vào thẻ <select>
            const resCategories = await axios.get('http://localhost:5281/api/pos/categories');
            setCategories(resCategories.data);
        } catch (error) {
            toast.error('Lỗi khi tải dữ liệu từ máy chủ');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Xử lý mở Modal
    const openModal = (product = null) => {
        if (product) {
            setEditingId(product.id);
            setFormData({
                name: product.name,
                categoryId: product.categoryId,
                stockQuantity: product.stockQuantity,
                unitPrice: product.unitPrice
            });
        } else {
            setEditingId(null);
            setFormData({ name: '', categoryId: categories[0]?.id || '', stockQuantity: 0, unitPrice: 0 });
        }
        setIsModalOpen(true);
    };

    // Xử lý Lưu (Thêm mới hoặc Cập nhật)
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await axios.put(`http://localhost:5281/api/products/${editingId}`, formData);
                toast.success('Cập nhật sản phẩm thành công!');
            } else {
                await axios.post('http://localhost:5281/api/products', formData);
                toast.success('Thêm sản phẩm mới thành công!');
            }
            setIsModalOpen(false);
            fetchData(); // Tải lại bảng
        } catch (error) {
            toast.error('Có lỗi xảy ra khi lưu sản phẩm');
        }
    };

    // Xử lý Xóa
    const handleDelete = async (id, name) => {
        if (window.confirm(`Bạn có chắc chắn muốn xóa "${name}" không?`)) {
            try {
                await axios.delete(`http://localhost:5281/api/products/${id}`);
                toast.success('Đã xóa sản phẩm');
                fetchData();
            } catch (error) {
                toast.error('Không thể xóa sản phẩm này vì đã có hóa đơn liên quan');
            }
        }
    };

    // Lọc dữ liệu
    const filteredProducts = products.filter(p => {
        const matchName = p.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchCategory = selectedCategory ? p.categoryId.toString() === selectedCategory : true;
        return matchName && matchCategory;
    });

    const formatCurrency = (amount) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

    return (
        <div className="bg-slate-50 font-sans text-slate-900 antialiased min-h-screen flex flex-col">
            <ToastContainer position="top-right" autoClose={3000} />

            {/* HEADER TẠM (Nếu bạn đã có MainLayout thì có thể bỏ Header này) */}
            <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-10 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#0d7ff2] rounded-[12px] flex items-center justify-center text-white">
                        <span className="material-symbols-outlined">sports_tennis</span>
                    </div>
                    <span className="font-bold text-lg tracking-tight">BadmintonPro - Quản lý Kho</span>
                </div>
            </header>

            {/* CONTENT */}
            <div className="flex-1 overflow-y-auto p-8">

                {/* TITLE & ADD BUTTON */}
                <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Quản lý Kho hàng & Dịch vụ</h1>
                        <p className="text-sm text-slate-500 mt-1">Quản lý danh mục sản phẩm, theo dõi tồn kho và cập nhật giá cả dịch vụ.</p>
                    </div>
                    <button onClick={() => openModal()} className="inline-flex items-center justify-center gap-2 bg-[#0d7ff2] hover:bg-blue-600 text-white font-semibold py-2.5 px-5 rounded-[12px] transition-all shadow-sm active:scale-95">
                        <span className="material-symbols-outlined text-xl font-bold">add</span>
                        <span>Thêm sản phẩm mới</span>
                    </button>
                </section>

                {/* FILTER BAR */}
                <section className="bg-white p-4 rounded-t-[12px] border border-slate-200 border-b-0 flex flex-wrap items-center gap-4">
                    <div className="relative flex-1 min-w-[240px]">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                        <input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 w-full border border-slate-200 rounded-[12px] text-sm focus:border-[#0d7ff2] focus:ring-[#0d7ff2] outline-none"
                            placeholder="Tìm kiếm sản phẩm..." type="text"
                        />
                    </div>
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="border border-slate-200 rounded-[12px] text-sm focus:border-[#0d7ff2] focus:ring-[#0d7ff2] outline-none min-w-[160px] py-2 px-3"
                    >
                        <option value="">Tất cả danh mục</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </section>

                {/* TABLE */}
                <section className="bg-white border border-slate-200 rounded-b-[12px] shadow-sm overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">ID</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tên sản phẩm</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Danh mục</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tồn kho</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Đơn giá</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan="6" className="text-center py-8 text-slate-500">Đang tải dữ liệu...</td></tr>
                            ) : filteredProducts.length === 0 ? (
                                <tr><td colSpan="6" className="text-center py-8 text-slate-500">Không tìm thấy sản phẩm nào.</td></tr>
                            ) : (
                                filteredProducts.map((p) => (
                                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 text-sm text-slate-500">#SP{p.id.toString().padStart(3, '0')}</td>
                                        <td className="px-6 py-4 text-sm font-semibold text-slate-800">{p.name}</td>
                                        <td className="px-6 py-4">
                                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
                                                {p.category?.name || 'Không có'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-bold">
                                            {p.stockQuantity <= 10 ? (
                                                <div className="flex items-center gap-1 text-red-600">
                                                    {p.stockQuantity} <span className="material-symbols-outlined text-sm">warning</span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-700">{p.stockQuantity}</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-[#0d7ff2] font-semibold">{formatCurrency(p.unitPrice)}</td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            <button onClick={() => openModal(p)} className="p-1.5 text-slate-400 hover:text-[#0d7ff2] transition-colors hover:bg-blue-50 rounded-md">
                                                <span className="material-symbols-outlined text-lg">edit</span>
                                            </button>
                                            <button onClick={() => handleDelete(p.id, p.name)} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors hover:bg-red-50 rounded-md">
                                                <span className="material-symbols-outlined text-lg">delete</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                    <footer className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-white rounded-b-[12px]">
                        <span className="text-xs text-slate-500 font-medium">Tổng số: {filteredProducts.length} sản phẩm</span>
                    </footer>
                </section>

            </div>

            {/* MODAL THÊM / SỬA */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-[16px] shadow-xl w-full max-w-md overflow-hidden animate-[fadeIn_0.2s_ease-out]">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-slate-800">{editingId ? 'Sửa Sản Phẩm' : 'Thêm Sản Phẩm Mới'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Tên sản phẩm *</label>
                                <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-[#0d7ff2] focus:ring-1 focus:ring-[#0d7ff2] text-sm" placeholder="VD: Nước khoáng Lavie" />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Danh mục *</label>
                                <select required value={formData.categoryId} onChange={e => setFormData({ ...formData, categoryId: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-[#0d7ff2] text-sm bg-white">
                                    <option value="" disabled>-- Chọn danh mục --</option>
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Số lượng tồn kho</label>
                                    <input required type="number" min="0" value={formData.stockQuantity} onChange={e => setFormData({ ...formData, stockQuantity: parseInt(e.target.value) })} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-[#0d7ff2] text-sm" />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Đơn giá (VND)</label>
                                    <input required type="number" min="0" value={formData.unitPrice} onChange={e => setFormData({ ...formData, unitPrice: parseInt(e.target.value) })} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-[#0d7ff2] text-sm" />
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-6">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                                    Hủy bỏ
                                </button>
                                <button type="submit" className="px-5 py-2 text-sm font-medium text-white bg-[#0d7ff2] hover:bg-blue-600 rounded-lg transition-colors shadow-sm">
                                    Lưu sản phẩm
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
};

export default ProductManagement;