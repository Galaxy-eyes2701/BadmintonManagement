import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from './DepositPaymentResult.module.css';

const API = "http://localhost:5043/api";

const DepositPaymentResult = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const [status, setStatus] = useState('processing');
    const [message, setMessage] = useState('Đang xác thực giao dịch...');
    const [txnData, setTxnData] = useState(null);

    useEffect(() => {
        const verifyPayment = async () => {
            const queryString = searchParams.toString();
            if (!queryString) {
                setStatus('error');
                setMessage('Không tìm thấy thông tin giao dịch hợp lệ.');
                return;
            }

            // Check the transaction reference to determine which endpoint to call
            const txnRef = searchParams.get('vnp_TxnRef') || '';
            const prefix = txnRef.split('_')[0];

            try {
                let endpoint;
                if (prefix === 'DEP') {
                    endpoint = `${API}/payments/deposit/vnpay-return`;
                } else if (prefix === 'REM' || prefix === 'PROD') {
                    endpoint = `${API}/payments/remaining/vnpay-return`;
                } else {
                    // Fallback to original endpoint for backward compatibility
                    endpoint = `${API}/payments/vnpay-return`;
                }

                const response = await axios.get(`${endpoint}?${queryString}`);

                if (response.data.success) {
                    setStatus('success');
                    const amount = parseInt(searchParams.get('vnp_Amount')) / 100;
                    const bankCode = searchParams.get('vnp_BankCode');
                    const payDateRaw = searchParams.get('vnp_PayDate');
                    const bookingId = response.data.bookingId;

                    setTxnData({ 
                        amount, 
                        txnRef, 
                        bankCode, 
                        payDate: formatVnpayDate(payDateRaw),
                        bookingId,
                        paymentType: prefix === 'DEP' ? 'deposit' : prefix === 'PROD' ? 'product' : 'remaining'
                    });
                }
            } catch (error) {
                setStatus('error');
                setMessage(error.response?.data?.message || 'Giao dịch bị hủy hoặc có lỗi xảy ra.');
            }
        };

        verifyPayment();
    }, [searchParams]);

    const formatVnpayDate = (dateStr) => {
        if (!dateStr || dateStr.length !== 14) return dateStr;
        return `${dateStr.substring(8, 10)}:${dateStr.substring(10, 12)}, ${dateStr.substring(6, 8)}/${dateStr.substring(4, 6)}/${dateStr.substring(0, 4)}`;
    };

    const formatCurrency = (amount) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

    const getPaymentTypeLabel = (type) => {
        switch (type) {
            case 'deposit': return 'Đặt cọc 50%';
            case 'product': return 'Thanh toán sản phẩm + sân';
            case 'remaining': return 'Thanh toán phần còn lại';
            default: return 'Thanh toán';
        }
    };

    if (status === 'processing') {
        return (
            <div className={styles.container}>
                <div className={styles.centerContent}>
                    <div className={styles.spinner}></div>
                    <h2 className={styles.statusTitle}>{message}</h2>
                    <p className={styles.statusDesc}>Vui lòng không đóng trình duyệt...</p>
                </div>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className={styles.container}>
                <div className={styles.centerContent}>
                    <div className={styles.card}>
                        <div className={styles.iconWrapper}>
                            <div className={styles.errorBg}></div>
                            <div className={styles.errorIconBg}>
                                <span className="material-symbols-outlined">close</span>
                            </div>
                        </div>
                        <h1 className={styles.title}>Thanh toán thất bại</h1>
                        <p className={styles.statusDesc}>{message}</p>
                        <div className={styles.actions}>
                            <button onClick={() => navigate('/user/history')} className={styles.btnOutline}>
                                Xem lịch sử booking
                            </button>
                            <button onClick={() => navigate('/user/booking')} className={styles.btnPrimary}>
                                Đặt sân mới
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.centerContent}>
                <div className={styles.card}>
                    <div className={styles.iconWrapper}>
                        <div className={styles.successBg1}></div>
                        <div className={styles.successBg2}></div>
                        <div className={styles.successIconBg}>
                            <span className="material-symbols-outlined">check</span>
                        </div>
                    </div>
                    <h1 className={styles.title}>Thanh toán thành công!</h1>
                    <p className={styles.statusDesc}>
                        {txnData?.paymentType === 'deposit' 
                            ? 'Booking đã được xác nhận. Số tiền còn lại sẽ thanh toán tại sân.'
                            : txnData?.paymentType === 'product'
                            ? 'Thanh toán hoàn tất. Bạn có thể đến sân theo lịch đã đặt.'
                            : 'Giao dịch đã được ghi nhận.'}
                    </p>

                    <div className={styles.billCard}>
                        <div className={styles.billHeader}>
                            <span>Chi tiết giao dịch</span>
                            <span className="material-symbols-outlined">receipt_long</span>
                        </div>
                        <div className={styles.billContent}>
                            <div className={styles.billRow}>
                                <span className={styles.billLabel}>Mã Booking</span>
                                <span className={styles.billValue}>#{txnData?.bookingId}</span>
                            </div>
                            <div className={styles.billRow}>
                                <span className={styles.billLabel}>Loại thanh toán</span>
                                <span className={styles.billValue}>{getPaymentTypeLabel(txnData?.paymentType)}</span>
                            </div>
                            <div className={styles.billRow}>
                                <span className={styles.billLabel}>Thời gian</span>
                                <span className={styles.billValue}>{txnData?.payDate}</span>
                            </div>
                            <div className={styles.billRow}>
                                <span className={styles.billLabel}>Phương thức</span>
                                <div className={styles.billValue}>
                                    <span className="material-symbols-outlined" style={{ color: '#007bff' }}>account_balance</span>
                                    <span>VNPay - {txnData?.bankCode}</span>
                                </div>
                            </div>
                            <div className={styles.divider}></div>
                            <div className={styles.billRow}>
                                <span className={styles.totalLabel}>Số tiền</span>
                                <span className={styles.totalValue}>{formatCurrency(txnData?.amount || 0)}</span>
                            </div>
                        </div>
                    </div>

                    <div className={styles.actions}>
                        <button onClick={() => navigate('/user/history')} className={styles.btnPrimary}>
                            Xem lịch sử booking <span className="material-symbols-outlined">arrow_forward</span>
                        </button>
                        <button onClick={() => navigate('/user/booking')} className={styles.btnOutline}>
                            Đặt sân mới
                        </button>
                    </div>
                </div>
            </div>
            <footer className={styles.footer}>
                <div className={styles.securityText}>
                    <span className="material-symbols-outlined">shield</span> Giao dịch được bảo mật bởi VNPay
                </div>
            </footer>
        </div>
    );
};

export default DepositPaymentResult;
