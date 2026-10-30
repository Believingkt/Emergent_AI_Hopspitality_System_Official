import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { toast } from 'sonner';
import { Loader2, Lock } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const EMPTY_FORM = { current: '', next: '', confirm: '' };

export const ChangePasswordDialog = ({ open, onOpenChange }) => {
  const navigate = useNavigate();
  const { token, user, logout } = useAuth();
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const mismatch = form.confirm && form.next !== form.confirm;

  const handleClose = (value) => {
    if (!value) setForm(EMPTY_FORM);
    onOpenChange(value);
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await axios.put(
        `${API_URL}/api/auth/password`,
        { current_password: form.current, new_password: form.next },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('密碼已更新，請用新密碼重新登入');
      handleClose(false);
      logout();
      navigate('/login');
    } catch (error) {
      toast.error(error.response?.data?.detail || '密碼更新失敗');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'bg-[#27272a]/50 border-[#27272a] text-white placeholder:text-[#52525b] rounded-lg';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-[#18181b] border-[#27272a] rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">修改密碼</DialogTitle>
          <DialogDescription className="text-[#a1a1aa]">
            {user?.email}・新密碼至少 10 個字元，需包含英文字母與數字
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-white">
              <Lock className="w-4 h-4 text-[#FF6B35]" />
              目前密碼
            </Label>
            <Input
              type="password"
              autoComplete="current-password"
              value={form.current}
              onChange={(e) => setForm({ ...form, current: e.target.value })}
              className={inputClass}
              data-testid="current-password-input"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-white">新密碼</Label>
            <Input
              type="password"
              autoComplete="new-password"
              value={form.next}
              onChange={(e) => setForm({ ...form, next: e.target.value })}
              className={inputClass}
              data-testid="new-password-input"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-white">確認新密碼</Label>
            <Input
              type="password"
              autoComplete="new-password"
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              className={inputClass}
              data-testid="confirm-password-input"
            />
            {mismatch && <p className="text-xs text-red-400">兩次輸入的新密碼不一致</p>}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            className="border-[#27272a] text-[#a1a1aa] hover:bg-[#27272a] hover:text-white rounded-lg"
          >
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || !form.current || !form.next || form.next !== form.confirm}
            className="bg-[#FF6B35] hover:bg-[#E55A2B] text-white rounded-full transition-all duration-300"
            data-testid="confirm-change-password-btn"
          >
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            更新密碼
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
