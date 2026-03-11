import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from './PaymentResult.module.css';

const PaymentResult = () => {
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

            try {
                const response = await axios.get(`http://localhost:5043/api/payments/vnpay-return?${queryString}`);

                if (response.data.success) {
                    setStatus('success');
                    const amount = parseInt(searchParams.get('vnp_Amount')) / 100;
                    const txnRef = searchParams.get('vnp_TxnRef');
                    const bankCode = searchParams.get('vnp_BankCode');
                    const payDateRaw = searchParams.get('vnp_PayDate');

                    setTxnData({ amount, txnRef, bankCode, payDate: formatVnpayDate(payDateRaw) });
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
                            <div className={styles.errorIconBg}><span className="material-symbols-outlined">close</span></div>
                        </div>
                        <h1 className={styles.title}>Thanh toán thất bại</h1>
                        <p className={styles.statusDesc}>{message}</p>
                        <button onClick={() => navigate('/admin/revenue')} className={styles.btnDark}>Quay lại Dashboard</button>
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
                        <div className={styles.successIconBg}><span className="material-symbols-outlined">check</span></div>
                    </div>
                    <h1 className={styles.title}>Thanh toán thành công!</h1>
                    <p className={styles.statusDesc}>Đơn hàng POS đã được ghi nhận.</p>

                    <div className={styles.billCard}>
                        <div className={styles.billHeader}>
                            <span>Chi tiết hóa đơn</span>
                            <span className="material-symbols-outlined text-slate-400">receipt_long</span>
                        </div>
                        <div className={styles.billContent}>
                            <div className={styles.billRow}>
                                <span className={styles.billLabel}>Mã giao dịch</span>
                                <span className={styles.billValue}>#{txnData?.txnRef?.split('_')[0]} (VNPay)</span>
                            </div>
                            <div className={styles.billRow}>
                                <span className={styles.billLabel}>Thời gian</span>
                                <span className={styles.billValue}>{txnData?.payDate}</span>
                            </div>
                            <div className={styles.billRow}>
                                <span className={styles.billLabel}>Phương thức</span>
                                <div className={styles.billValue}>
                                    <span className="material-symbols-outlined" style={{ color: '#007bff' }}>account_balance</span>
                                    <span>Ngân hàng {txnData?.bankCode}</span>
                                </div>
                            </div>
                            <div className={styles.divider}></div>
                            <div className={styles.billRow}>
                                <span className={styles.totalLabel}>Tổng cộng</span>
                                <span className={styles.totalValue}>{formatCurrency(txnData?.amount || 0)}</span>
                            </div>
                        </div>
                    </div>

                    <button onClick={() => navigate('/admin/revenue')} className={styles.btnPrimary}>
                        Quay lại Dashboard <span className="material-symbols-outlined">arrow_forward</span>
                    </button>
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

export default PaymentResult;