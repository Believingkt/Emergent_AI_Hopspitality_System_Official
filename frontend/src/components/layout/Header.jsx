import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVenue } from '../../context/VenueContext';
import { useAuth } from '../../context/AuthContext';
import { useWebSocket } from '../../context/WebSocketContext';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Building2, Wifi, WifiOff, Plus, ChevronDown, Check, Sparkles, ArrowRight, CreditCard, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const Header = ({ title }) => {
  const navigate = useNavigate();
  const { venues, currentVenue, selectVenue, createVenue, showOnboarding, dismissOnboarding } = useVenue();
  const { isAdmin } = useAuth();
  const { connected } = useWebSocket();
  const [showVenueDropdown, setShowVenueDropdown] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const dropdownRef = useRef(null);

  const handleVenueSelect = (venue) => {
    selectVenue(venue);
    setShowVenueDropdown(false);
  };

  const handleCreateVenue = async () => {
    setIsCreating(true);
    const result = await createVenue();
    setIsCreating(false);
    setShowCreateDialog(false);
    
    if (result.success) {
      toast.success('新場域已建立！請設定名稱和頭貼。');
    } else {
      toast.error(result.error);
    }
  };

  const handleGoToSettings = () => {
    dismissOnboarding();
    navigate('/settings');
  };

  return (
    <>
      <header className="h-16 glass-header px-6 flex items-center justify-between sticky top-0 z-50" data-testid="header">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
            {title}
          </h1>
        </div>

        <div className="flex items-center gap-4">
          {/* Connection Status */}
          <div className="flex items-center gap-2">
            {connected ? (
              <Badge variant="outline" className="bg-[#22c55e]/15 text-[#22c55e] border-[#22c55e]/30 gap-1.5">
                <Wifi className="w-3 h-3" />
                <span className="text-xs">即時連線</span>
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-red-500/15 text-red-400 border-red-500/30 gap-1.5">
                <WifiOff className="w-3 h-3" />
                <span className="text-xs">離線</span>
              </Badge>
            )}
          </div>

          {/* Venue Selector - Custom dropdown with avatars */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowVenueDropdown(!showVenueDropdown)}
              className="flex items-center gap-3 px-3 py-2 bg-[#27272a]/50 border border-[#27272a] rounded-xl hover:border-[#FF6B35]/50 transition-all duration-300 min-w-[200px]"
              data-testid="venue-selector"
            >
              {currentVenue?.avatar_url ? (
                <Avatar className="w-7 h-7">
                  <AvatarImage src={`${API_URL}${currentVenue.avatar_url}`} alt={currentVenue.name} />
                  <AvatarFallback className="bg-[#FF6B35]/20 text-[#FF6B35] text-xs">{currentVenue.name?.charAt(0)}</AvatarFallback>
                </Avatar>
              ) : (
                <div className="w-7 h-7 rounded-full bg-[#FF6B35]/20 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-3.5 h-3.5 text-[#FF6B35]" />
                </div>
              )}
              <span className="text-white text-sm font-medium truncate flex-1 text-left">
                {currentVenue?.name || '選擇場域'}
              </span>
              <ChevronDown className={`w-4 h-4 text-[#8b949e] transition-transform ${showVenueDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown */}
            {showVenueDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowVenueDropdown(false)} />
                <div className="absolute right-0 top-full mt-2 w-[280px] bg-[#18181b] border border-[#27272a] rounded-xl shadow-2xl shadow-black/50 z-50 overflow-hidden">
                  {/* Venue list */}
                  <div className="p-2 max-h-[300px] overflow-y-auto">
                    {venues.map((venue) => (
                      <button
                        key={venue.id}
                        onClick={() => handleVenueSelect(venue)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                          currentVenue?.id === venue.id
                            ? 'bg-[#FF6B35]/15 border border-[#FF6B35]/30'
                            : 'hover:bg-[#27272a] border border-transparent'
                        }`}
                        data-testid={`venue-option-${venue.id}`}
                      >
                        {venue.avatar_url ? (
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={`${API_URL}${venue.avatar_url}`} alt={venue.name} />
                            <AvatarFallback className="bg-[#FF6B35]/20 text-[#FF6B35] text-xs">{venue.name?.charAt(0)}</AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-[#27272a] flex items-center justify-center flex-shrink-0">
                            <Building2 className="w-4 h-4 text-[#8b949e]" />
                          </div>
                        )}
                        <div className="flex-1 text-left min-w-0">
                          <p className="text-white text-sm font-medium truncate">{venue.name}</p>
                          {venue.description && (
                            <p className="text-[#8b949e] text-xs truncate">{venue.description}</p>
                          )}
                        </div>
                        {currentVenue?.id === venue.id && (
                          <Check className="w-4 h-4 text-[#FF6B35] flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Add venue button */}
                  {isAdmin && (
                    <>
                      <div className="border-t border-[#27272a]" />
                      <div className="p-2">
                        <button
                          onClick={() => {
                            setShowVenueDropdown(false);
                            setShowCreateDialog(true);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#FF6B35]/10 transition-all duration-200 group"
                          data-testid="add-venue-btn"
                        >
                          <div className="w-8 h-8 rounded-full bg-[#FF6B35]/15 border-2 border-dashed border-[#FF6B35]/40 flex items-center justify-center group-hover:border-[#FF6B35] transition-colors">
                            <Plus className="w-4 h-4 text-[#FF6B35]" />
                          </div>
                          <span className="text-[#FF6B35] text-sm font-medium">新增場域</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Create Venue Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-[#18181b] border-[#27272a] rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FF6B35] flex items-center justify-center">
                <Plus className="w-5 h-5 text-white" />
              </div>
              新增場域
            </DialogTitle>
            <DialogDescription className="text-[#a1a1aa] mt-2">
              建立新的場域來管理不同品牌或據點
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {/* Payment Notice */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                  <CreditCard className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <p className="font-medium text-amber-400 text-sm">付費功能</p>
                  <p className="text-[#8b949e] text-xs mt-1">
                    新增場域為付費功能，每個場域將依據方案收取月費。目前為體驗期間，可免費新增。
                  </p>
                </div>
              </div>
            </div>

            {/* What you get */}
            <div className="bg-[#27272a]/30 rounded-xl p-4 space-y-3">
              <p className="text-white text-sm font-medium">新場域將包含：</p>
              <div className="space-y-2">
                {['獨立的 LINE OA 連接設定', '獨立的 AI 知識庫', '獨立的對話管理與轉交列表', '獨立的業績統計'].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-[#8b949e] text-sm">
                    <Check className="w-4 h-4 text-[#22c55e] flex-shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              className="border-[#27272a] text-[#a1a1aa] hover:bg-[#27272a] hover:text-white rounded-lg"
            >
              取消
            </Button>
            <Button
              onClick={handleCreateVenue}
              disabled={isCreating}
              className="bg-[#FF6B35] hover:bg-[#E55A2B] text-white rounded-lg"
            >
              {isCreating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              確認新增
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Onboarding Guide after creating new venue */}
      <Dialog open={showOnboarding} onOpenChange={dismissOnboarding}>
        <DialogContent className="bg-[#18181b] border-[#27272a] rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF6B35] to-[#00B4D8] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              場域建立成功！
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <p className="text-[#a1a1aa] text-sm">
              您的新場域已建立完成。接下來建議您完成以下設定，讓場域更加完整：
            </p>

            <div className="space-y-3">
              <div className="flex items-start gap-3 bg-[#FF6B35]/5 border border-[#FF6B35]/20 rounded-xl p-4">
                <div className="w-8 h-8 rounded-lg bg-[#FF6B35]/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[#FF6B35] font-bold text-sm">1</span>
                </div>
                <div>
                  <p className="text-white font-medium text-sm">更換場域名稱</p>
                  <p className="text-[#8b949e] text-xs mt-0.5">將「新場域」改為您品牌的名稱</p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-[#00B4D8]/5 border border-[#00B4D8]/20 rounded-xl p-4">
                <div className="w-8 h-8 rounded-lg bg-[#00B4D8]/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[#00B4D8] font-bold text-sm">2</span>
                </div>
                <div>
                  <p className="text-white font-medium text-sm">上傳場域頭貼</p>
                  <p className="text-[#8b949e] text-xs mt-0.5">上傳品牌 Logo 或代表圖片</p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-[#22c55e]/5 border border-[#22c55e]/20 rounded-xl p-4">
                <div className="w-8 h-8 rounded-lg bg-[#22c55e]/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[#22c55e] font-bold text-sm">3</span>
                </div>
                <div>
                  <p className="text-white font-medium text-sm">設定 LINE OA 連接</p>
                  <p className="text-[#8b949e] text-xs mt-0.5">連接 LINE Official Account 開始接收對話</p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={handleGoToSettings}
              className="w-full bg-[#FF6B35] hover:bg-[#E55A2B] text-white rounded-lg py-3 h-auto"
            >
              前往設定
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
