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
  Shield
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AI_MODELS = [
  { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
  { value: 'gpt-4.1', label: 'GPT-4.1' },
  { value: 'manus-1.6-max', label: 'Manus 1.6 Max' },
  { value: 'manus-1.6', label: 'Manus 1.6' },
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
      setManagers(response.data);
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
      <div className="h-screen flex bg-[#F5F5F0]">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Shield className="w-16 h-16 mx-auto mb-4 text-[#64748B]" />
            <h2 className="text-xl font-semibold text-[#1F2E0E] mb-2">權限不足</h2>
            <p className="text-[#64748B]">只有管理員可以存取設定頁面</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-[#F5F5F0]" data-testid="settings-page">
      <Sidebar />
      
      <div className="flex-1 flex flex-col min-w-0">
        <Header title="系統設定" />

        <div className="flex-1 p-6 overflow-auto">
          <Tabs defaultValue="venues" className="space-y-6">
            <TabsList className="bg-white border border-[#E2E8F0] p-1">
              <TabsTrigger 
                value="venues"
                className="data-[state=active]:bg-[#3D4A2C] data-[state=active]:text-white rounded-sm px-4"
                data-testid="tab-venues"
              >
                <Building2 className="w-4 h-4 mr-2" />
                場域管理
              </TabsTrigger>
              <TabsTrigger 
                value="managers"
                className="data-[state=active]:bg-[#3D4A2C] data-[state=active]:text-white rounded-sm px-4"
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
                  <Card className="border-[#E2E8F0] rounded-sm shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-[#3D4A2C]" />
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
                              className={`p-4 rounded-sm cursor-pointer transition-all duration-200 ${
                                selectedVenue?.id === venue.id
                                  ? 'bg-[#3D4A2C] text-white'
                                  : 'bg-[#F5F5F0] hover:bg-[#EBEBE6] text-[#1F2E0E]'
                              }`}
                              data-testid={`venue-item-${venue.id}`}
                            >
                              <div className="font-medium">{venue.name}</div>
                              <div className={`text-sm mt-1 ${
                                selectedVenue?.id === venue.id ? 'text-white/70' : 'text-[#64748B]'
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
                  <Card className="border-[#E2E8F0] rounded-sm shadow-sm">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <SettingsIcon className="w-5 h-5 text-[#3D4A2C]" />
                            場域設定
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {selectedVenue?.name || '請選擇場域'}
                          </CardDescription>
                        </div>
                        <Button
                          onClick={handleSaveConfig}
                          disabled={saving || !venueConfig}
                          className="bg-[#3D4A2C] hover:bg-[#2C381E] text-white rounded-sm"
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
                          <Loader2 className="w-6 h-6 animate-spin text-[#3D4A2C]" />
                        </div>
                      ) : venueConfig ? (
                        <div className="space-y-6">
                          {/* AI Model */}
                          <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-[#1F2E0E]">
                              <Bot className="w-4 h-4 text-[#3D4A2C]" />
                              AI 模型
                            </Label>
                            <Select
                              value={venueConfig.ai_model || ''}
                              onValueChange={(value) => 
                                setVenueConfig({ ...venueConfig, ai_model: value })
                              }
                            >
                              <SelectTrigger 
                                className="bg-white border-[#E2E8F0] rounded-sm"
                                data-testid="ai-model-select"
                              >
                                <SelectValue placeholder="選擇 AI 模型" />
                              </SelectTrigger>
                              <SelectContent className="bg-white rounded-sm">
                                {AI_MODELS.map((model) => (
                                  <SelectItem key={model.value} value={model.value}>
                                    {model.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Knowledge Base URL */}
                          <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-[#1F2E0E]">
                              <Link className="w-4 h-4 text-[#3D4A2C]" />
                              AI 知識庫 URL
                            </Label>
                            <Input
                              value={venueConfig.ai_knowledge_base_url || ''}
                              onChange={(e) => 
                                setVenueConfig({ ...venueConfig, ai_knowledge_base_url: e.target.value })
                              }
                              placeholder="https://example.com/knowledge-base"
                              className="bg-white border-[#E2E8F0] rounded-sm"
                              data-testid="knowledge-base-input"
                            />
                          </div>

                          <Separator className="bg-[#E2E8F0]" />

                          {/* Raw Config Display */}
                          <div className="space-y-2">
                            <Label className="text-[#64748B]">完整設定（JSON）</Label>
                            <pre className="p-4 bg-[#F5F5F0] rounded-sm text-sm overflow-auto max-h-48 font-mono">
                              {JSON.stringify(venueConfig, null, 2)}
                            </pre>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-12 text-[#64748B]">
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
              <Card className="border-[#E2E8F0] rounded-sm shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Users className="w-5 h-5 text-[#3D4A2C]" />
                        管家團隊
                      </CardTitle>
                      <CardDescription>管理平台管家帳號</CardDescription>
                    </div>
                    <Button
                      onClick={() => setAddManagerOpen(true)}
                      className="bg-[#3D4A2C] hover:bg-[#2C381E] text-white rounded-sm"
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
                      <Loader2 className="w-6 h-6 animate-spin text-[#3D4A2C]" />
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {managers.map((manager) => (
                        <div
                          key={manager.id}
                          className="p-4 bg-[#F5F5F0] rounded-sm border border-[#E2E8F0] hover:shadow-md transition-shadow duration-200"
                          data-testid={`manager-card-${manager.id}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#3D4A2C] flex items-center justify-center flex-shrink-0">
                              <span className="text-white font-medium">
                                {manager.name?.charAt(0) || '?'}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-[#1F2E0E] truncate">
                                  {manager.name}
                                </span>
                                <Badge 
                                  variant="outline" 
                                  className={
                                    manager.role === 'admin' 
                                      ? 'bg-purple-100 text-purple-800 border-purple-200' 
                                      : 'bg-blue-100 text-blue-800 border-blue-200'
                                  }
                                >
                                  {manager.role === 'admin' ? '管理員' : '管家'}
                                </Badge>
                              </div>
                              <p className="text-sm text-[#64748B] truncate mt-1">
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
        <DialogContent className="bg-white rounded-sm">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#1F2E0E]">
              新增管家
            </DialogTitle>
            <DialogDescription className="text-[#64748B]">
              填寫以下資訊以建立新的管家帳號
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="w-4 h-4 text-[#3D4A2C]" />
                姓名
              </Label>
              <Input
                value={newManager.name}
                onChange={(e) => setNewManager({ ...newManager, name: e.target.value })}
                placeholder="輸入姓名"
                className="bg-white border-[#E2E8F0] rounded-sm"
                data-testid="new-manager-name"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#3D4A2C]" />
                電子郵件
              </Label>
              <Input
                type="email"
                value={newManager.email}
                onChange={(e) => setNewManager({ ...newManager, email: e.target.value })}
                placeholder="輸入電子郵件"
                className="bg-white border-[#E2E8F0] rounded-sm"
                data-testid="new-manager-email"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#3D4A2C]" />
                密碼
              </Label>
              <Input
                type="password"
                value={newManager.password}
                onChange={(e) => setNewManager({ ...newManager, password: e.target.value })}
                placeholder="設定密碼"
                className="bg-white border-[#E2E8F0] rounded-sm"
                data-testid="new-manager-password"
              />
            </div>

            <div className="space-y-2">
              <Label>角色</Label>
              <Select
                value={newManager.role}
                onValueChange={(value) => setNewManager({ ...newManager, role: value })}
              >
                <SelectTrigger className="bg-white border-[#E2E8F0] rounded-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white rounded-sm">
                  <SelectItem value="manager">管家</SelectItem>
                  <SelectItem value="admin">管理員</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddManagerOpen(false)}
              className="border-[#E2E8F0] rounded-sm"
            >
              取消
            </Button>
            <Button
              onClick={handleAddManager}
              disabled={addingManager || !newManager.name || !newManager.email || !newManager.password}
              className="bg-[#3D4A2C] hover:bg-[#2C381E] text-white rounded-sm"
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
