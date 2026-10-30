import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Sidebar } from '../components/layout/Sidebar';
import { Header } from '../components/layout/Header';
import { useAuth } from '../context/AuthContext';
import { useVenue } from '../context/VenueContext';
import { LineOACredentials } from '../components/settings/LineOACredentials';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { Separator } from '../components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { generatePassword } from '../lib/utils';
import { toast } from 'sonner';
import {
  Building2,
  Users,
  Settings as SettingsIcon,
  Save,
  Plus,
  Loader2,
  Bot,
  Link,
  Mail,
  User,
  Shield,
  Lock,
  Camera,
  Pencil,
  Check,
  X,
  ImagePlus,
  Trash2,
  Wand2
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AI_MODELS = [
  { value: 'T1', label: 'T1 - 接單導向（預設）', description: '專注於銷售成交，積極引導客戶下訂', available: true },
  { value: 'T2', label: 'T2 - 客服導向', description: '側重客戶服務，耐心解答問題', available: false, requiresUpgrade: true },
  { value: 'T3', label: 'T3 - 平衡模式', description: '兼顧銷售與服務的平衡策略', available: false, requiresUpgrade: true },
];

export default function SettingsPage() {
  const { token, isAdmin, user: currentUser, logout } = useAuth();
  const { venues, getVenueConfig, updateVenueConfig, updateVenue, uploadAvatar, fetchVenues } = useVenue();
  
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [venueConfig, setVenueConfig] = useState(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Venue profile editing
  const [editingName, setEditingName] = useState(false);
  const [venueName, setVenueName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef(null);

  const [managers, setManagers] = useState([]);
  const [managersLoading, setManagersLoading] = useState(false);
  const [addManagerOpen, setAddManagerOpen] = useState(false);
  const [newManager, setNewManager] = useState({ name: '', email: '', password: '', role: 'manager' });
  const [addingManager, setAddingManager] = useState(false);
  const [editManager, setEditManager] = useState(null);
  const [savingManager, setSavingManager] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingManager, setDeletingManager] = useState(false);

  // Fetch managers
  const fetchManagers = async () => {
    setManagersLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/managers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Manus API: { managers: [...] }
      const managerList = response.data.managers || response.data;
      setManagers(managerList);
    } catch (error) {
      console.error('Failed to fetch managers:', error);
      toast.error('無法載入管家列表');
    } finally {
      setManagersLoading(false);
    }
  };

  // Fetch venue config when selected
  const handleVenueSelect = async (venue) => {
    setSelectedVenue(venue);
    setVenueName(venue.name || '');
    setEditingName(false);
    setConfigLoading(true);
    const config = await getVenueConfig(venue.id);
    setVenueConfig(config);
    setConfigLoading(false);
  };

  // Save venue name
  const handleSaveName = async () => {
    if (!selectedVenue || !venueName.trim()) return;
    setSavingName(true);
    const result = await updateVenue(selectedVenue.id, { name: venueName.trim() });
    if (result.success) {
      toast.success('場域名稱已更新');
      setSelectedVenue(prev => ({ ...prev, name: venueName.trim() }));
      setEditingName(false);
      await fetchVenues();
    } else {
      toast.error(result.error);
    }
    setSavingName(false);
  };

  // Handle avatar upload
  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedVenue) return;
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('圖片大小不能超過 5MB');
      return;
    }
    
    setUploadingAvatar(true);
    const result = await uploadAvatar(selectedVenue.id, file);
    if (result.success) {
      toast.success('場域頭貼已更新');
      setSelectedVenue(prev => ({ ...prev, avatar_url: result.avatar_url }));
      await fetchVenues();
    } else {
      toast.error(result.error);
    }
    setUploadingAvatar(false);
    // Reset input
    if (avatarInputRef.current) avatarInputRef.current.value = '';
  };

  // Save venue config
  const handleSaveConfig = async () => {
    if (!selectedVenue || !venueConfig) return;
    
    setSaving(true);
    const result = await updateVenueConfig(selectedVenue.id, venueConfig);
    if (result.success) {
      toast.success('場域設定已儲存');
    } else {
      toast.error(result.error);
    }
    setSaving(false);
  };

  // Add new manager
  const handleAddManager = async () => {
    setAddingManager(true);
    try {
      await axios.post(
        `${API_URL}/api/managers`,
        newManager,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('管家已新增');
      setAddManagerOpen(false);
      setNewManager({ name: '', email: '', password: '', role: 'manager' });
      fetchManagers();
    } catch (error) {
      toast.error(error.response?.data?.detail || '新增失敗');
    } finally {
      setAddingManager(false);
    }
  };

  const openEditManager = (manager) => {
    setEditManager({ originalEmail: manager.email, name: manager.name, email: manager.email, role: manager.role, password: '' });
  };

  // Update manager name / email / role / password
  const handleUpdateManager = async () => {
    setSavingManager(true);
    const { originalEmail, password, ...fields } = editManager;
    try {
      const response = await axios.put(
        `${API_URL}/api/managers/${encodeURIComponent(originalEmail)}`,
        { ...fields, ...(password ? { password } : {}) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEditManager(null);
      if (response.data.relogin_required) {
        toast.success('帳號已更新，請用新的帳密重新登入');
        logout();
        return;
      }
      toast.success('帳號已更新');
      fetchManagers();
    } catch (error) {
      toast.error(error.response?.data?.detail || '更新失敗');
    } finally {
      setSavingManager(false);
    }
  };

  const handleDeleteManager = async () => {
    setDeletingManager(true);
    try {
      await axios.delete(
        `${API_URL}/api/managers/${encodeURIComponent(deleteTarget.email)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('帳號已刪除');
      fetchManagers();
    } catch (error) {
      toast.error(error.response?.data?.detail || '刪除失敗');
    } finally {
      setDeletingManager(false);
      setDeleteTarget(null);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchManagers();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (venues.length > 0 && !selectedVenue) {
      handleVenueSelect(venues[0]);
    }
  }, [venues]);

  if (!isAdmin) {
    return (
      <div className="h-screen flex bg-[#09090b]">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Shield className="w-16 h-16 mx-auto mb-4 text-[#71717a]" />
            <h2 className="text-xl font-semibold text-white mb-2">權限不足</h2>
            <p className="text-[#a1a1aa]">只有管理員可以存取設定頁面</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-[#09090b]" data-testid="settings-page">
      <Sidebar />
      
      <div className="flex-1 flex flex-col min-w-0">
        <Header title="系統設定" />

        <div className="flex-1 p-6 overflow-auto">
          <Tabs defaultValue="venues" className="space-y-6">
            <TabsList className="bg-[#18181b] border border-[#27272a] p-1 rounded-lg">
              <TabsTrigger 
                value="venues"
                className="data-[state=active]:bg-[#FF6B35] data-[state=active]:text-white text-[#a1a1aa] rounded-lg px-4 transition-all duration-300"
                data-testid="tab-venues"
              >
                <Building2 className="w-4 h-4 mr-2" />
                場域管理
              </TabsTrigger>
              <TabsTrigger 
                value="managers"
                className="data-[state=active]:bg-[#FF6B35] data-[state=active]:text-white text-[#a1a1aa] rounded-lg px-4 transition-all duration-300"
                data-testid="tab-managers"
              >
                <Users className="w-4 h-4 mr-2" />
                管家管理
              </TabsTrigger>
            </TabsList>

            {/* Venues Tab */}
            <TabsContent value="venues" className="space-y-6 mt-6">
              <div className="grid grid-cols-12 gap-6">
                {/* Venue List */}
                <div className="col-span-4">
                  <Card className="border-[#27272a] bg-[#18181b] rounded-xl">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2 text-white">
                        <Building2 className="w-5 h-5 text-[#FF6B35]" />
                        場域列表
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[500px]">
                        <div className="space-y-2">
                          {venues.map((venue) => (
                            <div
                              key={venue.id}
                              onClick={() => handleVenueSelect(venue)}
                              className={`p-3 rounded-xl cursor-pointer transition-all duration-300 flex items-center gap-3 ${
                                selectedVenue?.id === venue.id
                                  ? 'bg-[#FF6B35] text-white'
                                  : 'bg-[#27272a]/50 hover:bg-[#27272a] text-white'
                              }`}
                              data-testid={`venue-item-${venue.id}`}
                            >
                              {venue.avatar_url ? (
                                <Avatar className="w-10 h-10">
                                  <AvatarImage src={`${API_URL}${venue.avatar_url}`} alt={venue.name} />
                                  <AvatarFallback className="bg-[#FF6B35]/20 text-[#FF6B35] text-sm">{venue.name?.charAt(0)}</AvatarFallback>
                                </Avatar>
                              ) : (
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                                  selectedVenue?.id === venue.id ? 'bg-white/20' : 'bg-[#27272a]'
                                }`}>
                                  <Building2 className="w-5 h-5" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{venue.name}</div>
                                <div className={`text-xs mt-0.5 truncate ${
                                  selectedVenue?.id === venue.id ? 'text-white/60' : 'text-[#8b949e]'
                                }`}>
                                  {venue.description || `ID: ${venue.id}`}
                                </div>
                              </div>
                              {selectedVenue?.id === venue.id && (
                                <Check className="w-4 h-4 flex-shrink-0" />
                              )}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>

                {/* Venue Config */}
                <div className="col-span-8 space-y-6">
                  {/* Venue Profile Card */}
                  {selectedVenue && (
                    <Card className="border-[#27272a] bg-[#18181b] rounded-xl">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-6">
                          {/* Avatar */}
                          <div className="relative group">
                            <input
                              ref={avatarInputRef}
                              type="file"
                              accept="image/jpeg,image/png,image/webp,image/gif"
                              className="hidden"
                              onChange={handleAvatarUpload}
                            />
                            {selectedVenue.avatar_url ? (
                              <Avatar className="w-20 h-20 cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                                <AvatarImage src={`${API_URL}${selectedVenue.avatar_url}`} alt={selectedVenue.name} />
                                <AvatarFallback className="bg-[#FF6B35]/20 text-[#FF6B35] text-2xl">{selectedVenue.name?.charAt(0)}</AvatarFallback>
                              </Avatar>
                            ) : (
                              <div 
                                onClick={() => avatarInputRef.current?.click()}
                                className="w-20 h-20 rounded-full bg-[#27272a] border-2 border-dashed border-[#3f3f46] flex items-center justify-center cursor-pointer hover:border-[#FF6B35] hover:bg-[#FF6B35]/10 transition-all"
                              >
                                <ImagePlus className="w-8 h-8 text-[#52525b]" />
                              </div>
                            )}
                            {/* Upload overlay */}
                            <div 
                              onClick={() => avatarInputRef.current?.click()}
                              className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            >
                              {uploadingAvatar ? (
                                <Loader2 className="w-6 h-6 text-white animate-spin" />
                              ) : (
                                <Camera className="w-6 h-6 text-white" />
                              )}
                            </div>
                          </div>

                          {/* Name */}
                          <div className="flex-1">
                            {editingName ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  value={venueName}
                                  onChange={(e) => setVenueName(e.target.value)}
                                  className="bg-[#27272a]/50 border-[#27272a] text-white text-xl font-bold rounded-lg h-12"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveName();
                                    if (e.key === 'Escape') { setEditingName(false); setVenueName(selectedVenue.name); }
                                  }}
                                />
                                <Button
                                  size="icon"
                                  onClick={handleSaveName}
                                  disabled={savingName || !venueName.trim()}
                                  className="bg-[#22c55e] hover:bg-[#16a34a] text-white h-12 w-12 rounded-lg"
                                >
                                  {savingName ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => { setEditingName(false); setVenueName(selectedVenue.name); }}
                                  className="text-[#8b949e] hover:text-white h-12 w-12 rounded-lg"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-3">
                                <h2 className="text-2xl font-bold text-white">{selectedVenue.name}</h2>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => { setEditingName(true); setVenueName(selectedVenue.name); }}
                                  className="text-[#8b949e] hover:text-white h-8 w-8 rounded-lg"
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                            <p className="text-[#8b949e] text-sm mt-1">
                              {selectedVenue.avatar_url ? '點擊頭貼可更換圖片' : '點擊左側圓圈上傳場域頭貼'}
                            </p>
                            {selectedVenue.name === '新場域' && (
                              <Badge className="bg-amber-500/15 text-amber-400 border-0 text-xs mt-2">
                                建議：請更換為您的品牌名稱
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Venue Config Card */}
                  <Card className="border-[#27272a] bg-[#18181b] rounded-xl">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2 text-white">
                            <SettingsIcon className="w-5 h-5 text-[#00B4D8]" />
                            場域設定
                          </CardTitle>
                          <CardDescription className="mt-1 text-[#a1a1aa]">
                            {selectedVenue?.name || '請選擇場域'}
                          </CardDescription>
                        </div>
                        <Button
                          onClick={handleSaveConfig}
                          disabled={saving || !venueConfig}
                          className="bg-[#FF6B35] hover:bg-[#E55A2B] text-white rounded-full btn-glow transition-all duration-300"
                          data-testid="save-venue-config-btn"
                        >
                          {saving ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4 mr-2" />
                          )}
                          儲存設定
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {configLoading ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="w-6 h-6 animate-spin text-[#FF6B35]" />
                        </div>
                      ) : venueConfig ? (
                        <div className="space-y-6">
                          {/* AI Model */}
                          <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-white">
                              <Bot className="w-4 h-4 text-[#00B4D8]" />
                              AI 銷售風格
                            </Label>
                            <Select
                              value={venueConfig.ai_model || 'T1'}
                              onValueChange={(value) => {
                                const model = AI_MODELS.find(m => m.value === value);
                                if (model?.requiresUpgrade) {
                                  toast.error('此模型需要升級至專業版才能使用');
                                  return;
                                }
                                setVenueConfig({ ...venueConfig, ai_model: value });
                              }}
                            >
                              <SelectTrigger 
                                className="bg-[#27272a]/50 border-[#27272a] text-white rounded-lg"
                                data-testid="ai-model-select"
                              >
                                <SelectValue placeholder="選擇 AI 風格" />
                              </SelectTrigger>
                              <SelectContent className="bg-[#18181b] border-[#27272a] rounded-lg">
                                {AI_MODELS.map((model) => (
                                  <SelectItem 
                                    key={model.value} 
                                    value={model.value} 
                                    className="text-white hover:bg-[#27272a] focus:bg-[#27272a] focus:text-white"
                                  >
                                    <div className="flex items-center gap-2">
                                      <div>
                                        <div className="font-medium flex items-center gap-2">
                                          {model.label}
                                          {model.requiresUpgrade && (
                                            <Badge className="bg-amber-500/15 text-amber-400 border-0 text-xs">
                                              <Lock className="w-3 h-3 mr-1" />
                                              需升級
                                            </Badge>
                                          )}
                                        </div>
                                        <div className="text-xs text-[#8b949e]">{model.description}</div>
                                      </div>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-[#52525b]">選擇 AI 與客戶互動的風格策略（T2、T3 需升級專業版）</p>
                          </div>

                          {/* Knowledge Base URL */}
                          <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-white">
                              <Link className="w-4 h-4 text-[#00B4D8]" />
                              AI 知識庫 URL
                            </Label>
                            <Input
                              value={venueConfig.ai_knowledge_base_url || ''}
                              onChange={(e) => 
                                setVenueConfig({ ...venueConfig, ai_knowledge_base_url: e.target.value })
                              }
                              placeholder="https://example.com/knowledge-base"
                              className="bg-[#27272a]/50 border-[#27272a] text-white placeholder:text-[#52525b] rounded-lg"
                              data-testid="knowledge-base-input"
                            />
                          </div>

                          <Separator className="bg-[#27272a]" />

                          {/* LINE OA Credentials */}
                          <LineOACredentials 
                            venueId={selectedVenue?.id} 
                            token={token} 
                          />
                        </div>
                      ) : (
                        <div className="text-center py-12 text-[#71717a]">
                          <SettingsIcon className="w-12 h-12 mx-auto mb-4 opacity-30" />
                          <p>請從左側選擇場域以查看設定</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* Managers Tab */}
            <TabsContent value="managers" className="mt-6">
              <Card className="border-[#27272a] bg-[#18181b] rounded-xl">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2 text-white">
                        <Users className="w-5 h-5 text-[#00B4D8]" />
                        管家團隊
                      </CardTitle>
                      <CardDescription className="text-[#a1a1aa]">管理平台管家帳號</CardDescription>
                    </div>
                    <Button
                      onClick={() => setAddManagerOpen(true)}
                      className="bg-[#FF6B35] hover:bg-[#E55A2B] text-white rounded-full btn-glow transition-all duration-300"
                      data-testid="add-manager-btn"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      新增管家
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {managersLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin text-[#FF6B35]" />
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {managers.map((manager) => (
                        <div
                          key={manager.email}
                          className="p-4 bg-[#27272a]/50 rounded-xl border border-[#27272a] hover:border-[#FF6B35]/50 transition-all duration-300"
                          data-testid={`manager-card-${manager.email}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#00B4D8] flex items-center justify-center flex-shrink-0">
                              <span className="text-white font-medium">
                                {manager.name?.charAt(0) || '?'}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-white truncate">
                                  {manager.name}
                                </span>
                                <Badge 
                                  variant="outline" 
                                  className={
                                    manager.role === 'admin' 
                                      ? 'bg-[#FF6B35]/20 text-[#FF6B35] border-[#FF6B35]/30' 
                                      : 'bg-[#00B4D8]/20 text-[#00B4D8] border-[#00B4D8]/30'
                                  }
                                >
                                  {manager.role === 'admin' ? '管理員' : '管家'}
                                </Badge>
                              </div>
                              <p className="text-sm text-[#a1a1aa] truncate mt-1">
                                {manager.email}
                              </p>
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 mt-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditManager(manager)}
                              className="text-[#a1a1aa] hover:text-white hover:bg-[#27272a] rounded-lg"
                              data-testid={`edit-manager-${manager.email}`}
                            >
                              <Pencil className="w-4 h-4 mr-1" />
                              編輯帳密
                            </Button>
                            {manager.email !== currentUser?.email && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteTarget(manager)}
                                className="text-[#a1a1aa] hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                                data-testid={`delete-manager-${manager.email}`}
                              >
                                <Trash2 className="w-4 h-4 mr-1" />
                                刪除
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Add Manager Dialog */}
      <Dialog open={addManagerOpen} onOpenChange={setAddManagerOpen}>
        <DialogContent className="bg-[#18181b] border-[#27272a] rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">
              新增管家
            </DialogTitle>
            <DialogDescription className="text-[#a1a1aa]">
              填寫以下資訊以建立新的管家帳號
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-white">
                <User className="w-4 h-4 text-[#FF6B35]" />
                姓名
              </Label>
              <Input
                value={newManager.name}
                onChange={(e) => setNewManager({ ...newManager, name: e.target.value })}
                placeholder="輸入姓名"
                className="bg-[#27272a]/50 border-[#27272a] text-white placeholder:text-[#52525b] rounded-lg"
                data-testid="new-manager-name"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-white">
                <Mail className="w-4 h-4 text-[#FF6B35]" />
                電子郵件
              </Label>
              <Input
                type="email"
                value={newManager.email}
                onChange={(e) => setNewManager({ ...newManager, email: e.target.value })}
                placeholder="輸入電子郵件"
                className="bg-[#27272a]/50 border-[#27272a] text-white placeholder:text-[#52525b] rounded-lg"
                data-testid="new-manager-email"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-white">
                <Shield className="w-4 h-4 text-[#FF6B35]" />
                密碼
              </Label>
              <div className="flex gap-2">
                <Input
                  value={newManager.password}
                  onChange={(e) => setNewManager({ ...newManager, password: e.target.value })}
                  placeholder="至少 10 字元，含英文與數字"
                  autoComplete="new-password"
                  className="bg-[#27272a]/50 border-[#27272a] text-white placeholder:text-[#52525b] rounded-lg font-mono"
                  data-testid="new-manager-password"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setNewManager({ ...newManager, password: generatePassword() })}
                  className="border-[#27272a] text-[#a1a1aa] hover:bg-[#27272a] hover:text-white rounded-lg shrink-0"
                >
                  <Wand2 className="w-4 h-4 mr-1" />
                  產生
                </Button>
              </div>
              <p className="text-xs text-[#71717a]">建立後請將密碼交給使用者，他可以點左下角頭像自行修改</p>
            </div>

            <div className="space-y-2">
              <Label className="text-white">角色</Label>
              <Select
                value={newManager.role}
                onValueChange={(value) => setNewManager({ ...newManager, role: value })}
              >
                <SelectTrigger className="bg-[#27272a]/50 border-[#27272a] text-white rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#18181b] border-[#27272a] rounded-lg">
                  <SelectItem value="manager" className="text-white hover:bg-[#27272a] focus:bg-[#27272a] focus:text-white">管家</SelectItem>
                  <SelectItem value="admin" className="text-white hover:bg-[#27272a] focus:bg-[#27272a] focus:text-white">管理員</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddManagerOpen(false)}
              className="border-[#27272a] text-[#a1a1aa] hover:bg-[#27272a] hover:text-white rounded-lg"
            >
              取消
            </Button>
            <Button
              onClick={handleAddManager}
              disabled={addingManager || !newManager.name || !newManager.email || !newManager.password}
              className="bg-[#FF6B35] hover:bg-[#E55A2B] text-white rounded-full transition-all duration-300"
              data-testid="confirm-add-manager-btn"
            >
              {addingManager ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              新增
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Manager Dialog */}
      <Dialog open={!!editManager} onOpenChange={(open) => !open && setEditManager(null)}>
        <DialogContent className="bg-[#18181b] border-[#27272a] rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">編輯帳號</DialogTitle>
            <DialogDescription className="text-[#a1a1aa]">
              修改登入帳號、姓名、角色，或重設密碼
            </DialogDescription>
          </DialogHeader>

          {editManager && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-white">
                  <User className="w-4 h-4 text-[#FF6B35]" />
                  姓名
                </Label>
                <Input
                  value={editManager.name}
                  onChange={(e) => setEditManager({ ...editManager, name: e.target.value })}
                  className="bg-[#27272a]/50 border-[#27272a] text-white placeholder:text-[#52525b] rounded-lg"
                  data-testid="edit-manager-name"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-white">
                  <Mail className="w-4 h-4 text-[#FF6B35]" />
                  登入帳號（電子郵件）
                </Label>
                <Input
                  type="email"
                  value={editManager.email}
                  onChange={(e) => setEditManager({ ...editManager, email: e.target.value })}
                  className="bg-[#27272a]/50 border-[#27272a] text-white placeholder:text-[#52525b] rounded-lg"
                  data-testid="edit-manager-email"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-white">
                  <Lock className="w-4 h-4 text-[#FF6B35]" />
                  新密碼
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={editManager.password}
                    onChange={(e) => setEditManager({ ...editManager, password: e.target.value })}
                    placeholder="留空表示不變更"
                    autoComplete="new-password"
                    className="bg-[#27272a]/50 border-[#27272a] text-white placeholder:text-[#52525b] rounded-lg font-mono"
                    data-testid="edit-manager-password"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditManager({ ...editManager, password: generatePassword() })}
                    className="border-[#27272a] text-[#a1a1aa] hover:bg-[#27272a] hover:text-white rounded-lg shrink-0"
                  >
                    <Wand2 className="w-4 h-4 mr-1" />
                    產生
                  </Button>
                </div>
                <p className="text-xs text-[#71717a]">至少 10 字元，需包含英文與數字。變更後該帳號需重新登入</p>
              </div>

              <div className="space-y-2">
                <Label className="text-white">角色</Label>
                <Select
                  value={editManager.role}
                  onValueChange={(value) => setEditManager({ ...editManager, role: value })}
                >
                  <SelectTrigger className="bg-[#27272a]/50 border-[#27272a] text-white rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#18181b] border-[#27272a] rounded-lg">
                    <SelectItem value="manager" className="text-white hover:bg-[#27272a] focus:bg-[#27272a] focus:text-white">管家</SelectItem>
                    <SelectItem value="admin" className="text-white hover:bg-[#27272a] focus:bg-[#27272a] focus:text-white">管理員</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditManager(null)}
              className="border-[#27272a] text-[#a1a1aa] hover:bg-[#27272a] hover:text-white rounded-lg"
            >
              取消
            </Button>
            <Button
              onClick={handleUpdateManager}
              disabled={savingManager || !editManager?.name || !editManager?.email}
              className="bg-[#FF6B35] hover:bg-[#E55A2B] text-white rounded-full transition-all duration-300"
              data-testid="confirm-edit-manager-btn"
            >
              {savingManager ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              儲存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Manager Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-[#18181b] border-[#27272a] rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">刪除帳號</AlertDialogTitle>
            <AlertDialogDescription className="text-[#a1a1aa]">
              確定要刪除 {deleteTarget?.name}（{deleteTarget?.email}）嗎？刪除後無法登入，此動作無法復原。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#27272a] text-[#a1a1aa] bg-transparent hover:bg-[#27272a] hover:text-white rounded-lg">
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteManager}
              disabled={deletingManager}
              className="bg-red-600 hover:bg-red-700 text-white rounded-lg"
              data-testid="confirm-delete-manager-btn"
            >
              刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
