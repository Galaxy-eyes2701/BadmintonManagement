import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import styles from './ProductManagement.module.css';

const ProductManagement = () => {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        name: '', categoryId: '', stockQuantity: 0, unitPrice: 0, imageUrl: '', description: ''
    });

    const fetchData = async () => {
        try {
            setLoading(true);
            const resProducts = await axios.get('http://localhost:5043/api/products');
            setProducts(resProducts.data);
            const resCategories = await axios.get('http://localhost:5043/api/pos/categories');
            setCategories(resCategories.data);
        } catch (error) {
            toast.error('Lỗi tải dữ liệu');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const openModal = (product = null) => {
        if (product) {
            setEditingId(product.id);
            setFormData({
                name: product.name, categoryId: product.categoryId, stockQuantity: product.stockQuantity,
                unitPrice: product.unitPrice, imageUrl: product.imageUrl || '', description: product.description || ''
            });
        } else {
            setEditingId(null);
            setFormData({ name: '', categoryId: categories[0]?.id || '', stockQuantity: 0, unitPrice: 0, imageUrl: '', description: '' });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await axios.put(`http://localhost:5043/api/products/${editingId}`, { id: editingId, ...formData });
                toast.success('Cập nhật thành công!');
            } else {
                await axios.post('http://localhost:5043/api/products', formData);
                toast.success('Thêm thành công!');
            }
            setIsModalOpen(false); fetchData();
        } catch (error) { toast.error('Lỗi khi lưu sản phẩm'); }
    };

    const handleDelete = async (id, name) => {
        if (window.confirm(`Xóa "${name}"?`)) {
            try {
                await axios.delete(`http://localhost:5043/api/products/${id}`);
                toast.success('Đã xóa!'); fetchData();
            } catch (error) { toast.error('Không thể xóa sản phẩm này'); }
        }
    };

    const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) && (selectedCategory ? p.categoryId.toString() === selectedCategory : true));
    const formatCurrency = (amount) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

    return (
        <div className={styles.container}>
            <ToastContainer position="top-right" autoClose={3000} />
            <header className={styles.header}>
                <h1 className={styles.headerTitle}>Quản lý Kho & Sản phẩm</h1>
                <div className={styles.headerSubtitle}>Phân hệ Quản trị</div>
            </header>

            <div className={styles.mainContent}>
                <section className={styles.topSection}>
                    <div className={styles.description}>Thêm, sửa, xóa nước uống, dụng cụ.</div>
                    <button onClick={() => openModal()} className={styles.addBtn}>
                        <span className="material-symbols-outlined">add</span> Thêm sản phẩm
                    </button>
                </section>

                <section className={styles.filterCard}>
                    <div className={styles.searchWrapper}>
                        <span className={`material-symbols-outlined ${styles.searchIcon}`}>search</span>
                        <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={styles.searchInput} placeholder="Tìm kiếm tên..." type="text" />
                    </div>
                    <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className={styles.selectInput}>
                        <option value="">Tất cả danh mục</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </section>

                <section className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>ID</th> <th>Ảnh</th> <th>Tên sản phẩm</th> <th>Danh mục</th> <th>Tồn kho</th> <th>Đơn giá</th> <th style={{ textAlign: 'right' }}>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.map((p) => (
                                <tr key={p.id}>
                                    <td>#{p.id}</td>
                                    <td><div className={styles.imgBox}>{p.imageUrl ? <img src={p.imageUrl} alt={p.name} /> : <span className={`material-symbols-outlined ${styles.emptyIcon}`}>inventory_2</span>}</div></td>
                                    <td className={styles.prodName}>{p.name}</td>
                                    <td><span className={styles.badge}>{p.category?.name || 'Không có'}</span></td>
                                    <td>{p.stockQuantity <= 10 ? <div className={styles.stockWarning}>{p.stockQuantity} <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>warning</span></div> : <span>{p.stockQuantity}</span>}</td>
                                    <td className={styles.price}>{formatCurrency(p.unitPrice)}</td>
                                    <td className={styles.actions}>
                                        <button onClick={() => openModal(p)} className={`${styles.iconBtn} ${styles.edit}`}><span className="material-symbols-outlined">edit</span></button>
                                        <button onClick={() => handleDelete(p.id, p.name)} className={`${styles.iconBtn} ${styles.delete}`}><span className="material-symbols-outlined">delete</span></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className={styles.footer}>Tổng số: {filteredProducts.length} sản phẩm</div>
                </section>
            </div>

            {isModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h2>{editingId ? 'Sửa Sản Phẩm' : 'Thêm Sản Phẩm'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className={styles.closeBtn}><span className="material-symbols-outlined">close</span></button>
                        </div>
                        <form onSubmit={handleSubmit} className={styles.form}>
                            <div className={styles.formGroup}>
                                <label>Tên sản phẩm *</label>
                                <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className={styles.inputBase} placeholder="VD: Nước khoáng Lavie" />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Danh mục *</label>
                                <select required value={formData.categoryId} onChange={e => setFormData({ ...formData, categoryId: e.target.value })} className={styles.inputBase}>
                                    <option value="" disabled>-- Chọn danh mục --</option>
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className={styles.formGroup}>
                                <label>Đường dẫn ảnh</label>
                                <input type="text" value={formData.imageUrl} onChange={e => setFormData({ ...formData, imageUrl: e.target.value })} className={styles.inputBase} placeholder="/images/revive.jpg" />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Mô tả chi tiết</label>
                                <textarea rows="2" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className={styles.textareaBase} placeholder="Mô tả sản phẩm..." />
                            </div>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label>Tồn kho</label>
                                    <input required type="number" min="0" value={formData.stockQuantity} onChange={e => setFormData({ ...formData, stockQuantity: parseInt(e.target.value) })} className={styles.inputBase} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Đơn giá (VND) *</label>
                                    <div className={styles.inputWithSuffix}>
                                        <input required type="text" value={formData.unitPrice === 0 ? '' : formData.unitPrice.toLocaleString('en-US')} onChange={e => { const raw = e.target.value.replace(/,/g, '').replace(/\D/g, ''); setFormData({ ...formData, unitPrice: raw ? parseInt(raw, 10) : 0 }); }} />
                                        <span className={styles.suffix}>đ</span>
                                    </div>
                                </div>
                            </div>
                            <div className={styles.modalFooter}>
                                <button type="button" onClick={() => setIsModalOpen(false)} className={styles.cancelBtn}>Hủy</button>
                                <button type="submit" className={styles.submitBtn}>Lưu sản phẩm</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductManagement;