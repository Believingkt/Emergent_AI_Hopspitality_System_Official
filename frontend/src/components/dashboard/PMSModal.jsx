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
      const response = await axios.get(
        `${API_URL}/api/pms/${venueId}/availability`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            start_date: format(startDate, 'yyyy-MM-dd'),
            end_date: format(endDate, 'yyyy-MM-dd')
          }
        }
      );
      setResult(response.data);
    } catch (err) {
      console.error('PMS query failed:', err);
      setError(err.response?.data?.detail || '查詢失敗，請稍後再試');
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
      <DialogContent className="max-w-2xl bg-white rounded-sm">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[#1F2E0E] flex items-center gap-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
            <CalendarIcon className="w-5 h-5 text-[#3D4A2C]" />
            查詢房間可用性
          </DialogTitle>
          <DialogDescription className="text-[#64748B]">
            選擇日期範圍以查詢 PMS 系統中的房間可用性
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Date Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-[#1F2E0E] font-medium mb-2 block">開始日期</Label>
              <div className="border border-[#E2E8F0] rounded-sm p-2">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  disabled={(date) => date < new Date()}
                  className="w-full"
                />
              </div>
              {startDate && (
                <p className="mt-2 text-sm text-[#3D4A2C] font-medium">
                  已選擇: {format(startDate, 'yyyy/MM/dd')}
                </p>
              )}
            </div>
            <div>
              <Label className="text-[#1F2E0E] font-medium mb-2 block">結束日期</Label>
              <div className="border border-[#E2E8F0] rounded-sm p-2">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  disabled={(date) => date < (startDate || new Date())}
                  className="w-full"
                />
              </div>
              {endDate && (
                <p className="mt-2 text-sm text-[#3D4A2C] font-medium">
                  已選擇: {format(endDate, 'yyyy/MM/dd')}
                </p>
              )}
            </div>
          </div>

          {/* Search Button */}
          <Button
            onClick={handleSearch}
            disabled={!startDate || !endDate || loading}
            className="w-full bg-[#3D4A2C] hover:bg-[#2C381E] text-white rounded-sm h-11"
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
            <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-sm text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="animate-fade-in">
              <Label className="text-[#1F2E0E] font-medium mb-2 block">查詢結果（原始 JSON）</Label>
              <ScrollArea className="h-[200px] border border-[#E2E8F0] rounded-sm">
                <pre className="p-4 text-sm text-[#1F2E0E] bg-[#F5F5F0] font-mono whitespace-pre-wrap">
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
