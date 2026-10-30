import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { SecureCredentialField } from './SecureCredentialField';
import { toast } from 'sonner';
import {
  Loader2,
  Link,
  User,
  Shield,
  Lock,
  Pencil,
  X,
  Check,
  MessageSquare,
  Key,
  AlertTriangle,
  Wrench
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const LineOACredentials = ({ venueId, token }) => {
  // Token and secret come back masked; they are only sent when the user types a new value
  const EMPTY = { channel_access_token: '', user_id: '', channel_id: '', channel_secret: '' };
  const [saved, setSaved] = useState(EMPTY);
  const [credentials, setCredentials] = useState(EMPTY);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadCredentials = async () => {
    if (!venueId || !token) return;
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/venues/${venueId}/line-credentials`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSaved({ ...EMPTY, ...(response.data.credentials || {}) });
    } catch (error) {
      toast.error(error.response?.data?.detail || '無法載入 LINE OA 憑證');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCredentials();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueId, token]);

  const startEditing = () => {
    setCredentials({ ...EMPTY, user_id: saved.user_id, channel_id: saved.channel_id });
    setIsEditing(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await axios.put(
        `${API_URL}/api/venues/${venueId}/line-credentials`,
        credentials,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('LINE OA 憑證已更新');
      setIsEditing(false);
      await loadCredentials();
    } catch (error) {
      toast.error(error.response?.data?.detail || '儲存失敗');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const hasChanges = Boolean(
    credentials.channel_access_token || credentials.channel_secret ||
    credentials.user_id !== saved.user_id || credentials.channel_id !== saved.channel_id
  );
  const hasAnyCredential = Object.values(saved).some(v => v);
  const fieldValue = (key) => (isEditing ? credentials[key] : saved[key]);
  const secretPlaceholder = (key, fallback) => (saved[key] ? '已設定，留空表示不變更' : fallback);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-[#FF6B35]" />
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#06C755]/15 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-[#06C755]" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">LINE OA 憑證</h3>
            <p className="text-xs text-[#8b949e]">連接 LINE Official Account 所需的安全憑證</p>
          </div>
        </div>
        
        {!isEditing ? (
          <Button
            variant="outline"
            size="sm"
            onClick={startEditing}
            className="border-[#27272a] text-[#a1a1aa] hover:text-white hover:bg-[#27272a]"
          >
            <Pencil className="w-4 h-4 mr-2" />
            修改
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="text-[#8b949e] hover:text-white"
            >
              <X className="w-4 h-4 mr-1" />
              取消
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
              className="bg-[#06C755] hover:bg-[#05a847] text-white"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              儲存
            </Button>
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${hasAnyCredential ? 'bg-[#22c55e]' : 'bg-[#f59e0b]'}`} />
        <span className="text-xs text-[#8b949e]">
          {hasAnyCredential ? '已設定憑證' : '尚未設定憑證'}
        </span>
        {isEditing && (
          <Badge className="bg-amber-500/15 text-amber-400 border-0 text-xs ml-2">
            編輯模式
          </Badge>
        )}
      </div>

      {/* 工程師設定提示 */}
      <div className="bg-[#FF6B35]/10 border-2 border-[#FF6B35]/30 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FF6B35]/15 flex items-center justify-center flex-shrink-0">
            <Wrench className="w-5 h-5 text-[#FF6B35]" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-bold text-[#FF6B35] text-sm">需由工程師協助設定</p>
              <Badge className="bg-[#FF6B35]/15 text-[#FF6B35] border-0 text-xs">
                <AlertTriangle className="w-3 h-3 mr-1" />
                重要
              </Badge>
            </div>
            <p className="text-[#c9d1d9] text-sm leading-relaxed">
              LINE OA 憑證涉及系統安全性，建議由專業工程師進行設定。
            </p>
            <div className="mt-3 bg-[#0d1117] rounded-lg p-3 space-y-2">
              <p className="text-white text-sm font-medium">操作步驟：</p>
              <div className="space-y-1.5">
                <div className="flex items-start gap-2">
                  <span className="text-[#FF6B35] font-bold text-xs mt-0.5 flex-shrink-0">1.</span>
                  <p className="text-[#8b949e] text-xs">前往 <span className="text-white font-medium">LINE Official Account Manager</span>，將工程師新增為該 LINE OA 的管理員</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#FF6B35] font-bold text-xs mt-0.5 flex-shrink-0">2.</span>
                  <p className="text-[#8b949e] text-xs">工程師至 <span className="text-white font-medium">LINE Developers Console</span> 取得所需憑證</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#FF6B35] font-bold text-xs mt-0.5 flex-shrink-0">3.</span>
                  <p className="text-[#8b949e] text-xs">由工程師在下方填入正確的憑證資訊，並設定 Webhook URL</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <Separator className="bg-[#27272a]" />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SecureCredentialField
          label="Channel Access Token"
          value={fieldValue('channel_access_token')}
          onChange={(val) => setCredentials({ ...credentials, channel_access_token: val })}
          isEditing={isEditing}
          placeholder={secretPlaceholder('channel_access_token', '輸入 Channel Access Token')}
          icon={Key}
          description="LINE Developers Console 中的長效 Token"
        />
        
        <SecureCredentialField
          label="User ID"
          value={fieldValue('user_id')}
          onChange={(val) => setCredentials({ ...credentials, user_id: val })}
          isEditing={isEditing}
          placeholder="輸入 User ID"
          icon={User}
          description="LINE 用戶識別碼（U 開頭）"
        />
        
        <SecureCredentialField
          label="Channel ID"
          value={fieldValue('channel_id')}
          onChange={(val) => setCredentials({ ...credentials, channel_id: val })}
          isEditing={isEditing}
          placeholder="輸入 Channel ID"
          icon={Shield}
          description="Messaging API 的 Channel ID（數字）"
        />
        
        <SecureCredentialField
          label="Channel Secret"
          value={fieldValue('channel_secret')}
          onChange={(val) => setCredentials({ ...credentials, channel_secret: val })}
          isEditing={isEditing}
          placeholder={secretPlaceholder('channel_secret', '輸入 Channel Secret')}
          icon={Lock}
          description="用於驗證 Webhook 請求的密鑰"
        />
      </div>
      
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mt-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center flex-shrink-0">
            <Link className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-medium text-amber-400 text-sm">Webhook URL 設定</p>
              <Badge className="bg-amber-500/15 text-amber-400 border-0 text-xs">
                <Lock className="w-3 h-3 mr-1" />
                工程師專用
              </Badge>
            </div>
            <p className="text-xs text-[#8b949e] mb-2">
              此設定需由工程師協助修改，以避免系統當機或無法使用。
            </p>
            <div className="bg-[#0d1117] rounded-md p-2 font-mono text-xs text-[#8b949e]">
              {process.env.REACT_APP_BACKEND_URL}/api/webhook/{venueId || 'venue_id'}
            </div>
            <p className="text-xs text-[#52525b] mt-2">
              請將上述 URL 設定至 LINE Developers Console 的 Webhook URL 欄位
            </p>
          </div>
        </div>
      </div>
      
      <div className="bg-[#27272a]/30 rounded-lg p-3 mt-4">
        <div className="flex items-start gap-2">
          <Shield className="w-4 h-4 text-[#00B4D8] mt-0.5 flex-shrink-0" />
          <div className="text-xs text-[#8b949e]">
            <p className="font-medium text-white mb-1">安全提示</p>
            <ul className="space-y-1">
              <li>• Token 與 Secret 儲存後只會顯示前後幾碼，修改時直接填入新值即可</li>
              <li>• 修改前請確保您有正確的憑證資訊</li>
              <li>• 這些憑證用於連接您的 LINE Official Account</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
