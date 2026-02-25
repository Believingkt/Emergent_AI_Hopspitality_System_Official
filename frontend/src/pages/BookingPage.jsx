import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const LOGO_URL = "https://customer-assets.emergentagent.com/job_repo-data-pull/artifacts/z0i6g7j0_%E7%B6%B2%E9%A0%81logo.png";

const steps = ['確認房型', '填寫資料', '付款', '完成'];

export default function BookingPage() {
  const { bookingId } = useParams();
  const [searchParams] = useSearchParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [step, setStep] = useState(0);
  const [guestInfo, setGuestInfo] = useState({ guest_name: '', guest_phone: '', guest_email: '', special_requests: '' });
  const [paymentInfo, setPaymentInfo] = useState({ card_number: '', expiry: '', cvv: '', card_name: '' });
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const createFromParams = async () => {
      if (bookingId && bookingId !== 'new') {
        try {
          const resp = await axios.get(`${API_URL}/api/bookings/${bookingId}`);
          setBooking(resp.data);
          if (resp.data.status === 'paid' || resp.data.status === 'confirmed') setStep(3);
          else if (resp.data.guest_name) setStep(1);
        } catch { setError('訂單不存在或已過期'); }
        setLoading(false);
        return;
      }
      const venue_id = searchParams.get('venue_id');
      const room_code = searchParams.get('room_code');
      if (!venue_id || !room_code) { setError('缺少訂房資訊'); setLoading(false); return; }
      try {
        const resp = await axios.post(`${API_URL}/api/bookings`, {
          venue_id, room_code,
          room_name: searchParams.get('room_name') || '',
          rate_name: searchParams.get('rate_name') || '',
          check_in: searchParams.get('check_in') || '',
          check_out: searchParams.get('check_out') || '',
          price_before_tax: parseFloat(searchParams.get('price_before_tax') || '0'),
          price_after_tax: parseFloat(searchParams.get('price_after_tax') || '0'),
          currency: searchParams.get('currency') || 'TWD',
          max_occupancy: parseInt(searchParams.get('max_occupancy') || '2'),
          line_user_id: searchParams.get('line_user_id') || '',
          room_photo: searchParams.get('room_photo') || '',
          booking_url: searchParams.get('booking_url') || '',
        });
        setBooking(resp.data.booking);
        window.history.replaceState({}, '', `/booking/${resp.data.booking_id}`);
      } catch { setError('建立訂單失敗'); }
      setLoading(false);
    };
    createFromParams();
  }, [bookingId, searchParams]);

  const handleGuestSubmit = async () => {
    if (!guestInfo.guest_name || !guestInfo.guest_phone) { alert('請填寫姓名和電話'); return; }
    try {
      await axios.put(`${API_URL}/api/bookings/${booking.booking_id}/guest-info`, guestInfo);
      setBooking(prev => ({ ...prev, ...guestInfo }));
      setStep(2);
    } catch { alert('更新失敗，請重試'); }
  };

  const handlePayment = async () => {
    if (!paymentInfo.card_number || !paymentInfo.expiry || !paymentInfo.cvv) { alert('請填寫完整卡片資訊'); return; }
    setProcessing(true);
    await new Promise(r => setTimeout(r, 2500));
    try {
      await axios.post(`${API_URL}/api/bookings/${booking.booking_id}/pay`, { payment_method: 'credit_card' });
      setBooking(prev => ({ ...prev, status: 'paid', payment_status: 'paid' }));
      setStep(3);
    } catch (e) { alert('付款失敗：' + (e.response?.data?.detail || '請重試')); }
    setProcessing(false);
  };

  const formatCard = (v) => v.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim().slice(0, 19);
  const formatExpiry = (v) => { const d = v.replace(/\D/g, '').slice(0, 4); return d.length > 2 ? d.slice(0,2) + '/' + d.slice(2) : d; };

  if (loading) return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-[#FF6B35] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[#6B7280]">載入訂房資訊...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg border border-[#E5E7EB] p-8 text-center max-w-md">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">❌</span>
        </div>
        <h2 className="text-xl font-bold text-[#1F2937] mb-2">無法載入</h2>
        <p className="text-[#6B7280]">{error}</p>
      </div>
    </div>
  );

  if (!booking) return null;

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      {/* Header */}
      <div className="bg-white border-b border-[#E5E7EB] px-4 py-3 sticky top-0 z-50 shadow-sm">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <img src={LOGO_URL} alt="Lakeze" className="h-8 object-contain" />
          <div className="flex items-center gap-1.5 text-[#6B7280] text-xs">
            <span>🔒</span>
            <span>安全訂房</span>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 pb-20">
        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6 px-2">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all shadow-sm ${
                i < step ? 'bg-[#22c55e] text-white' : i === step ? 'bg-[#FF6B35] text-white shadow-md shadow-[#FF6B35]/30' : 'bg-[#E5E7EB] text-[#9CA3AF]'
              }`}>{i < step ? '✓' : i + 1}</div>
              <span className={`ml-1.5 text-xs hidden sm:inline ${i === step ? 'text-[#1F2937] font-semibold' : 'text-[#9CA3AF]'}`}>{s}</span>
              {i < steps.length - 1 && <div className={`w-8 sm:w-12 h-0.5 mx-2 rounded-full ${i < step ? 'bg-[#22c55e]' : 'bg-[#E5E7EB]'}`} />}
            </div>
          ))}
        </div>

        {/* Step 0: Room Confirmation */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] overflow-hidden">
              {booking.room_photo && (
                <img src={booking.room_photo} alt={booking.room_name} className="w-full h-48 object-cover" />
              )}
              <div className="p-5">
                <p className="text-[#6B7280] text-xs mb-1">{booking.venue_info?.name || ''}</p>
                <h2 className="text-xl font-bold text-[#1F2937]">{booking.room_name}</h2>
                {booking.rate_name && <p className="text-[#00B4D8] text-sm mt-0.5 font-medium">{booking.rate_name}</p>}

                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="bg-[#F3F4F6] rounded-xl p-3">
                    <p className="text-[#6B7280] text-xs">入住</p>
                    <p className="text-[#1F2937] font-semibold text-sm mt-0.5">{booking.check_in}</p>
                  </div>
                  <div className="bg-[#F3F4F6] rounded-xl p-3">
                    <p className="text-[#6B7280] text-xs">退房</p>
                    <p className="text-[#1F2937] font-semibold text-sm mt-0.5">{booking.check_out}</p>
                  </div>
                </div>

                <div className="mt-4 bg-[#FFF7ED] border border-[#FFEDD5] rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[#9A3412] text-sm font-medium">含稅總價</span>
                    <span className="text-[#FF6B35] text-2xl font-bold">NT$ {booking.price_after_tax?.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            <button onClick={() => setStep(1)}
              className="w-full bg-[#FF6B35] hover:bg-[#E55A2B] text-white font-bold py-4 rounded-xl transition-all text-lg shadow-md shadow-[#FF6B35]/20">
              確認房型，下一步 →
            </button>
          </div>
        )}

        {/* Step 1: Guest Info */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] p-5">
              <h3 className="text-lg font-bold text-[#1F2937] mb-4">入住旅客資料</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-[#4B5563] text-sm font-medium block mb-1">姓名 <span className="text-red-500">*</span></label>
                  <input value={guestInfo.guest_name} onChange={e => setGuestInfo(p => ({...p, guest_name: e.target.value}))}
                    placeholder="請輸入真實姓名" className="w-full bg-[#F9FAFB] border border-[#D1D5DB] rounded-xl px-4 py-3 text-[#1F2937] placeholder:text-[#9CA3AF] focus:border-[#FF6B35] focus:ring-2 focus:ring-[#FF6B35]/20 outline-none transition-all" />
                </div>
                <div>
                  <label className="text-[#4B5563] text-sm font-medium block mb-1">手機號碼 <span className="text-red-500">*</span></label>
                  <input value={guestInfo.guest_phone} onChange={e => setGuestInfo(p => ({...p, guest_phone: e.target.value}))}
                    placeholder="0912-345-678" className="w-full bg-[#F9FAFB] border border-[#D1D5DB] rounded-xl px-4 py-3 text-[#1F2937] placeholder:text-[#9CA3AF] focus:border-[#FF6B35] focus:ring-2 focus:ring-[#FF6B35]/20 outline-none transition-all" />
                </div>
                <div>
                  <label className="text-[#4B5563] text-sm font-medium block mb-1">Email</label>
                  <input value={guestInfo.guest_email} onChange={e => setGuestInfo(p => ({...p, guest_email: e.target.value}))}
                    placeholder="your@email.com" className="w-full bg-[#F9FAFB] border border-[#D1D5DB] rounded-xl px-4 py-3 text-[#1F2937] placeholder:text-[#9CA3AF] focus:border-[#FF6B35] focus:ring-2 focus:ring-[#FF6B35]/20 outline-none transition-all" />
                </div>
                <div>
                  <label className="text-[#4B5563] text-sm font-medium block mb-1">特殊需求</label>
                  <textarea value={guestInfo.special_requests} onChange={e => setGuestInfo(p => ({...p, special_requests: e.target.value}))}
                    placeholder="例如：需要嬰兒床、飲食需求等" rows={3} className="w-full bg-[#F9FAFB] border border-[#D1D5DB] rounded-xl px-4 py-3 text-[#1F2937] placeholder:text-[#9CA3AF] focus:border-[#FF6B35] focus:ring-2 focus:ring-[#FF6B35]/20 outline-none resize-none transition-all" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] p-5">
              <h4 className="text-sm font-semibold text-[#6B7280] mb-3">訂單摘要</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-[#6B7280]">房型</span><span className="text-[#1F2937] font-medium">{booking.room_name}</span></div>
                <div className="flex justify-between"><span className="text-[#6B7280]">日期</span><span className="text-[#1F2937]">{booking.check_in} → {booking.check_out}</span></div>
                <div className="border-t border-[#F3F4F6] my-2" />
                <div className="flex justify-between font-bold"><span className="text-[#1F2937]">應付金額</span><span className="text-[#FF6B35] text-lg">NT$ {booking.price_after_tax?.toLocaleString()}</span></div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(0)} className="flex-1 bg-white border border-[#D1D5DB] text-[#6B7280] font-bold py-4 rounded-xl hover:bg-[#F9FAFB] transition-all">← 上一步</button>
              <button onClick={handleGuestSubmit} className="flex-[2] bg-[#FF6B35] hover:bg-[#E55A2B] text-white font-bold py-4 rounded-xl transition-all shadow-md shadow-[#FF6B35]/20">前往付款 →</button>
            </div>
          </div>
        )}

        {/* Step 2: Payment */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] p-5">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] flex items-center justify-center">
                  <span className="text-xl">💳</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#1F2937]">信用卡付款</h3>
                  <p className="text-[#9CA3AF] text-xs">安全加密處理</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[#4B5563] text-sm font-medium block mb-1">卡號</label>
                  <input value={paymentInfo.card_number} onChange={e => setPaymentInfo(p => ({...p, card_number: formatCard(e.target.value)}))}
                    placeholder="4242 4242 4242 4242" maxLength={19}
                    className="w-full bg-[#F9FAFB] border border-[#D1D5DB] rounded-xl px-4 py-3.5 text-[#1F2937] font-mono text-lg placeholder:text-[#D1D5DB] focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20 outline-none tracking-wider transition-all" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[#4B5563] text-sm font-medium block mb-1">有效期限</label>
                    <input value={paymentInfo.expiry} onChange={e => setPaymentInfo(p => ({...p, expiry: formatExpiry(e.target.value)}))}
                      placeholder="MM/YY" maxLength={5}
                      className="w-full bg-[#F9FAFB] border border-[#D1D5DB] rounded-xl px-4 py-3.5 text-[#1F2937] font-mono placeholder:text-[#D1D5DB] focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="text-[#4B5563] text-sm font-medium block mb-1">安全碼</label>
                    <input value={paymentInfo.cvv} onChange={e => setPaymentInfo(p => ({...p, cvv: e.target.value.replace(/\D/g,'').slice(0,3)}))}
                      placeholder="CVV" maxLength={3} type="password"
                      className="w-full bg-[#F9FAFB] border border-[#D1D5DB] rounded-xl px-4 py-3.5 text-[#1F2937] font-mono placeholder:text-[#D1D5DB] focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20 outline-none transition-all" />
                  </div>
                </div>
                <div>
                  <label className="text-[#4B5563] text-sm font-medium block mb-1">持卡人姓名</label>
                  <input value={paymentInfo.card_name} onChange={e => setPaymentInfo(p => ({...p, card_name: e.target.value}))}
                    placeholder="卡片上的姓名"
                    className="w-full bg-[#F9FAFB] border border-[#D1D5DB] rounded-xl px-4 py-3.5 text-[#1F2937] placeholder:text-[#D1D5DB] focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20 outline-none transition-all" />
                </div>
              </div>

              <div className="mt-4 bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-3">
                <p className="text-[#92400E] text-xs font-semibold">🧪 測試模式</p>
                <p className="text-[#A16207] text-xs mt-1">可使用任意卡號進行測試付款（例如 4242 4242 4242 4242）</p>
              </div>
            </div>

            <div className="bg-[#FFF7ED] border border-[#FFEDD5] rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[#9A3412] font-medium">付款金額</span>
                <span className="text-[#FF6B35] text-2xl font-bold">NT$ {booking.price_after_tax?.toLocaleString()}</span>
              </div>
              <p className="text-[#C2410C] text-xs">{booking.room_name} · {booking.check_in} → {booking.check_out}</p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 bg-white border border-[#D1D5DB] text-[#6B7280] font-bold py-4 rounded-xl hover:bg-[#F9FAFB] transition-all">← 上一步</button>
              <button onClick={handlePayment} disabled={processing}
                className="flex-[2] bg-[#22c55e] hover:bg-[#16a34a] text-white font-bold py-4 rounded-xl transition-all disabled:opacity-60 disabled:cursor-wait text-lg shadow-md shadow-[#22c55e]/20">
                {processing ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    付款處理中...
                  </span>
                ) : `確認付款 NT$ ${booking.price_after_tax?.toLocaleString()}`}
              </button>
            </div>

            <div className="flex items-center justify-center gap-4 text-[#9CA3AF] text-xs">
              <span>🔒 SSL 加密</span>
              <span>🛡️ 安全交易</span>
              <span>✅ PCI DSS</span>
            </div>
          </div>
        )}

        {/* Step 3: Confirmation */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-[#BBF7D0] p-6 text-center">
              <div className="w-20 h-20 rounded-full bg-[#DCFCE7] flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">🎉</span>
              </div>
              <h2 className="text-2xl font-bold text-[#1F2937] mb-2">訂房成功！</h2>
              <p className="text-[#6B7280]">感謝您的預訂，期待您的到來</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] p-5 space-y-3">
              <h4 className="text-sm font-semibold text-[#6B7280]">訂單資訊</h4>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between"><span className="text-[#6B7280]">訂單編號</span><span className="text-[#1F2937] font-mono font-medium">{booking.booking_id}</span></div>
                <div className="flex justify-between"><span className="text-[#6B7280]">場域</span><span className="text-[#1F2937]">{booking.venue_info?.name || ''}</span></div>
                <div className="flex justify-between"><span className="text-[#6B7280]">房型</span><span className="text-[#1F2937]">{booking.room_name}</span></div>
                <div className="flex justify-between"><span className="text-[#6B7280]">日期</span><span className="text-[#1F2937]">{booking.check_in} → {booking.check_out}</span></div>
                <div className="flex justify-between"><span className="text-[#6B7280]">旅客</span><span className="text-[#1F2937]">{booking.guest_name}</span></div>
                <div className="border-t border-[#F3F4F6] my-2" />
                <div className="flex justify-between"><span className="text-[#6B7280]">付款狀態</span>
                  <span className="text-[#16a34a] font-semibold flex items-center gap-1">✅ 已付款</span>
                </div>
                <div className="flex justify-between font-bold"><span className="text-[#1F2937]">付款金額</span><span className="text-[#FF6B35] text-lg">NT$ {booking.price_after_tax?.toLocaleString()}</span></div>
              </div>
            </div>

            <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-4">
              <p className="text-[#1D4ED8] text-sm font-semibold mb-1">📱 確認訊息已發送</p>
              <p className="text-[#3B82F6] text-xs">訂房確認資訊已透過 LINE 發送給您，請查看 LINE 訊息。</p>
            </div>

            <div className="text-center pt-4">
              <img src={LOGO_URL} alt="Lakeze" className="h-6 mx-auto opacity-40" />
              <p className="text-[#D1D5DB] text-xs mt-2">Powered by Lakeze 人客多</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
