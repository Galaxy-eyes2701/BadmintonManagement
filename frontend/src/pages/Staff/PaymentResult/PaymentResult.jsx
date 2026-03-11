import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

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

                    setTxnData({
                        amount,
                        txnRef,
                        bankCode,
                        payDate: formatVnpayDate(payDateRaw)
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
        const year = dateStr.substring(0, 4);
        const month = dateStr.substring(4, 6);
        const day = dateStr.substring(6, 8);
        const hour = dateStr.substring(8, 10);
        const minute = dateStr.substring(10, 12);
        return `${hour}:${minute}, ${day}/${month}/${year}`;
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    if (status === 'processing') {
        return (
            <div className="bg-[#f4f7fa] min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mb-4"></div>
                    <h2 className="text-xl font-semibold text-[#001f3f]">{message}</h2>
                    <p className="text-slate-500 mt-2">Vui lòng không đóng trình duyệt...</p>
                </div>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="bg-[#f4f7fa] min-h-screen flex flex-col items-center justify-center p-4">
                <div className="w-full max-w-[480px] flex flex-col items-center">
                    <div className="relative flex items-center justify-center mb-8">
                        <div className="absolute w-24 h-24 bg-red-100 rounded-full"></div>
                        <div className="relative bg-gradient-to-br from-red-400 to-red-600 w-20 h-20 rounded-full flex items-center justify-center shadow-lg shadow-red-500/30">
                            <span className="material-symbols-outlined text-white text-5xl">close</span>
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-[#001f3f]">Thanh toán thất bại</h1>
                    <p className="text-slate-500 mt-2 text-center">{message}</p>
                    <button
                        onClick={() => navigate('/admin/revenue')} // Đã sửa lại đường dẫn
                        className="mt-8 w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-4 rounded-xl transition-all"
                    >
                        Quay lại Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[#f4f7fa] text-slate-900 min-h-screen flex flex-col font-display">
            <div className="flex-grow flex flex-col items-center justify-center p-4">
                <div className="w-full max-w-[480px] flex flex-col items-center">

                    <div className="mb-8 flex flex-col items-center">
                        <div className="relative flex items-center justify-center">
                            <div className="absolute w-24 h-24 bg-[#0056b3]/10 rounded-full"></div>
                            <div className="absolute w-32 h-32 bg-[#0056b3]/5 rounded-full"></div>
                            <div className="relative bg-gradient-to-br from-[#007bff] to-[#0056b3] w-20 h-20 rounded-full flex items-center justify-center shadow-lg shadow-[#0056b3]/30">
                                <span className="material-symbols-outlined text-white text-5xl">check</span>
                            </div>
                        </div>
                        <h1 className="mt-8 text-3xl font-bold tracking-tight text-[#001f3f]">Thanh toán thành công!</h1>
                        <p className="text-slate-500 mt-2 text-center">Đơn hàng POS đã được ghi nhận.</p>
                    </div>

                    <div className="w-full bg-white rounded-xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Chi tiết hóa đơn</span>
                            <span className="material-symbols-outlined text-slate-400 text-xl">receipt_long</span>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="flex justify-between items-center py-1">
                                <span className="text-slate-500 text-sm">Mã giao dịch</span>
                                <span className="font-medium text-[#001f3f] text-sm">#{txnData?.txnRef?.split('_')[0]} (VNPay)</span>
                            </div>
                            <div className="flex justify-between items-center py-1">
                                <span className="text-slate-500 text-sm">Thời gian</span>
                                <span className="font-medium text-[#001f3f] text-sm">{txnData?.payDate}</span>
                            </div>
                            <div className="flex justify-between items-center py-1">
                                <span className="text-slate-500 text-sm">Phương thức</span>
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[#007bff] text-lg">account_balance</span>
                                    <span className="font-medium text-[#001f3f] text-sm">Ngân hàng {txnData?.bankCode}</span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center py-1">
                                <span className="text-slate-500 text-sm">Đơn vị cung cấp</span>
                                <span className="font-medium text-[#001f3f] text-sm">SMASH HUB Center</span>
                            </div>

                            <div className="my-4 border-t border-dashed border-slate-200"></div>

                            <div className="flex justify-between items-center pt-2">
                                <span className="text-[#001f3f] font-semibold">Tổng cộng</span>
                                <span className="text-2xl font-bold text-[#0056b3]">
                                    {formatCurrency(txnData?.amount || 0)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="w-full mt-8 space-y-3">
                        <button
                            onClick={() => navigate('/admin/revenue')} // Đã sửa lại đường dẫn
                            className="w-full bg-gradient-to-r from-[#001f3f] to-[#0056b3] hover:from-[#0056b3] hover:to-[#007bff] text-white font-bold py-4 rounded-xl shadow-lg shadow-[#0056b3]/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            Quay lại Dashboard
                            <span className="material-symbols-outlined">arrow_forward</span>
                        </button>
                    </div>
                </div>
            </div>
            <footer className="p-6 text-center">
                <div className="flex items-center justify-center gap-2 text-slate-400">
                    <span className="material-symbols-outlined text-sm">shield</span>
                    <span className="text-xs">Giao dịch được bảo mật bởi VNPay</span>
                </div>
            </footer>
        </div>
    );
};

export default PaymentResult;