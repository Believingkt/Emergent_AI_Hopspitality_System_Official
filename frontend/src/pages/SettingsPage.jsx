import { useState, useEffect } from 'react';
import axios from 'axios';
import { Sidebar } from '../components/layout/Sidebar';
import { Header } from '../components/layout/Header';
import { useAuth } from '../context/AuthContext';
import { useVenue } from '../context/VenueContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { Separator } from '../components/ui/separator';
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
  Eye,
  EyeOff,
  Pencil,
  X,
  Check,
  MessageSquare,
  Key
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// LINE OA 憑證安全輸入組件
const SecureCredentialField = ({ 
  label, 
  value, 
  onChange, 
  isEditing, 
  placeholder,
  icon: Icon,
  description
}) => {
  const [isVisible, setIsVisible] = useState(false);
  
  const maskValue = (val) => {
    if (!val) return '';
    if (val.length <= 8) return '••••••••';
    return val.slice(0, 4) + '••••••••' + val.slice(-4);
  };
  
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2 text-white">
        {Icon && <Icon className="w-4 h-4 text-[#00B4D8]" />}
        {label}
      </Label>
      <div className="relative">
        {isEditing ? (
          <Input
            type={isVisible ? 'text' : 'password'}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="bg-[#27272a]/50 border-[#27272a] text-white rounded-lg pr-10"
          />
        ) : (
          <div className="flex items-center gap-2 bg-[#27272a]/30 border border-[#27272a] rounded-lg px-3 py-2">
            <span className="text-white font-mono text-sm flex-1">
              {isVisible ? (value || '未設定') : maskValue(value)}
            </span>
          </div>
        )}
        {value && (
          <button
            type="button"
            onClick={() => setIsVisible(!isVisible)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b949e] hover:text-white transition-colors"
          >
            {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
      {description && (
        <p className="text-xs text-[#52525b]">{description}</p>
      )}
    </div>
  );
};

// LINE OA 憑證管理區塊
const LineOACredentials = ({ venueId, token }) => {
  const [credentials, setCredentials] = useState({
    channel_access_token: '',
    user_id: '',
    channel_id: '',
    channel_secret: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [originalCredentials, setOriginalCredentials] = useState(null);
  
  // 載入憑證
  useEffect(() => {
    const loadCredentials = async () => {
      if (!venueId || !token) return;
      setIsLoading(true);
      try {
        const response = await axios.get(`${API_URL}/api/venues/${venueId}/line-credentials`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = response.data.credentials || {};
        setCredentials({
          channel_access_token: data.channel_access_token || '',
          user_id: data.user_id || '',
          channel_id: data.channel_id || '',
          channel_secret: data.channel_secret || ''
        });
        setOriginalCredentials({
          channel_access_token: data.channel_access_token || '',
          user_id: data.user_id || '',
          channel_id: data.channel_id || '',
          channel_secret: data.channel_secret || ''
        });
      } catch (error) {
        // API 可能尚未實作，使用本地儲存作為備用
        console.log('Using local storage for credentials');
        const stored = localStorage.getItem(`line_credentials_${venueId}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          setCredentials(parsed);
          setOriginalCredentials(parsed);
        }
      } finally {
        setIsLoading(false);
      }
    };
    loadCredentials();
  }, [venueId, token]);
  
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // 嘗試透過 API 儲存
      await axios.put(
        `${API_URL}/api/venues/${venueId}/line-credentials`,
        credentials,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('LINE OA 憑證已更新');
    } catch (error) {
      // API 可能尚未實作，使用本地儲存作為備用
      console.log('Using local storage to save credentials');
      localStorage.setItem(`line_credentials_${venueId}`, JSON.stringify(credentials));
      toast.success('LINE OA 憑證已儲存（本地）');
    } finally {
      setOriginalCredentials({ ...credentials });
      setIsEditing(false);
      setIsSaving(false);
    }
  };
  
  const handleCancel = () => {
    setCredentials({ ...originalCredentials });
    setIsEditing(false);
  };
  
  const hasChanges = JSON.stringify(credentials) !== JSON.stringify(originalCredentials);
  const hasAnyCredential = Object.values(credentials).some(v => v);
  
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
            onClick={() => setIsEditing(true)}
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
      
      {/* 狀態指示 */}
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
      
      <Separator className="bg-[#27272a]" />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SecureCredentialField
          label="Channel Access Token"
          value={credentials.channel_access_token}
          onChange={(val) => setCredentials({ ...credentials, channel_access_token: val })}
          isEditing={isEditing}
          placeholder="輸入 Channel Access Token"
          icon={Key}
          description="LINE Developers Console 中的長效 Token"
        />
        
        <SecureCredentialField
          label="User ID"
          value={credentials.user_id}
          onChange={(val) => setCredentials({ ...credentials, user_id: val })}
          isEditing={isEditing}
          placeholder="輸入 User ID"
          icon={User}
          description="LINE 用戶識別碼（U 開頭）"
        />
        
        <SecureCredentialField
          label="Channel ID"
          value={credentials.channel_id}
          onChange={(val) => setCredentials({ ...credentials, channel_id: val })}
          isEditing={isEditing}
          placeholder="輸入 Channel ID"
          icon={Shield}
          description="Messaging API 的 Channel ID（數字）"
        />
        
        <SecureCredentialField
          label="Channel Secret"
          value={credentials.channel_secret}
          onChange={(val) => setCredentials({ ...credentials, channel_secret: val })}
          isEditing={isEditing}
          placeholder="輸入 Channel Secret"
          icon={Lock}
          description="用於驗證 Webhook 請求的密鑰"
        />
      </div>
      
      {/* 安全提示 */}
      <div className="bg-[#27272a]/30 rounded-lg p-3 mt-4">
        <div className="flex items-start gap-2">
          <Shield className="w-4 h-4 text-[#00B4D8] mt-0.5 flex-shrink-0" />
          <div className="text-xs text-[#8b949e]">
            <p className="font-medium text-white mb-1">安全提示</p>
            <ul className="space-y-1">
              <li>• 憑證僅在點擊眼睛圖示時顯示完整內容</li>
              <li>• 修改前請確保您有正確的憑證資訊</li>
              <li>• 這些憑證用於連接您的 LINE Official Account</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

const AI_MODELS = [
  { value: 'T1', label: 'T1 - 接單導向（預設）', description: '專注於銷售成交，積極引導客戶下訂', available: true },
  { value: 'T2', label: 'T2 - 客服導向', description: '側重客戶服務，耐心解答問題', available: false, requiresUpgrade: true },
  { value: 'T3', label: 'T3 - 平衡模式', description: '兼顧銷售與服務的平衡策略', available: false, requiresUpgrade: true },
];

export default function SettingsPage() {
  const { token, isAdmin } = useAuth();
  const { venues, getVenueConfig, updateVenueConfig, fetchVenues } = useVenue();
  
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [venueConfig, setVenueConfig] = useState(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [managers, setManagers] = useState([]);
  const [managersLoading, setManagersLoading] = useState(false);
  const [addManagerOpen, setAddManagerOpen] = useState(false);
  const [newManager, setNewManager] = useState({ name: '', email: '', password: '', role: 'manager' });
  const [addingManager, setAddingManager] = useState(false);

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
    setConfigLoading(true);
    const config = await getVenueConfig(venue.id);
    setVenueConfig(config);
    setConfigLoading(false);
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
                      <ScrollArea className="h-[400px]">
                        <div className="space-y-2">
                          {venues.map((venue) => (
                            <div
                              key={venue.id}
                              onClick={() => handleVenueSelect(venue)}
                              className={`p-4 rounded-lg cursor-pointer transition-all duration-300 ${
                                selectedVenue?.id === venue.id
                                  ? 'bg-[#FF6B35] text-white'
                                  : 'bg-[#27272a]/50 hover:bg-[#27272a] text-white'
                              }`}
                              data-testid={`venue-item-${venue.id}`}
                            >
                              <div className="font-medium">{venue.name}</div>
                              <div className={`text-sm mt-1 ${
                                selectedVenue?.id === venue.id ? 'text-white/70' : 'text-[#a1a1aa]'
                              }`}>
                                ID: {venue.id}
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>

                {/* Venue Config */}
                <div className="col-span-8">
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

                          <Separator className="bg-[#27272a]" />

                          {/* Raw Config Display */}
                          <div className="space-y-2">
                            <Label className="text-[#a1a1aa]">完整設定（JSON）</Label>
                            <pre className="p-4 bg-[#27272a]/50 rounded-lg text-sm overflow-auto max-h-48 font-mono text-[#00B4D8] border border-[#27272a]">
                              {JSON.stringify(venueConfig, null, 2)}
                            </pre>
                          </div>
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
                          key={manager.id}
                          className="p-4 bg-[#27272a]/50 rounded-xl border border-[#27272a] hover:border-[#FF6B35]/50 transition-all duration-300"
                          data-testid={`manager-card-${manager.id}`}
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
              <Input
                type="password"
                value={newManager.password}
                onChange={(e) => setNewManager({ ...newManager, password: e.target.value })}
                placeholder="設定密碼"
                className="bg-[#27272a]/50 border-[#27272a] text-white placeholder:text-[#52525b] rounded-lg"
                data-testid="new-manager-password"
              />
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
    </div>
  );
}
