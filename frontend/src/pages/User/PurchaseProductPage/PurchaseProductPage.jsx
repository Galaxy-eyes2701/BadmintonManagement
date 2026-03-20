import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../../../hooks/useAuth.jsx";
import styles from "./PurchaseProductPage.module.css";

const API = "http://localhost:5043/api";

const PurchaseProductPage = () => {
  const navigate = useNavigate();
  const authCtx = useAuth();

  const getToken = () => {
    try {
      const s = localStorage.getItem("authState");
      if (s) {
        const parsed = JSON.parse(s);
        if (parsed?.token) return parsed.token;
      }
    } catch {}
    return null;
  };

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);

  // Data
  const [bookings, setBookings] = useState([]);
  const [products, setProducts] = useState([]);

  // Selections
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [cart, setCart] = useState({}); // { productId: quantity }

  // Payment option state
  const [paymentOption, setPaymentOption] = useState("onsite"); // online, onsite
  const [loadingPayment, setLoadingPayment] = useState(false);

  const authHeader = () => {
    const t = getToken();
    return t ? { Authorization: `Bearer ${t}` } : {};
  };

  // Load bookings and products
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const [bookingsRes, productsRes] = await Promise.all([
        fetch(`${API}/bookings/my/active-for-purchase`, {
          headers: authHeader(),
        }),
        fetch(`${API}/bookings/products`),
      ]);

      if (!bookingsRes.ok) throw new Error("Không thể tải danh sách booking.");
      if (!productsRes.ok) throw new Error("Không thể tải danh sách sản phẩm.");

      const bookingsJson = await bookingsRes.json();
      const productsJson = await productsRes.json();

      setBookings(bookingsJson.data ?? bookingsJson);
      setProducts(productsJson.data ?? productsJson);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Cart operations
  const addToCart = (product) => {
    setCart((prev) => ({
      ...prev,
      [product.id]: (prev[product.id] || 0) + 1,
    }));
  };

  const removeFromCart = (productId) => {
    setCart((prev) => {
      const newCart = { ...prev };
      if (newCart[productId] > 1) {
        newCart[productId]--;
      } else {
        delete newCart[productId];
      }
      return newCart;
    });
  };

  const getCartItemCount = () => {
    return Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  };

  const getCartTotal = () => {
    return Object.entries(cart).reduce((total, [productId, qty]) => {
      const product = products.find((p) => p.id === parseInt(productId));
      return total + (product?.unitPrice || 0) * qty;
    }, 0);
  };

  const getGrandTotal = () => {
    // Only return product total, not court total
    return getCartTotal();
  };

  // Submit order
  const handleSubmit = async () => {
    if (!selectedBooking) {
      setError("Vui lòng chọn booking.");
      return;
    }
    if (getCartItemCount() === 0) {
      setError("Vui lòng chọn ít nhất một sản phẩm.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const payload = {
        bookingId: selectedBooking.bookingId,
        products: Object.entries(cart).map(([productId, quantity]) => ({
          productId: parseInt(productId),
          quantity,
        })),
      };

      const res = await fetch(`${API}/bookings/purchase-products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeader(),
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Mua hàng thất bại.");

      setSuccess(json.data);
      setStep(3);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(n || 0);

  // Handle online payment for products only
  const handleOnlinePayment = async () => {
    if (!success?.bookingId) return;
    setLoadingPayment(true);
    setError("");
    try {
      const res = await fetch(`${API}/payments/product/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({
          bookingId: success.bookingId,
          amount: success.orderTotal
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Không thể tạo thanh toán.");
      
      // Redirect to VNPay
      if (json.paymentUrl) {
        window.location.href = json.paymentUrl;
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingPayment(false);
    }
  };

  // Success screen
  if (success && step === 3) {
    return (
      <div className={styles.successWrap}>
        <div className={styles.successCard}>
          <div className={styles.successIcon}>✅</div>
          <h2 className={styles.successTitle}>Mua hàng thành công!</h2>
          <div className={styles.successDetails}>
            <div className={styles.successRow}>
              <span>🏸 Booking:</span>
              <strong>#{success.bookingId}</strong>
            </div>
            <div className={styles.successRow}>
              <span>🛒 Sản phẩm đã mua:</span>
              <strong>{success.items?.length || 0} loại</strong>
            </div>
            <div className={`${styles.successRow} ${styles.grandTotal}`}>
              <span>💰 Tiền sản phẩm:</span>
              <strong>{fmt(success.orderTotal)}</strong>
            </div>
            <p className={styles.noteText}>
              * Tiền sân sẽ thanh toán riêng ở phần Lịch sử đặt sân
            </p>
          </div>

          {/* Payment Option Section */}
          <div className={styles.paymentOptionSection}>
            <h3 className={styles.paymentOptionTitle}>💳 Phương thức thanh toán</h3>
            <div className={styles.paymentOptions}>
              <div
                className={`${styles.paymentOption} ${paymentOption === "online" ? styles.selected : ""}`}
                onClick={() => setPaymentOption("online")}
              >
                <div className={styles.optionIcon}>💳</div>
                <div className={styles.optionInfo}>
                  <strong>Thanh toán online</strong>
                  <span>Thanh toán ngay qua VNPay</span>
                </div>
                <div className={styles.optionCheck}>
                  {paymentOption === "online" && "✓"}
                </div>
              </div>
              <div
                className={`${styles.paymentOption} ${paymentOption === "onsite" ? styles.selected : ""}`}
                onClick={() => setPaymentOption("onsite")}
              >
                <div className={styles.optionIcon}>🏟️</div>
                <div className={styles.optionInfo}>
                  <strong>Thanh toán tại sân</strong>
                  <span>Trả tiền khi đến chơi</span>
                </div>
                <div className={styles.optionCheck}>
                  {paymentOption === "onsite" && "✓"}
                </div>
              </div>
            </div>
            {error && <div className={styles.errorBanner}>⚠️ {error}</div>}
          </div>

          <div className={styles.successActions}>
            {paymentOption === "online" ? (
              <button
                className={styles.btnPrimary}
                onClick={handleOnlinePayment}
                disabled={loadingPayment}
              >
                {loadingPayment ? "⏳ Đang xử lý..." : `💳 Thanh toán online ${fmt(success.orderTotal)}`}
              </button>
            ) : (
              <button
                className={styles.btnPrimary}
                onClick={() => navigate("/user/history")}
              >
                Xem lịch sử
              </button>
            )}
            <button
              className={styles.btnOutline}
              onClick={() => {
                setStep(1);
                setSelectedBooking(null);
                setCart({});
                setSuccess(null);
                setPaymentOption("onsite");
                fetchData();
              }}
            >
              Mua thêm
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>🛒 Mua sản phẩm</h1>
        <p className={styles.subtitle}>
          Chọn booking và sản phẩm để mua tại sân
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className={styles.errorBanner}>
          ⚠️ {error}
          <button onClick={() => setError("")} className={styles.errorClose}>
            ✕
          </button>
        </div>
      )}

      {/* Stepper */}
      <div className={styles.stepper}>
        {["Chọn Booking", "Chọn Sản phẩm", "Xác nhận"].map((label, i) => (
          <div
            key={i}
            className={`${styles.stepItem} ${
              step > i + 1 ? styles.stepDone : ""
            } ${step === i + 1 ? styles.stepActive : ""}`}
          >
            <div className={styles.stepNumber}>{i + 1}</div>
            <span className={styles.stepLabel}>{label}</span>
          </div>
        ))}
      </div>

      {/* Step 1: Select Booking */}
      {step === 1 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>📋 Chọn booking để mua hàng</h2>
          {bookings.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>📭</span>
              <p>Bạn không có booking nào đang active.</p>
              <button
                className={styles.btnPrimary}
                onClick={() => navigate("/user/booking")}
              >
                Đặt sân ngay
              </button>
            </div>
          ) : (
            <>
              <div className={styles.bookingGrid}>
                {bookings.map((b) => (
                  <div
                    key={b.bookingId}
                    className={`${styles.bookingCard} ${
                      selectedBooking?.bookingId === b.bookingId
                        ? styles.selected
                        : ""
                    }`}
                    onClick={() => setSelectedBooking(b)}
                  >
                    <div className={styles.bookingHeader}>
                      <span className={styles.bookingId}>#{b.bookingId}</span>
                      <span className={styles.bookingStatus}>{b.status}</span>
                    </div>
                    <h3 className={styles.courtName}>{b.firstCourtName}</h3>
                    <p className={styles.branchName}>📍 {b.firstBranchName}</p>
                    <p className={styles.playDate}>📅 {b.firstPlayDate}</p>
                    <div className={styles.bookingFooter}>
                      <span className={styles.slotCount}>
                        {b.slotCount} ca
                      </span>
                      <span className={styles.bookingPrice}>
                        {fmt(b.totalPrice)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className={styles.actions}>
                <button
                  className={styles.btnPrimary}
                  disabled={!selectedBooking}
                  onClick={() => setStep(2)}
                >
                  Tiếp tục →
                </button>
              </div>
            </>
          )}
        </section>
      )}

      {/* Step 2: Select Products */}
      {step === 2 && (
        <section className={styles.section}>
          <div className={styles.selectedBookingBar}>
            <div>
              <strong>🏸 Booking #{selectedBooking?.bookingId}</strong>
              <span className={styles.selectedBookingMeta}>
                {" "}
                - {selectedBooking?.firstCourtName} -{" "}
                {fmt(selectedBooking?.totalPrice)}
              </span>
            </div>
            <button className={styles.btnText} onClick={() => setStep(1)}>
              Đổi booking
            </button>
          </div>

          <h2 className={styles.sectionTitle}>🏸 Chọn sản phẩm</h2>

          {products.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>📭</span>
              <p>Hiện không có sản phẩm nào.</p>
            </div>
          ) : (
            <>
              <div className={styles.productGrid}>
                {products.map((p) => {
                  const qty = cart[p.id] || 0;
                  return (
                    <div key={p.id} className={styles.productCard}>
                      <div className={styles.productImage}>
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.name} />
                        ) : (
                          <span className={styles.productPlaceholder}>🏸</span>
                        )}
                      </div>
                      <div className={styles.productInfo}>
                        <span className={styles.productCategory}>
                          {p.category}
                        </span>
                        <h3 className={styles.productName}>{p.name}</h3>
                        <p className={styles.productPrice}>{fmt(p.unitPrice)}</p>
                        <p className={styles.productStock}>
                          Còn: {p.stockQuantity}
                        </p>
                      </div>
                      <div className={styles.productActions}>
                        {qty > 0 ? (
                          <div className={styles.qtyControl}>
                            <button
                              onClick={() => removeFromCart(p.id)}
                              className={styles.qtyBtn}
                            >
                              −
                            </button>
                            <span className={styles.qtyValue}>{qty}</span>
                            <button
                              onClick={() => addToCart(p)}
                              className={styles.qtyBtn}
                              disabled={qty >= p.stockQuantity}
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            className={styles.btnAdd}
                            onClick={() => addToCart(p)}
                          >
                            Thêm
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Cart Summary */}
              {getCartItemCount() > 0 && (
                <div className={styles.cartSummary}>
                  <h3 className={styles.cartTitle}>🛒 Giỏ hàng</h3>
                  <div className={styles.cartItems}>
                    {Object.entries(cart).map(([productId, qty]) => {
                      const product = products.find(
                        (p) => p.id === parseInt(productId)
                      );
                      if (!product) return null;
                      return (
                        <div key={productId} className={styles.cartItem}>
                          <span className={styles.cartItemName}>
                            {product.name}
                          </span>
                          <span className={styles.cartItemQty}>x{qty}</span>
                          <span className={styles.cartItemPrice}>
                            {fmt(product.unitPrice * qty)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className={styles.cartTotals}>
                    <div className={`${styles.cartRow} ${styles.grandTotal}`}>
                      <span>💰 Tiền sản phẩm:</span>
                      <strong>{fmt(getCartTotal())}</strong>
                    </div>
                    <p className={styles.cartNote}>
                      * Tiền sân ({fmt(selectedBooking?.totalPrice)}) sẽ thanh toán riêng
                    </p>
                  </div>
                  <div className={styles.cartActions}>
                    <button
                      className={styles.btnOutline}
                      onClick={() => setStep(1)}
                    >
                      ← Quay lại
                    </button>
                    <button
                      className={styles.btnPrimary}
                      onClick={handleSubmit}
                      disabled={loading}
                    >
                      {loading ? "⏳ Đang xử lý..." : "✅ Xác nhận mua"}
                    </button>
                  </div>
                </div>
              )}

              {getCartItemCount() === 0 && (
                <div className={styles.actions}>
                  <button
                    className={styles.btnOutline}
                    onClick={() => setStep(1)}
                  >
                    ← Quay lại
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
};

export default PurchaseProductPage;
