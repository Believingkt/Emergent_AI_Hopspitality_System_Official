import { useMemo } from 'react';
import { Badge } from '../ui/badge';
import { 
  AlertTriangle,
  MessageSquareX,
  Brain,
  MessageCircle,
  Lightbulb
} from 'lucide-react';

// 模擬未成交原因（有來詢問但沒有付訂金或沒有訂房）
const generateLostReasons = () => ({
  description: '分析來自 LINE OA 有詢問但最終未付訂金或未訂房的對話',
  reasons: [
    { 
      reason: '價格考慮', 
      count: 28, 
      percentage: 35,
      aiAnalysis: 'AI 從對話中發現客戶多次詢問是否有優惠，或表示「再考慮看看」',
      suggestion: '可主動提供限時早鳥優惠或連住折扣，降低價格門檻'
    },
    { 
      reason: '日期沒空房', 
      count: 22, 
      percentage: 27.5,
      aiAnalysis: 'AI 偵測到客戶指定的日期已滿房，對話在告知無空房後結束',
      suggestion: '建議推薦相近日期或候補名單機制，避免流失潛在客戶'
    },
    { 
      reason: '只是詢問/比價', 
      count: 18, 
      percentage: 22.5,
      aiAnalysis: 'AI 發現客戶只問了價格或房型，沒有進一步詢問預約方式',
      suggestion: '可在報價後主動詢問入住需求，引導進入預約流程'
    },
    { 
      reason: '特殊需求無法滿足', 
      count: 8, 
      percentage: 10,
      aiAnalysis: 'AI 識別出客戶有寵物、加床、特殊飲食等需求，但無法滿足',
      suggestion: '評估是否能擴展服務範圍，或提供替代方案'
    },
    { 
      reason: '對話中斷/未回覆', 
      count: 4, 
      percentage: 5,
      aiAnalysis: 'AI 發現對話在詢問過程中突然中斷，客戶未再回覆',
      suggestion: '可設定 24 小時後自動發送關懷訊息，重新建立聯繫'
    },
  ],
  topQuestions: [
    { question: '有沒有空房？', count: 89 },
    { question: '價格多少？', count: 76 },
    { question: '可以帶寵物嗎？', count: 34 },
    { question: '有停車場嗎？', count: 28 },
    { question: '早餐包含嗎？', count: 25 },
  ],
  totalLost: 80,
  couldBeConverted: 35,
});

export const AlertsAndAnalysisDashboard = () => {
  const lostData = useMemo(() => generateLostReasons(), []);
  
  return (
    <div className="bg-[#0d1117] rounded-2xl p-6 border-2 border-[#27272a]">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
          <MessageSquareX className="w-5 h-5 text-red-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">未成交分析</h3>
          <p className="text-sm text-[#8b949e]">有來詢問但沒有付訂金或沒有訂房</p>
        </div>
      </div>
      
      {/* 說明 */}
      <div className="mb-6 p-3 bg-[#1a1f26] rounded-lg">
        <div className="flex items-start gap-2">
          <MessageCircle className="w-4 h-4 text-[#8b949e] mt-0.5" />
          <p className="text-xs text-[#8b949e]">{lostData.description}</p>
        </div>
      </div>
      
      {/* 流失原因與 AI 分析 */}
      <div className="space-y-4 mb-6">
        {lostData.reasons.map((item, idx) => (
          <div key={idx} className="bg-[#1a1f26] rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-white font-medium">{item.reason}</span>
                <Badge className="bg-red-500/15 text-red-400 border-0 text-xs">
                  {item.count} 則 ({item.percentage}%)
                </Badge>
              </div>
            </div>
            
            {/* 進度條 */}
            <div className="h-1.5 bg-[#27272a] rounded-full overflow-hidden mb-3">
              <div 
                className="h-full bg-gradient-to-r from-red-500 to-amber-500 rounded-full"
                style={{ width: `${item.percentage}%` }}
              />
            </div>
            
            {/* AI 分析 */}
            <div className="text-xs text-[#8b949e] mb-2">
              <span className="text-[#00B4D8]">AI 分析：</span> {item.aiAnalysis}
            </div>
            
            {/* 建議 */}
            <div className="flex items-start gap-2 p-2 bg-[#22c55e]/10 rounded-lg">
              <Lightbulb className="w-3.5 h-3.5 text-[#22c55e] mt-0.5 flex-shrink-0" />
              <p className="text-xs text-[#22c55e]">{item.suggestion}</p>
            </div>
          </div>
        ))}
      </div>
      
      {/* 熱門問題 */}
      <div className="bg-[#1a1f26] rounded-xl p-4 mb-4">
        <h4 className="text-sm font-medium text-white mb-3">未成交客戶最常詢問</h4>
        <div className="space-y-2">
          {lostData.topQuestions.slice(0, 5).map((item, idx) => (
            <div key={idx} className="flex items-center justify-between text-sm">
              <span className="text-[#8b949e]">{idx + 1}. {item.question}</span>
              <Badge variant="outline" className="border-[#27272a] text-[#8b949e]">
                {item.count} 次
              </Badge>
            </div>
          ))}
        </div>
      </div>
      
      {/* 可挽回提示 */}
      <div className="bg-[#00B4D8]/10 rounded-xl p-4 mb-4 border border-[#00B4D8]/20">
        <div className="flex items-center gap-2 mb-2">
          <Brain className="w-4 h-4 text-[#00B4D8]" />
          <h4 className="text-sm font-medium text-[#00B4D8]">AI 綜合建議</h4>
        </div>
        <p className="text-sm text-[#c9d1d9]">
          根據對話分析，預估有 <span className="font-bold text-[#22c55e]">{lostData.couldBeConverted}</span> 位客戶可透過主動跟進或提供優惠方案挽回。
          建議優先處理「價格考慮」和「日期沒空房」這兩類客戶。
        </p>
      </div>
      
      {/* AI 警示 */}
      <div className="flex items-center gap-2 text-xs text-[#52525b]">
        <AlertTriangle className="w-3 h-3" />
        <span>AI 依據對話上下文分析，僅供參考，請自行判斷實際情況</span>
      </div>
    </div>
  );
};
