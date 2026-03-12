import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import styles from './PosPage.module.css';

const PosPage = () => {
    const [products, setProducts] = useState([]);
    const [activeBookings, setActiveBookings] = useState([]);
    const [cart, setCart] = useState([]);

    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState('Tất cả');
    const [selectedBookingId, setSelectedBookingId] = useState('');
    const [isQrModalOpen, setIsQrModalOpen] = useState(false);

    const fetchData = async () => {
        try {
            const resProducts = await axios.get('http://localhost:5043/api/products');
            setProducts(resProducts.data);

            const resBookings = await axios.get('http://localhost:5043/api/pos/active-bookings');
            setActiveBookings(resBookings.data);
        } catch (error) {
            toast.error('Không thể tải dữ liệu POS. Hãy kiểm tra Backend.');
        }
    };

    useEffect(() => { fetchData(); }, []);

    const addToCart = (product) => {
        if (product.stockQuantity < 1) return toast.error(`Hết hàng!`);
        setCart((prev) => {
            const existing = prev.find((item) => item.product.id === product.id);
            if (existing) {
                if (existing.quantity >= product.stockQuantity) {
                    toast.warning('Vượt tồn kho!');
                    return prev;
                }
                return prev.map((item) => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prev, { product, quantity: 1 }];
        });
    };

    const updateQuantity = (productId, delta) => {
        setCart((prev) => prev.map((item) => {
            if (item.product.id === productId) {
                const newQty = item.quantity + delta;
                if (newQty > item.product.stockQuantity) {
                    toast.warning('Vượt tồn kho!'); return item;
                }
                return { ...item, quantity: newQty };
            }
            return item;
        }).filter((item) => item.quantity > 0));
    };

    const handleCheckout = async (method) => {
        if (cart.length === 0) return toast.warning('Giỏ hàng trống!');
        const subTotal = cart.reduce((sum, item) => sum + item.product.unitPrice * item.quantity, 0);
        const bookingIdToSave = selectedBookingId ? parseInt(selectedBookingId) : null;

        const payload = {
            bookingId: bookingIdToSave,
            items: cart.map((item) => ({ productId: item.product.id, quantity: item.quantity }))
        };

        try {
            await axios.post('http://localhost:5043/api/pos/create-order', payload);

            if (method === 'GhiSo') {
                toast.success('Đã ghi sổ nợ vào hóa đơn sân thành công!');
                setCart([]); setSelectedBookingId(''); fetchData();
            } else if (method === 'VNPay') {
                const payResponse = await axios.post('http://localhost:5043/api/payments/process', { bookingId: 9999, amount: subTotal, paymentMethod: 'VNPAY' });
                if (payResponse.data.paymentUrl) window.location.href = payResponse.data.paymentUrl;
            } else if (method === 'Chuyển khoản') {
                toast.success(`Xác nhận Chuyển khoản thành công!`);
                setCart([]); setIsQrModalOpen(false); fetchData();
            } else {
                toast.success(`Thu Tiền mặt thành công!`);
                setCart([]); fetchData();
            }
        } catch (error) { toast.error('Lỗi xử lý giao dịch'); }
    };

    const totalAmount = cart.reduce((sum, item) => sum + item.product.unitPrice * item.quantity, 0);
    const formatCurrency = (amount) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

    const filteredProducts = products.filter(p => {
        const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchCategory = activeCategory === 'Tất cả' || (p.category && p.category.name === activeCategory);
        return matchSearch && matchCategory;
    });

    const handlePrint = () => {
        if (cart.length === 0) return toast.warning('Chưa có sản phẩm để in hóa đơn!');
        window.print();
    };

    return (
        <div className={styles.container}>
            <ToastContainer position="top-right" autoClose={3000} />

            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <div className={styles.headerIcon}><span className="material-symbols-outlined">point_of_sale</span></div>
                    <h1 className={styles.headerTitle}>Máy POS Bán hàng</h1>
                </div>
                <div className={styles.headerSearch}>
                    <span className={`material-symbols-outlined ${styles.searchIcon}`}>search</span>
                    <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={styles.searchInput} placeholder="Tìm kiếm nước uống, dụng cụ..." />
                </div>
            </header>

            <main className={styles.main}>
                <section className={styles.productsSection}>
                    <nav className={styles.categoryNav}>
                        {['Tất cả', 'Đồ uống', 'Dụng cụ', 'Đồ ăn nhẹ'].map(cat => (
                            <button key={cat} onClick={() => setActiveCategory(cat)} className={`${styles.catBtn} ${activeCategory === cat ? styles.catBtnActive : ''}`}>{cat}</button>
                        ))}
                    </nav>

                    <div className={styles.productGridWrapper}>
                        <div className={styles.productGrid}>
                            {filteredProducts.map((p) => (
                                <article key={p.id} onClick={() => addToCart(p)} className={styles.productCard}>
                                    <div className={styles.imgWrapper}>
                                        {p.imageUrl ? <img src={p.imageUrl} alt={p.name} /> : <span className={`material-symbols-outlined ${styles.emptyImg}`}>inventory_2</span>}
                                        <span className={`${styles.stockBadge} ${p.stockQuantity > 5 ? styles.stockHigh : styles.stockLow}`}>Còn {p.stockQuantity}</span>
                                    </div>
                                    <h3 className={styles.prodName}>{p.name}</h3>
                                    <p className={styles.prodPrice}>{formatCurrency(p.unitPrice)}</p>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                <aside className={styles.sidebar}>
                    <div className={styles.cartHeader}>
                        <h2 className={styles.cartTitle}><span className="material-symbols-outlined" style={{ color: '#0d7ff2' }}>shopping_cart</span> Giỏ hàng</h2>
                    </div>

                    <div className={styles.cartList}>
                        {cart.length === 0 && <p className={styles.emptyText}>Chưa có sản phẩm nào được chọn</p>}
                        {cart.map((item) => (
                            <div key={item.product.id} className={styles.cartItem}>
                                <div className={styles.itemInfo}>
                                    <h4 className={styles.itemName}>{item.product.name}</h4>
                                    <p className={styles.itemUnitPrice}>{formatCurrency(item.product.unitPrice)}</p>
                                </div>
                                <div className={styles.itemControls}>
                                    <div className={styles.qtyBox}>
                                        <button onClick={() => updateQuantity(item.product.id, -1)} className={styles.qtyBtn}>-</button>
                                        <span className={styles.qtyValue}>{item.quantity}</span>
                                        <button onClick={() => updateQuantity(item.product.id, 1)} className={styles.qtyBtn}>+</button>
                                    </div>
                                    <p className={styles.itemTotal}>{formatCurrency(item.product.unitPrice * item.quantity)}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className={styles.bookingSelectBox}>
                        <label className={styles.selectLabel}><span className="material-symbols-outlined text-sm" style={{ color: '#94a3b8' }}>stadium</span> Gắn vào hóa đơn sân</label>
                        <select value={selectedBookingId} onChange={(e) => setSelectedBookingId(e.target.value)} className={styles.selectInput}>
                            <option value="">-- Thu tiền mặt ngay (Khách vãng lai) --</option>
                            {activeBookings.map(b => (
                                <option key={b.id} value={b.id}>{b.courtName} - Khách: {b.customerName} ({b.time})</option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.checkoutArea}>
                        <div className={styles.totalRow}>
                            <span className={styles.totalLabel}>Tổng cộng:</span>
                            <span className={styles.totalValue}>{formatCurrency(totalAmount)}</span>
                        </div>

                        {/* NÚT IN HÓA ĐƠN */}
                        <button
                            onClick={handlePrint}
                            className={styles.btnFull}
                            style={{ backgroundColor: '#f1f5f9', color: '#475569', marginBottom: '12px', border: '1px dashed #cbd5e1' }}
                        >
                            <span className="material-symbols-outlined">print</span> In Phiếu Tạm Tính
                        </button>

                        <div>
                            {selectedBookingId ? (
                                <button onClick={() => handleCheckout('GhiSo')} className={`${styles.btnFull} ${styles.btnOrange}`}>
                                    <span className="material-symbols-outlined">edit_document</span> Ghi Sổ Nợ Vào Sân
                                </button>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <button onClick={() => handleCheckout('Tiền mặt')} className={`${styles.btnFull} ${styles.btnDark}`}>
                                        <span className="material-symbols-outlined">payments</span> Tiền Mặt
                                    </button>
                                    <div className={styles.btnRow}>
                                        <button onClick={() => { if (cart.length === 0) return toast.warning('Giỏ hàng trống!'); setIsQrModalOpen(true); }} className={styles.btnGreen}>
                                            <span className="material-symbols-outlined text-lg">account_balance</span> Chuyển Khoản
                                        </button>
                                        <button onClick={() => handleCheckout('VNPay')} className={styles.btnGradient}>
                                            <span className="material-symbols-outlined text-lg">qr_code_2</span> VNPay
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </aside>
            </main>

            {/* QR Modal */}
            {isQrModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.qrIcon}><span className="material-symbols-outlined text-2xl">qr_code_scanner</span></div>
                        <h2 className={styles.modalTitle}>Mã QR Thanh Toán</h2>
                        <p className={styles.modalDesc}>Yêu cầu khách quét mã bằng ứng dụng Ngân hàng (Momo, ZaloPay...)</p>
                        <div className={styles.qrBox}><img src="/images/qr.jpg" alt="Mã QR Ngân Hàng" /></div>
                        <div className={styles.amountBox}>
                            <p>Số tiền cần thanh toán</p>
                            <p>{formatCurrency(totalAmount)}</p>
                        </div>
                        <div className={styles.modalActions}>
                            <button onClick={() => setIsQrModalOpen(false)} className={styles.btnCancel}>Hủy bỏ</button>
                            <button onClick={() => handleCheckout('Chuyển khoản')} className={styles.btnGreen}>
                                <span className="material-symbols-outlined text-lg">check_circle</span> Đã Nhận Tiền
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* =========================================================
                GIAO DIỆN HÓA ĐƠN CHỈ DÀNH CHO MÁY IN 
                Lưu ý: Đã gắn id="print-section"
            ========================================================= */}
            <div id="print-section">
                <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                    <h2 style={{ margin: 0, fontSize: '20px', textTransform: 'uppercase' }}>SÂN CẦU LÔNG FPT</h2>
                    <p style={{ margin: '5px 0', fontSize: '12px' }}>Khu Công Nghệ Cao Hòa Lạc, Thạch Thất</p>
                    <p style={{ margin: '5px 0', fontSize: '12px' }}>SĐT: 0988.123.456</p>
                    <hr style={{ borderTop: '1px dashed #000', margin: '10px 0' }} />
                    <h3 style={{ fontSize: '16px', margin: '10px 0' }}>PHIẾU THANH TOÁN (POS)</h3>
                    <p style={{ textAlign: 'left', fontSize: '12px', margin: '4px 0' }}>Ngày: {new Date().toLocaleString('vi-VN')}</p>
                    <p style={{ textAlign: 'left', fontSize: '12px', margin: '4px 0' }}>
                        Khách hàng: {selectedBookingId
                            ? activeBookings.find(b => b.id.toString() === selectedBookingId.toString())?.customerName || 'Khách đặt sân'
                            : 'Khách vãng lai'}
                    </p>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '15px', fontSize: '12px' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid #000' }}>
                            <th style={{ textAlign: 'left', padding: '6px 0' }}>Tên món</th>
                            <th style={{ textAlign: 'center' }}>SL</th>
                            <th style={{ textAlign: 'right' }}>T.Tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cart.map((item, idx) => (
                            <tr key={idx}>
                                <td style={{ padding: '6px 0' }}>{item.product.name}</td>
                                <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                                <td style={{ textAlign: 'right' }}>{(item.product.unitPrice * item.quantity).toLocaleString()}đ</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <hr style={{ borderTop: '1px dashed #000', margin: '10px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold' }}>
                    <span>TỔNG CỘNG:</span>
                    <span>{formatCurrency(totalAmount)}</span>
                </div>

                <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', fontStyle: 'italic' }}>
                    <p style={{ margin: '4px 0' }}>Cảm ơn quý khách và hẹn gặp lại!</p>
                    <p style={{ margin: '4px 0' }}>Phần mềm quản lý bởi Nhóm 1</p>
                </div>
            </div>

        </div>
    );
};

export default PosPage;