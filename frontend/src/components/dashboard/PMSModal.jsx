import { useState } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Calendar } from '../ui/calendar';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { Calendar as CalendarIcon, Loader2, Search, AlertCircle } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const PMSModal = ({ open, onClose, venueId }) => {
  const { token } = useAuth();
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSearch = async () => {
    if (!startDate || !endDate) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Manus API: check_in, check_out, guests
      const response = await axios.get(
        `${API_URL}/api/pms/${venueId}/availability`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            check_in: format(startDate, 'yyyy-MM-dd'),
            check_out: format(endDate, 'yyyy-MM-dd'),
            guests: 2
          }
        }
      );
      setResult(response.data);
    } catch (err) {
      console.error('PMS query failed:', err);
      setError(err.response?.data?.error || '查詢失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStartDate(null);
    setEndDate(null);
    setResult(null);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl bg-[#18181b] border-[#27272a] rounded-xl" data-testid="pms-modal">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
            <CalendarIcon className="w-5 h-5 text-[#00B4D8]" />
            查詢房間可用性
          </DialogTitle>
          <DialogDescription className="text-[#a1a1aa]">
            選擇日期範圍以查詢 PMS 系統中的房間可用性
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Date Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-white font-medium mb-2 block">開始日期</Label>
              <div className="border border-[#27272a] rounded-lg p-2 bg-[#27272a]/30">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  disabled={(date) => date < new Date()}
                  className="w-full"
                />
              </div>
              {startDate && (
                <p className="mt-2 text-sm text-[#FF6B35] font-medium">
                  已選擇: {format(startDate, 'yyyy/MM/dd')}
                </p>
              )}
            </div>
            <div>
              <Label className="text-white font-medium mb-2 block">結束日期</Label>
              <div className="border border-[#27272a] rounded-lg p-2 bg-[#27272a]/30">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  disabled={(date) => date < (startDate || new Date())}
                  className="w-full"
                />
              </div>
              {endDate && (
                <p className="mt-2 text-sm text-[#FF6B35] font-medium">
                  已選擇: {format(endDate, 'yyyy/MM/dd')}
                </p>
              )}
            </div>
          </div>

          {/* Search Button */}
          <Button
            onClick={handleSearch}
            disabled={!startDate || !endDate || loading}
            className="w-full bg-[#FF6B35] hover:bg-[#E55A2B] text-white rounded-full h-11 btn-glow transition-all duration-300"
            data-testid="pms-search-btn"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                查詢中...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                查詢可用性
              </>
            )}
          </Button>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="animate-fade-in">
              <Label className="text-white font-medium mb-2 block">查詢結果（原始 JSON）</Label>
              <ScrollArea className="h-[200px] border border-[#27272a] rounded-lg">
                <pre className="p-4 text-sm text-[#00B4D8] bg-[#27272a]/50 font-mono whitespace-pre-wrap">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </ScrollArea>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
