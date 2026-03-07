import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const PosPage = () => {
    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState([]);
    const [voucherCode, setVoucherCode] = useState('');
    const [discountAmount, setDiscountAmount] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');

    // 1. Tải danh sách sản phẩm từ Backend
    const fetchProducts = async () => {
        try {
            const response = await axios.get('http://localhost:5281/api/pos/products');
            setProducts(response.data);
        } catch (error) {
            toast.error('Không thể tải danh sách sản phẩm');
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    // 2. Logic Thêm vào giỏ hàng
    const addToCart = (product) => {
        if (product.stockQuantity < 1) {
            toast.error(`Sản phẩm ${product.name} đã hết hàng!`);
            return;
        }

        setCart((prevCart) => {
            const existingItem = prevCart.find((item) => item.product.id === product.id);
            if (existingItem) {
                if (existingItem.quantity >= product.stockQuantity) {
                    toast.warning('Vượt quá số lượng tồn kho!');
                    return prevCart;
                }
                return prevCart.map((item) =>
                    item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prevCart, { product, quantity: 1 }];
        });
    };

    // 3. Logic Tăng/Giảm số lượng trong giỏ
    const updateQuantity = (productId, delta) => {
        setCart((prevCart) => {
            return prevCart.map((item) => {
                if (item.product.id === productId) {
                    const newQty = item.quantity + delta;
                    if (newQty > item.product.stockQuantity) {
                        toast.warning('Vượt quá số lượng tồn kho!');
                        return item;
                    }
                    return { ...item, quantity: newQty };
                }
                return item;
            }).filter((item) => item.quantity > 0); // Xóa nếu số lượng = 0
        });
    };

    // 4. Logic Kiểm tra Voucher
    const applyVoucher = async () => {
        if (!voucherCode) return toast.warning('Vui lòng nhập mã giảm giá');
        try {
            const response = await axios.get(`http://localhost:5281/api/vouchers/validate/${voucherCode}`);
            if (response.data.isValid) {
                setDiscountAmount(response.data.discountAmount);
                toast.success(response.data.message);
            }
        } catch (error) {
            setDiscountAmount(0);
            toast.error(error.response?.data?.message || 'Mã giảm giá không hợp lệ');
        }
    };

    // 5. Logic Thanh toán (Chốt đơn xuống DB)
    const handleCheckout = async (method) => {
        if (cart.length === 0) return toast.warning('Giỏ hàng đang trống!');

        const payload = {
            bookingId: null, // Đơn khách vãng lai
            items: cart.map((item) => ({
                productId: item.product.id,
                quantity: item.quantity
            }))
        };

        try {
            const response = await axios.post('http://localhost:5281/api/pos/create-order', payload);
            if (response.data.success) {
                toast.success(`Thanh toán ${method} thành công! Đã trừ kho.`);
                setCart([]); // Làm sạch giỏ hàng
                setDiscountAmount(0);
                setVoucherCode('');
                fetchProducts(); // Tải lại kho hàng mới nhất
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi khi thanh toán');
        }
    };

    // Tính toán tiền
    const subTotal = cart.reduce((sum, item) => sum + item.product.unitPrice * item.quantity, 0);
    const finalTotal = Math.max(0, subTotal - discountAmount);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    // Lọc sản phẩm theo ô tìm kiếm
    const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="flex flex-col h-screen bg-slate-50 font-['Inter'] overflow-hidden">
            <ToastContainer position="top-right" autoClose={3000} />

            {/* HEADER */}
            <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-50">
                <div className="flex items-center gap-4">
                    <div className="bg-[#0d7ff2] text-white p-2 rounded-[12px]">
                        <span className="material-symbols-outlined block">sports_tennis</span>
                    </div>
                    <h1 className="text-xl font-bold text-slate-800">POS - Bán hàng & Dịch vụ</h1>
                </div>

                <div className="flex-1 max-w-xl px-12">
                    <div className="relative group">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#0d7ff2] transition-colors">search</span>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-100 border-none rounded-[12px] py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-[#0d7ff2]/20 focus:bg-white transition-all text-sm"
                            placeholder="Tìm kiếm sản phẩm (Tên, Mã vạch...)"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="text-right hidden md:block">
                        <p className="text-sm font-semibold text-slate-800">Admin Quầy</p>
                        <p className="text-xs text-slate-500">Ca làm việc: Sáng</p>
                    </div>
                </div>
            </header>

            {/* MAIN CONTENT */}
            <main className="flex-1 flex overflow-hidden">

                {/* LEFT: PRODUCTS GRID */}
                <section className="w-[70%] flex flex-col h-full border-r border-slate-200">
                    <nav className="p-4 bg-white border-b border-slate-100 flex items-center gap-2">
                        <button className="px-6 py-2 bg-[#0d7ff2] text-white font-medium rounded-[12px] text-sm shadow-sm">Tất cả</button>
                        <button className="px-6 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium rounded-[12px] text-sm">Đồ uống</button>
                        <button className="px-6 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium rounded-[12px] text-sm">Dụng cụ</button>
                    </nav>

                    <div className="p-6 overflow-y-auto bg-slate-50 flex-1">
                        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {filteredProducts.map((p) => (
                                <article key={p.id} onClick={() => addToCart(p)} className="bg-white p-4 rounded-[12px] shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col border border-slate-100">
                                    <div className="relative w-full h-32 bg-slate-50 rounded-lg mb-3 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-slate-300 text-4xl">inventory_2</span>
                                        <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${p.stockQuantity > 5 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            Còn {p.stockQuantity}
                                        </span>
                                    </div>
                                    <h3 className="font-semibold text-slate-800 text-sm mb-1">{p.name}</h3>
                                    <p className="text-[#0d7ff2] font-bold text-base mt-auto">{formatCurrency(p.unitPrice)}</p>
                                    <button className="mt-3 w-full flex items-center justify-center gap-1 py-1.5 border border-[#0d7ff2]/20 text-[#0d7ff2] hover:bg-[#0d7ff2] hover:text-white rounded-lg transition-colors text-xs font-medium">
                                        <span className="material-symbols-outlined text-sm">add</span> Thêm
                                    </button>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                {/* RIGHT: CART & CHECKOUT */}
                <aside className="w-[30%] bg-white flex flex-col shadow-[-4px_0_15px_rgba(0,0,0,0.02)]">
                    <div className="p-6 pb-4 border-b border-slate-100">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <span className="material-symbols-outlined text-[#0d7ff2]">shopping_cart</span> Giỏ hàng
                            </h2>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {cart.map((item) => (
                            <div key={item.product.id} className="flex items-start gap-3 group">
                                <div className="flex-1">
                                    <h4 className="text-sm font-semibold text-slate-800">{item.product.name}</h4>
                                    <p className="text-xs text-slate-500">{formatCurrency(item.product.unitPrice)}</p>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-1">
                                        <button onClick={() => updateQuantity(item.product.id, -1)} className="w-6 h-6 flex items-center justify-center rounded bg-white border border-slate-200 hover:bg-slate-100">-</button>
                                        <span className="text-sm font-bold min-w-[20px] text-center">{item.quantity}</span>
                                        <button onClick={() => updateQuantity(item.product.id, 1)} className="w-6 h-6 flex items-center justify-center rounded bg-white border border-slate-200 hover:bg-slate-100">+</button>
                                    </div>
                                    <p className="text-sm font-bold text-slate-800">{formatCurrency(item.product.unitPrice * item.quantity)}</p>
                                </div>
                            </div>
                        ))}
                        {cart.length === 0 && <p className="text-center text-slate-400 text-sm mt-10">Chưa có sản phẩm nào</p>}
                    </div>

                    <div className="p-6 bg-slate-50/80 border-t border-slate-200 space-y-4">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500">Tạm tính:</span>
                            <span className="font-semibold text-slate-800">{formatCurrency(subTotal)}</span>
                        </div>

                        <div className="flex gap-2">
                            <input
                                value={voucherCode}
                                onChange={(e) => setVoucherCode(e.target.value)}
                                type="text"
                                className="flex-1 text-sm rounded-[12px] border-slate-200 focus:ring-[#0d7ff2] focus:border-[#0d7ff2] px-3"
                                placeholder="Nhập mã FPT_SALE..."
                            />
                            <button onClick={applyVoucher} className="bg-white border border-slate-200 text-slate-700 font-semibold px-4 py-2 rounded-[12px] text-xs hover:bg-slate-100">
                                Áp dụng
                            </button>
                        </div>

                        {discountAmount > 0 && (
                            <div className="flex justify-between items-center text-sm text-green-600">
                                <span>Giảm giá:</span>
                                <span className="font-semibold">-{formatCurrency(discountAmount)}</span>
                            </div>
                        )}

                        <div className="border-t border-dashed border-slate-300 pt-4">
                            <div className="flex justify-between items-center mb-6">
                                <span className="text-lg font-bold text-slate-800">Tổng cộng:</span>
                                <span className="text-2xl font-black text-[#0d7ff2]">{formatCurrency(finalTotal)}</span>
                            </div>

                            <div className="space-y-3">
                                <button onClick={() => handleCheckout('Tiền mặt')} className="w-full bg-[#1e293b] hover:bg-slate-900 text-white font-bold py-4 rounded-[12px] flex items-center justify-center gap-3 transition-transform active:scale-[0.98]">
                                    <span className="material-symbols-outlined">payments</span> Thanh toán Tiền mặt (COD)
                                </button>
                                <button onClick={() => handleCheckout('VNPay')} className="w-full bg-gradient-to-r from-[#0d7ff2] to-[#38bdf8] hover:opacity-90 text-white font-bold py-4 rounded-[12px] flex items-center justify-center gap-3 transition-transform active:scale-[0.98] shadow-lg shadow-[#0d7ff2]/20">
                                    <span className="material-symbols-outlined">qr_code_2</span> Thanh toán VNPay
                                </button>
                            </div>
                        </div>
                    </div>
                </aside>

            </main>
        </div>
    );
};

export default PosPage;