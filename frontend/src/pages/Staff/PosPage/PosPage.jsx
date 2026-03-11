import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const PosPage = () => {
    const [products, setProducts] = useState([]);
    const [activeBookings, setActiveBookings] = useState([]);
    const [cart, setCart] = useState([]);

    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState('Tất cả');
    const [selectedBookingId, setSelectedBookingId] = useState('');

    // STATE CHO MODAL MÃ QR NGÂN HÀNG
    const [isQrModalOpen, setIsQrModalOpen] = useState(false);

    const fetchData = async () => {
        try {
            // ĐÃ FIX: Đổi từ api/pos/products thành api/products cho khớp với Backend
            const resProducts = await axios.get('http://localhost:5043/api/products');
            setProducts(resProducts.data);

            const resBookings = await axios.get('http://localhost:5043/api/pos/active-bookings');
            setActiveBookings(resBookings.data);
        } catch (error) {
            console.error("Lỗi API POS:", error);
            toast.error('Không thể tải dữ liệu POS. Hãy kiểm tra Backend.');
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

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
                    toast.warning('Vượt tồn kho!');
                    return item;
                }
                return { ...item, quantity: newQty };
            }
            return item;
        }).filter((item) => item.quantity > 0));
    };

    // HÀM XỬ LÝ THANH TOÁN (THÊM LUỒNG CHUYỂN KHOẢN NGÂN HÀNG)
    const handleCheckout = async (method) => {
        if (cart.length === 0) return toast.warning('Giỏ hàng trống!');

        const subTotal = cart.reduce((sum, item) => sum + item.product.unitPrice * item.quantity, 0);
        const bookingIdToSave = selectedBookingId ? parseInt(selectedBookingId) : null;

        const payload = {
            bookingId: bookingIdToSave,
            items: cart.map((item) => ({ productId: item.product.id, quantity: item.quantity }))
        };

        try {
            // Tạo Hóa đơn Order trước để trừ tồn kho
            await axios.post('http://localhost:5043/api/pos/create-order', payload);

            if (method === 'GhiSo') {
                toast.success('Đã ghi sổ nợ vào hóa đơn sân thành công!');
                setCart([]); setSelectedBookingId(''); fetchData();
                return;
            }

            if (method === 'VNPay') {
                const payResponse = await axios.post('http://localhost:5043/api/payments/process', {
                    bookingId: 9999,
                    amount: subTotal,
                    paymentMethod: 'VNPAY'
                });
                if (payResponse.data.paymentUrl) {
                    window.location.href = payResponse.data.paymentUrl;
                    return;
                }
            } else if (method === 'Chuyển khoản') {
                toast.success(`Xác nhận Chuyển khoản thành công!`);
                setCart([]); fetchData();
                setIsQrModalOpen(false); // Đóng modal QR
            } else {
                toast.success(`Thu Tiền mặt thành công!`);
                setCart([]); fetchData();
            }
        } catch (error) {
            toast.error('Lỗi xử lý giao dịch');
        }
    };

    const totalAmount = cart.reduce((sum, item) => sum + item.product.unitPrice * item.quantity, 0);
    const formatCurrency = (amount) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

    const filteredProducts = products.filter(p => {
        const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchCategory = activeCategory === 'Tất cả' || (p.category && p.category.name === activeCategory);
        return matchSearch && matchCategory;
    });

    return (
        <div className="flex flex-col h-screen bg-slate-50 font-['Inter'] overflow-hidden">
            <ToastContainer position="top-right" autoClose={3000} />

            <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-50">
                <div className="flex items-center gap-4">
                    <div className="bg-[#0d7ff2] text-white p-2 rounded-[12px]">
                        <span className="material-symbols-outlined block">point_of_sale</span>
                    </div>
                    <h1 className="text-xl font-bold text-slate-800">Máy POS Bán hàng</h1>
                </div>
                <div className="flex-1 max-w-xl px-12">
                    <div className="relative group">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                        <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-100 border-none rounded-[12px] py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-[#0d7ff2]/20 focus:bg-white text-sm" placeholder="Tìm kiếm nước uống, dụng cụ..." />
                    </div>
                </div>
            </header>

            <main className="flex-1 flex overflow-hidden">
                <section className="w-[70%] flex flex-col h-full border-r border-slate-200">
                    <nav className="p-4 bg-white border-b border-slate-100 flex items-center gap-2">
                        {['Tất cả', 'Đồ uống', 'Dụng cụ', 'Đồ ăn nhẹ'].map(cat => (
                            <button key={cat} onClick={() => setActiveCategory(cat)}
                                className={`px-6 py-2 font-medium rounded-[12px] text-sm transition-all ${activeCategory === cat ? 'bg-[#0d7ff2] text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                                {cat}
                            </button>
                        ))}
                    </nav>

                    <div className="p-6 overflow-y-auto bg-slate-50 flex-1 custom-scrollbar">
                        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {filteredProducts.map((p) => (
                                <article key={p.id} onClick={() => addToCart(p)} className="bg-white p-4 rounded-[12px] shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col border border-slate-100">
                                    <div className="relative w-full h-32 bg-slate-50 rounded-lg mb-3 flex items-center justify-center overflow-hidden border border-slate-100">
                                        {p.imageUrl ? (
                                            <img src={p.imageUrl} alt={p.name} className="w-full h-full object-contain p-2 hover:scale-110 transition-transform duration-300" />
                                        ) : (
                                            <span className="material-symbols-outlined text-slate-300 text-4xl">inventory_2</span>
                                        )}
                                        <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shadow-sm ${p.stockQuantity > 5 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            Còn {p.stockQuantity}
                                        </span>
                                    </div>
                                    <h3 className="font-semibold text-slate-800 text-sm mb-1">{p.name}</h3>
                                    <p className="text-[#0d7ff2] font-bold text-base mt-auto">{formatCurrency(p.unitPrice)}</p>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                <aside className="w-[30%] bg-white flex flex-col shadow-[-4px_0_15px_rgba(0,0,0,0.02)]">
                    <div className="p-6 pb-4 border-b border-slate-100">
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#0d7ff2]">shopping_cart</span> Giỏ hàng
                        </h2>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                        {cart.length === 0 && <p className="text-slate-400 text-center mt-10 text-sm">Chưa có sản phẩm nào được chọn</p>}
                        {cart.map((item) => (
                            <div key={item.product.id} className="flex items-start gap-3 group">
                                <div className="flex-1">
                                    <h4 className="text-sm font-semibold text-slate-800">{item.product.name}</h4>
                                    <p className="text-xs text-slate-500">{formatCurrency(item.product.unitPrice)}</p>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-1">
                                        <button onClick={() => updateQuantity(item.product.id, -1)} className="w-6 h-6 flex rounded bg-white border border-slate-200 justify-center items-center">-</button>
                                        <span className="text-sm font-bold min-w-[20px] text-center">{item.quantity}</span>
                                        <button onClick={() => updateQuantity(item.product.id, 1)} className="w-6 h-6 flex rounded bg-white border border-slate-200 justify-center items-center">+</button>
                                    </div>
                                    <p className="text-sm font-bold text-slate-800">{formatCurrency(item.product.unitPrice * item.quantity)}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="px-6 py-4 bg-white border-t border-slate-200">
                        <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">
                            <span className="material-symbols-outlined text-slate-400 text-sm">stadium</span> Gắn vào hóa đơn sân (Tùy chọn)
                        </label>
                        <select
                            value={selectedBookingId}
                            onChange={(e) => setSelectedBookingId(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-[#0d7ff2] text-sm bg-slate-50 font-medium text-slate-700"
                        >
                            <option value="">-- Thu tiền mặt ngay (Khách vãng lai) --</option>
                            {activeBookings.map(b => (
                                <option key={b.id} value={b.id}>
                                    {b.courtName} - Khách: {b.customerName} ({b.time})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="p-6 bg-slate-50/80 border-t border-slate-200 space-y-4">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-lg font-bold text-slate-800">Tổng cộng:</span>
                            <span className="text-2xl font-black text-[#0d7ff2]">{formatCurrency(totalAmount)}</span>
                        </div>

                        <div className="space-y-3">
                            {selectedBookingId ? (
                                <button onClick={() => handleCheckout('GhiSo')} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-[12px] flex items-center justify-center gap-3 transition-colors shadow-sm">
                                    <span className="material-symbols-outlined">edit_document</span> Ghi Sổ Nợ Vào Sân
                                </button>
                            ) : (
                                <>
                                    <button onClick={() => handleCheckout('Tiền mặt')} className="w-full bg-[#1e293b] hover:bg-slate-800 text-white font-bold py-3 rounded-[12px] flex items-center justify-center gap-2 transition-colors">
                                        <span className="material-symbols-outlined">payments</span> Tiền Mặt
                                    </button>

                                    <div className="flex gap-3">
                                        <button onClick={() => {
                                            if (cart.length === 0) return toast.warning('Giỏ hàng trống!');
                                            setIsQrModalOpen(true);
                                        }} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-[12px] flex items-center justify-center gap-2 transition-colors">
                                            <span className="material-symbols-outlined text-lg">account_balance</span> Chuyển Khoản
                                        </button>

                                        <button onClick={() => handleCheckout('VNPay')} className="flex-1 bg-gradient-to-r from-[#0d7ff2] to-[#38bdf8] hover:opacity-90 text-white font-bold py-3 rounded-[12px] flex items-center justify-center gap-2 transition-opacity">
                                            <span className="material-symbols-outlined text-lg">qr_code_2</span> VNPay
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </aside>
            </main>

            {/* --- POPUP MÃ QR CHUYỂN KHOẢN --- */}
            {isQrModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-[fadeIn_0.2s_ease-out] flex flex-col items-center p-8">
                        <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                            <span className="material-symbols-outlined text-2xl">qr_code_scanner</span>
                        </div>
                        <h2 className="text-xl font-bold text-slate-800 mb-1">Mã QR Thanh Toán</h2>
                        <p className="text-sm text-slate-500 mb-6 text-center">Yêu cầu khách quét mã bằng ứng dụng Ngân hàng (Momo, ZaloPay...)</p>

                        <div className="w-56 h-56 bg-slate-50 rounded-xl overflow-hidden border border-slate-200 p-2 mb-6 shadow-sm">
                            <img src="/images/qr.jpg" alt="Mã QR Ngân Hàng" className="w-full h-full object-contain rounded-lg mix-blend-multiply" />
                        </div>

                        <div className="w-full bg-slate-50 border border-slate-100 p-4 rounded-xl mb-8 text-center">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Số tiền cần thanh toán</p>
                            <p className="text-3xl font-black text-[#0d7ff2]">{formatCurrency(totalAmount)}</p>
                        </div>

                        <div className="flex gap-3 w-full">
                            <button onClick={() => setIsQrModalOpen(false)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-colors">
                                Hủy bỏ
                            </button>
                            <button onClick={() => handleCheckout('Chuyển khoản')} className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined text-lg">check_circle</span>
                                Đã Nhận Tiền
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PosPage;