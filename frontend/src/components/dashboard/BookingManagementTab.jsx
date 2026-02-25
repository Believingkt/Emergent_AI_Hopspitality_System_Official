import React, { useState, useEffect } from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { toast } from 'sonner';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useVenue } from '../../context/VenueContext';
import {
  Calendar, DollarSign, User, Phone, Mail, Loader2, RefreshCw,
  CheckCircle2, XCircle, Clock, CreditCard, ChevronDown, ChevronUp,
  Building2, Bed, FileText, AlertCircle
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const STATUS_MAP = {
  pending: { label: '待付款', color: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/30', icon: Clock },
  paid: { label: '已付款', color: 'text-[#22c55e]', bg: 'bg-[#22c55e]/15', border: 'border-[#22c55e]/30', icon: CreditCard },
  confirmed: { label: '已確認', color: 'text-[#00B4D8]', bg: 'bg-[#00B4D8]/15', border: 'border-[#00B4D8]/30', icon: CheckCircle2 },
  cancelled: { label: '已取消', color: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-500/30', icon: XCircle },
};

const BookingCard = ({ booking, token, onRefresh }) => {
  const [expanded, setExpanded] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const status = STATUS_MAP[booking.status] || STATUS_MAP.pending;
  const StatusIcon = status.icon;

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await axios.put(`${API_URL}/api/venues/${booking.venue_id}/bookings/${booking.booking_id}/confirm`,
        {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('訂單已確認');
      onRefresh();
    } catch { toast.error('確認失敗'); }
    setConfirming(false);
  };

  const handleCancel = async () => {
    if (!window.confirm('確定要取消此訂單嗎？')) return;
    setCancelling(true);
    try {
      await axios.put(`${API_URL}/api/venues/${booking.venue_id}/bookings/${booking.booking_id}/cancel`,
        {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('訂單已取消');
      onRefresh();
    } catch { toast.error('取消失敗'); }
    setCancelling(false);
  };

  return (
    <div className={`bg-[#0d1117] rounded-2xl border-2 ${status.border} overflow-hidden transition-all`}>
      {/* Header */}
      <div className="p-4 cursor-pointer hover:bg-[#161b22] transition-colors" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl ${status.bg} flex items-center justify-center`}>
              <StatusIcon className={`w-5 h-5 ${status.color}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-bold">{booking.guest_name || '未填寫'}</span>
                <Badge className={`${status.bg} ${status.color} border-0 text-xs`}>{status.label}</Badge>
              </div>
              <p className="text-[#8b949e] text-xs mt-0.5">
                {booking.room_name} · {booking.check_in} → {booking.check_out}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[#FF6B35] font-bold text-lg">NT$ {(booking.price_after_tax || 0).toLocaleString()}</span>
            {expanded ? <ChevronUp className="w-4 h-4 text-[#8b949e]" /> : <ChevronDown className="w-4 h-4 text-[#8b949e]" />}
          </div>
        </div>
      </div>

      {/* Detail */}
      {expanded && (
        <div className="border-t border-[#27272a] p-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <InfoBlock icon={User} label="旅客" value={booking.guest_name || '-'} />
            <InfoBlock icon={Phone} label="電話" value={booking.guest_phone || '-'} />
            <InfoBlock icon={Mail} label="Email" value={booking.guest_email || '-'} />
            <InfoBlock icon={Bed} label="房型" value={booking.room_name} />
            <InfoBlock icon={Calendar} label="入住" value={booking.check_in} />
            <InfoBlock icon={Calendar} label="退房" value={booking.check_out} />
            <InfoBlock icon={DollarSign} label="含稅價" value={`NT$ ${(booking.price_after_tax || 0).toLocaleString()}`} />
            <InfoBlock icon={CreditCard} label="付款方式" value={booking.payment_method === 'credit_card' ? '信用卡' : (booking.payment_method || '-')} />
          </div>

          {booking.special_requests && (
            <div className="bg-[#27272a]/30 rounded-xl p-3">
              <p className="text-[#8b949e] text-xs mb-1">特殊需求</p>
              <p className="text-white text-sm">{booking.special_requests}</p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-[#52525b] text-xs">訂單編號：{booking.booking_id}</p>
            <div className="flex gap-2">
              {booking.status === 'paid' && (
                <Button size="sm" onClick={handleConfirm} disabled={confirming}
                  className="bg-[#00B4D8] hover:bg-[#0098b8] text-white">
                  {confirming ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                  確認訂單
                </Button>
              )}
              {(booking.status === 'pending' || booking.status === 'paid') && (
                <Button size="sm" variant="outline" onClick={handleCancel} disabled={cancelling}
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10">
                  {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4 mr-1" />}
                  取消
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const InfoBlock = ({ icon: Icon, label, value }) => (
  <div className="bg-[#161b22] rounded-lg p-2.5 border border-[#27272a]">
    <div className="flex items-center gap-1.5 mb-0.5">
      <Icon className="w-3 h-3 text-[#52525b]" />
      <p className="text-[#8b949e] text-xs">{label}</p>
    </div>
    <p className="text-white font-medium text-sm truncate">{value}</p>
  </div>
);

const StatCard = ({ label, value, icon: Icon, color }) => (
  <div className="bg-[#0d1117] rounded-xl border border-[#27272a] p-4">
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-[#8b949e] text-xs">{label}</p>
        <p className="text-white text-xl font-bold">{value}</p>
      </div>
    </div>
  </div>
);

export const BookingManagementTab = () => {
  const { token } = useAuth();
  const { currentVenue } = useVenue();
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');

  const venueId = currentVenue?.id;

  const fetchBookings = async () => {
    if (!token || !venueId) return;
    setLoading(true);
    try {
      const resp = await axios.get(`${API_URL}/api/venues/${venueId}/bookings${filter !== 'all' ? `?status=${filter}` : ''}`,
        { headers: { Authorization: `Bearer ${token}` } });
      setBookings(resp.data.bookings || []);
      setStats(resp.data.stats || {});
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchBookings(); }, [token, venueId, filter]);

  const filters = [
    { key: 'all', label: '全部', count: stats.total },
    { key: 'pending', label: '待付款', count: stats.pending },
    { key: 'paid', label: '已付款', count: stats.paid },
    { key: 'confirmed', label: '已確認', count: stats.confirmed },
    { key: 'cancelled', label: '已取消', count: stats.cancelled },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-3" style={{ fontFamily: 'Manrope, sans-serif' }}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF6B35] to-[#00B4D8] flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            訂房管理
          </h2>
          <p className="text-[#8b949e] mt-1 text-sm">管理線上訂房訂單</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchBookings}
          className="border-[#27272a] text-[#8b949e] hover:text-white">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          重新整理
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="總訂單" value={stats.total || 0} icon={FileText} color="bg-[#FF6B35]" />
        <StatCard label="待付款" value={stats.pending || 0} icon={Clock} color="bg-amber-500" />
        <StatCard label="已付款" value={stats.paid || 0} icon={CreditCard} color="bg-[#22c55e]" />
        <StatCard label="已確認" value={stats.confirmed || 0} icon={CheckCircle2} color="bg-[#00B4D8]" />
        <StatCard label="營收" value={`$${(stats.total_revenue || 0).toLocaleString()}`} icon={DollarSign} color="bg-[#8B5CF6]" />
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {filters.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filter === f.key ? 'bg-[#FF6B35] text-white' : 'bg-[#18181b] text-[#8b949e] border border-[#27272a] hover:text-white'
            }`}>
            {f.label} {f.count > 0 && <span className="ml-1 opacity-70">({f.count})</span>}
          </button>
        ))}
      </div>

      {/* Bookings List */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-[#FF6B35]" />
        </div>
      ) : bookings.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 bg-[#0d1117] rounded-2xl border-2 border-[#27272a]">
          <FileText className="w-12 h-12 text-[#27272a] mb-3" />
          <p className="text-[#8b949e]">目前沒有訂單</p>
          <p className="text-[#52525b] text-sm mt-1">當客戶透過 LINE 訂房後，訂單會顯示在這裡</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map(b => (
            <BookingCard key={b.booking_id} booking={b} token={token} onRefresh={fetchBookings} />
          ))}
        </div>
      )}
    </div>
  );
};
