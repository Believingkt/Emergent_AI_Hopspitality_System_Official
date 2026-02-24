import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useVenue } from '../../context/VenueContext';
import { 
  BookOpen,
  Plus,
  Loader2,
  X,
  Pencil,
  Trash2,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Bot,
  User,
  BarChart3,
  Tag,
  FileText,
  AlertTriangle,
  Upload,
  FileUp,
  Sparkles,
  ArrowRight,
  Lightbulb
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// 分類對照表
const CATEGORIES = {
  pricing: { label: '價格', color: 'text-[#22c55e]', bgColor: 'bg-[#22c55e]/15', borderColor: 'border-[#22c55e]/30' },
  facility: { label: '設施', color: 'text-[#00B4D8]', bgColor: 'bg-[#00B4D8]/15', borderColor: 'border-[#00B4D8]/30' },
  rules: { label: '規則', color: 'text-[#FF6B35]', bgColor: 'bg-[#FF6B35]/15', borderColor: 'border-[#FF6B35]/30' },
  dining: { label: '餐飲', color: 'text-amber-400', bgColor: 'bg-amber-500/15', borderColor: 'border-amber-500/30' },
  service: { label: '服務', color: 'text-[#8B5CF6]', bgColor: 'bg-[#8B5CF6]/15', borderColor: 'border-[#8B5CF6]/30' },
  location: { label: '交通位置', color: 'text-pink-400', bgColor: 'bg-pink-500/15', borderColor: 'border-pink-500/30' },
  other: { label: '其他', color: 'text-[#a1a1aa]', bgColor: 'bg-[#27272a]', borderColor: 'border-[#27272a]' },
};

// 知識卡片組件
const KnowledgeCard = ({ item, onEdit, onDelete }) => {
  const category = CATEGORIES[item.category] || CATEGORIES.other;
  
  return (
    <div 
      className="bg-[#0d1117] rounded-xl border-2 border-[#27272a] p-4 hover:border-[#3f3f46] transition-all group"
      data-testid={`knowledge-card-${item.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* 標題和分類 */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h4 className="text-white font-medium truncate">{item.title}</h4>
            <Badge className={`${category.bgColor} ${category.color} ${category.borderColor} text-xs shrink-0`}>
              {category.label}
            </Badge>
            {/* 來源標籤 */}
            <Badge 
              variant="outline" 
              className={`text-xs shrink-0 ${
                item.source_type === 'manual' 
                  ? 'border-[#8B5CF6]/30 text-[#8B5CF6] bg-[#8B5CF6]/10' 
                  : 'border-[#00B4D8]/30 text-[#00B4D8] bg-[#00B4D8]/10'
              }`}
            >
              {item.source_type === 'manual' ? (
                <><User className="w-3 h-3 mr-1" />手動</>
              ) : (
                <><Bot className="w-3 h-3 mr-1" />AI萃取</>
              )}
            </Badge>
          </div>
          
          {/* 內容預覽 */}
          <p className="text-[#8b949e] text-sm line-clamp-2 mb-2">{item.content}</p>
          
          {/* 狀態和時間 */}
          <div className="flex items-center gap-3 text-xs text-[#52525b]">
            <span className={`flex items-center gap-1 ${item.is_active ? 'text-[#22c55e]' : 'text-red-400'}`}>
              {item.is_active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
              {item.is_active ? '生效中' : '已停用'}
            </span>
            {item.ai_confidence !== undefined && item.ai_confidence !== 1.0 && (
              <span>信心度: {(item.ai_confidence * 100).toFixed(0)}%</span>
            )}
            <span>{item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}</span>
          </div>
        </div>
        
        {/* 操作按鈕 */}
        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(item)}
            className="h-8 w-8 p-0 text-[#8b949e] hover:text-white hover:bg-[#27272a]"
            data-testid={`edit-btn-${item.id}`}
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(item)}
            className="h-8 w-8 p-0 text-[#8b949e] hover:text-red-400 hover:bg-red-500/10"
            data-testid={`delete-btn-${item.id}`}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

// 統計卡片組件
const StatCard = ({ icon: Icon, label, value, subValue, color }) => (
  <div className="bg-[#0d1117] rounded-xl border border-[#27272a] p-4">
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-[#8b949e] text-xs">{label}</p>
        <p className="text-white text-xl font-bold">{value}</p>
        {subValue && <p className="text-[#52525b] text-xs">{subValue}</p>}
      </div>
    </div>
  </div>
);

export const KnowledgeManagementTab = () => {
  const { token } = useAuth();
  const { currentVenue } = useVenue();
  const [knowledge, setKnowledge] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  
  // 篩選狀態
  const [statusFilter, setStatusFilter] = useState('active');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // 表單狀態
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({ title: '', content: '', category: 'other' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // PDF 上傳狀態
  const [showPdfDialog, setShowPdfDialog] = useState(false);
  const [pdfFile, setPdfFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const pdfInputRef = useRef(null);
  
  const venueId = currentVenue?.id || 'sensan_inn';

  // 載入知識列表
  const fetchKnowledge = async () => {
    if (!token) return;
    setIsLoading(true);
    
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      params.append('limit', '100');
      
      const response = await axios.get(
        `${API_URL}/api/venues/${venueId}/knowledge?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setKnowledge(response.data.knowledge_items || response.data.knowledge || []);
    } catch (err) {
      console.error('Failed to fetch knowledge:', err);
      toast.error('載入知識列表失敗');
    } finally {
      setIsLoading(false);
    }
  };

  // 載入統計數據
  const fetchStats = async () => {
    if (!token) return;
    setIsLoadingStats(true);
    
    try {
      const response = await axios.get(
        `${API_URL}/api/venues/${venueId}/knowledge/stats`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStats(response.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
      // 統計 API 失敗不顯示錯誤，使用本地計算
    } finally {
      setIsLoadingStats(false);
    }
  };

  // 初始載入
  useEffect(() => {
    fetchKnowledge();
    fetchStats();
  }, [token, venueId, statusFilter, categoryFilter]);

  // 新增知識
  const handleAdd = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('請填寫標題和內容');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await axios.post(
        `${API_URL}/api/venues/${venueId}/knowledge`,
        {
          title: formData.title,
          content: formData.content,
          category: formData.category
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('知識新增成功！');
      setShowAddDialog(false);
      setFormData({ title: '', content: '', category: 'other' });
      fetchKnowledge();
      fetchStats();
    } catch (err) {
      console.error('Failed to add knowledge:', err);
      toast.error('新增失敗：' + (err.response?.data?.detail || err.response?.data?.error || '請稍後再試'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // 編輯知識
  const handleEdit = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('請填寫標題和內容');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await axios.put(
        `${API_URL}/api/venues/${venueId}/knowledge/${selectedItem.id}`,
        {
          title: formData.title,
          content: formData.content,
          category: formData.category
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('知識更新成功！');
      setShowEditDialog(false);
      setSelectedItem(null);
      fetchKnowledge();
    } catch (err) {
      console.error('Failed to edit knowledge:', err);
      toast.error('更新失敗：' + (err.response?.data?.detail || err.response?.data?.error || '請稍後再試'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // 停用知識
  const handleDelete = async () => {
    setIsSubmitting(true);
    try {
      await axios.delete(
        `${API_URL}/api/venues/${venueId}/knowledge/${selectedItem.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('知識已停用');
      setShowDeleteDialog(false);
      setSelectedItem(null);
      fetchKnowledge();
      fetchStats();
    } catch (err) {
      console.error('Failed to delete knowledge:', err);
      toast.error('停用失敗：' + (err.response?.data?.detail || err.response?.data?.error || '請稍後再試'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // 開啟編輯對話框
  const openEditDialog = (item) => {
    setSelectedItem(item);
    setFormData({
      title: item.title,
      content: item.content,
      category: item.category || 'other'
    });
    setShowEditDialog(true);
  };

  // 開啟刪除確認
  const openDeleteDialog = (item) => {
    setSelectedItem(item);
    setShowDeleteDialog(true);
  };

  // PDF 上傳處理
  const handlePdfUpload = async (file) => {
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast.error('只支援 PDF 格式的檔案');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('檔案大小不能超過 10MB');
      return;
    }
    
    setPdfFile(file);
    setIsUploading(true);
    setUploadResult(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await axios.post(
        `${API_URL}/api/venues/${venueId}/knowledge/upload-pdf`,
        formData,
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          },
          timeout: 60000
        }
      );
      
      setUploadResult(response.data);
      toast.success(`成功從 PDF 提取 ${response.data.total_extracted} 條知識！`);
      fetchKnowledge();
      fetchStats();
    } catch (err) {
      const errMsg = err.response?.data?.detail || '上傳失敗，請稍後再試';
      toast.error(errMsg);
      setUploadResult({ error: errMsg });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handlePdfUpload(file);
  }, [venueId, token]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  // 過濾後的知識列表
  const filteredKnowledge = knowledge.filter(item => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return item.title?.toLowerCase().includes(query) || 
             item.content?.toLowerCase().includes(query);
    }
    return true;
  });

  // 計算本地統計（當 API 不可用時）
  const localStats = {
    total: knowledge.length,
    active: knowledge.filter(k => k.is_active).length,
    manual: knowledge.filter(k => k.source_type === 'manual').length,
    ai: knowledge.filter(k => k.source_type !== 'manual').length,
  };

  const displayStats = stats?.overall || localStats;

  return (
    <div className="space-y-6" data-testid="knowledge-management-tab">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-3" style={{ fontFamily: 'Manrope, sans-serif' }}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#22c55e] to-[#00B4D8] flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            知識管理
            {isLoading && <Loader2 className="w-4 h-4 animate-spin text-[#FF6B35]" />}
          </h2>
          <p className="text-[#8b949e] mt-1 text-sm">管理場域知識庫，讓 AI 更了解您的業務</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { fetchKnowledge(); fetchStats(); }}
            className="border-[#27272a] text-[#8b949e] hover:text-white"
            data-testid="refresh-btn"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            重新整理
          </Button>
          <Button
            onClick={() => {
              setPdfFile(null);
              setUploadResult(null);
              setShowPdfDialog(true);
            }}
            variant="outline"
            className="border-[#8B5CF6]/30 text-[#8B5CF6] hover:bg-[#8B5CF6]/10 hover:text-[#8B5CF6]"
            data-testid="upload-pdf-btn"
          >
            <FileUp className="w-4 h-4 mr-2" />
            上傳 PDF
          </Button>
          <Button
            onClick={() => {
              setFormData({ title: '', content: '', category: 'other' });
              setShowAddDialog(true);
            }}
            className="bg-[#22c55e] hover:bg-[#16a34a] text-white"
            data-testid="add-knowledge-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            新增知識
          </Button>
        </div>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          icon={FileText} 
          label="總知識數" 
          value={displayStats.total || 0}
          color="bg-[#FF6B35]"
        />
        <StatCard 
          icon={CheckCircle2} 
          label="生效中" 
          value={displayStats.active_count || displayStats.active || 0}
          color="bg-[#22c55e]"
        />
        <StatCard 
          icon={User} 
          label="手動新增" 
          value={displayStats.manual_count || displayStats.manual || 0}
          color="bg-[#8B5CF6]"
        />
        <StatCard 
          icon={Bot} 
          label="AI 萃取" 
          value={displayStats.ai_extracted_count || displayStats.ai || 0}
          color="bg-[#00B4D8]"
        />
      </div>

      {/* 篩選和搜尋 */}
      <div className="bg-[#0d1117] rounded-xl border border-[#27272a] p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* 搜尋 */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#52525b]" />
            <Input
              placeholder="搜尋知識標題或內容..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-[#18181b] border-[#27272a] text-white"
              data-testid="search-input"
            />
          </div>
          
          {/* 狀態篩選 */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[140px] bg-[#18181b] border-[#27272a] text-white" data-testid="status-filter">
              <Filter className="w-4 h-4 mr-2 text-[#52525b]" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#18181b] border-[#27272a]">
              <SelectItem value="all" className="text-white hover:bg-[#27272a] focus:bg-[#27272a] focus:text-white">全部狀態</SelectItem>
              <SelectItem value="active" className="text-white hover:bg-[#27272a] focus:bg-[#27272a] focus:text-white">生效中</SelectItem>
              <SelectItem value="inactive" className="text-white hover:bg-[#27272a] focus:bg-[#27272a] focus:text-white">已停用</SelectItem>
            </SelectContent>
          </Select>
          
          {/* 分類篩選 */}
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full md:w-[140px] bg-[#18181b] border-[#27272a] text-white" data-testid="category-filter">
              <Tag className="w-4 h-4 mr-2 text-[#52525b]" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#18181b] border-[#27272a]">
              <SelectItem value="all" className="text-white hover:bg-[#27272a] focus:bg-[#27272a] focus:text-white">全部分類</SelectItem>
              {Object.entries(CATEGORIES).map(([key, cat]) => (
                <SelectItem key={key} value={key} className="text-white hover:bg-[#27272a] focus:bg-[#27272a] focus:text-white">
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 知識列表 */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-[#FF6B35]" />
          <p className="text-[#8b949e]">正在載入知識庫...</p>
        </div>
      ) : filteredKnowledge.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 space-y-4 bg-[#0d1117] rounded-2xl border-2 border-[#27272a]">
          <BookOpen className="w-16 h-16 text-[#27272a]" />
          <p className="text-[#8b949e] text-lg">
            {searchQuery ? '找不到符合條件的知識' : '目前沒有知識資料'}
          </p>
          <Button
            onClick={() => {
              setFormData({ title: '', content: '', category: 'other' });
              setShowAddDialog(true);
            }}
            variant="outline"
            className="border-[#22c55e] text-[#22c55e] hover:bg-[#22c55e]/10"
          >
            <Plus className="w-4 h-4 mr-2" />
            新增第一條知識
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" data-testid="knowledge-list">
          {filteredKnowledge.map(item => (
            <KnowledgeCard
              key={item.id}
              item={item}
              onEdit={openEditDialog}
              onDelete={openDeleteDialog}
            />
          ))}
        </div>
      )}

      {/* 新增知識對話框 */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-[#18181b] border-[#27272a] text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#22c55e]" />
              新增知識
            </DialogTitle>
            <DialogDescription className="text-[#8b949e]">
              手動新增的知識會自動生效
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm text-[#a1a1aa]">標題 *</label>
              <Input
                placeholder="輸入知識標題"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="bg-[#0d1117] border-[#27272a] text-white"
                data-testid="title-input"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm text-[#a1a1aa]">內容 *</label>
              <Textarea
                placeholder="輸入知識內容..."
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="bg-[#0d1117] border-[#27272a] text-white min-h-[150px]"
                data-testid="content-input"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm text-[#a1a1aa]">分類</label>
              <Select 
                value={formData.category} 
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger className="bg-[#0d1117] border-[#27272a] text-white" data-testid="category-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#18181b] border-[#27272a]">
                  {Object.entries(CATEGORIES).map(([key, cat]) => (
                    <SelectItem key={key} value={key} className="text-white hover:bg-[#27272a] focus:bg-[#27272a] focus:text-white">
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowAddDialog(false)}
              className="text-[#8b949e] hover:text-white"
            >
              取消
            </Button>
            <Button
              onClick={handleAdd}
              disabled={isSubmitting}
              className="bg-[#22c55e] hover:bg-[#16a34a] text-white"
              data-testid="submit-add-btn"
            >
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />新增中...</>
              ) : (
                <><Plus className="w-4 h-4 mr-2" />新增知識</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 編輯知識對話框 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-[#18181b] border-[#27272a] text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-[#00B4D8]" />
              編輯知識
            </DialogTitle>
            <DialogDescription className="text-[#8b949e]">
              修改知識內容
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm text-[#a1a1aa]">標題 *</label>
              <Input
                placeholder="輸入知識標題"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="bg-[#0d1117] border-[#27272a] text-white"
                data-testid="edit-title-input"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm text-[#a1a1aa]">內容 *</label>
              <Textarea
                placeholder="輸入知識內容..."
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="bg-[#0d1117] border-[#27272a] text-white min-h-[150px]"
                data-testid="edit-content-input"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm text-[#a1a1aa]">分類</label>
              <Select 
                value={formData.category} 
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger className="bg-[#0d1117] border-[#27272a] text-white" data-testid="edit-category-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#18181b] border-[#27272a]">
                  {Object.entries(CATEGORIES).map(([key, cat]) => (
                    <SelectItem key={key} value={key} className="text-white hover:bg-[#27272a] focus:bg-[#27272a] focus:text-white">
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowEditDialog(false)}
              className="text-[#8b949e] hover:text-white"
            >
              取消
            </Button>
            <Button
              onClick={handleEdit}
              disabled={isSubmitting}
              className="bg-[#00B4D8] hover:bg-[#0096b4] text-white"
              data-testid="submit-edit-btn"
            >
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />儲存中...</>
              ) : (
                <><CheckCircle2 className="w-4 h-4 mr-2" />儲存修改</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 刪除確認對話框 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-[#18181b] border-[#27272a]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              確認停用知識
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#8b949e]">
              停用後，此知識將不再被 AI 使用。您可以稍後重新啟用。
              <br />
              <span className="text-white font-medium mt-2 block">「{selectedItem?.title}」</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-[#27272a] text-[#8b949e] hover:text-white hover:bg-[#27272a]">
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isSubmitting}
              className="bg-red-500 hover:bg-red-600 text-white"
              data-testid="confirm-delete-btn"
            >
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />停用中...</>
              ) : (
                '確認停用'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Footer Note */}
      <div className="flex items-center gap-2 text-xs text-[#52525b]">
        <AlertTriangle className="w-3 h-3" />
        <span>知識變更後，AI 會在下次對話時自動套用新內容</span>
      </div>
    </div>
  );
};
