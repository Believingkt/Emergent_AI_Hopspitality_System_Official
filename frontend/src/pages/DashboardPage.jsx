import { useState } from 'react';
import { Sidebar } from '../components/layout/Sidebar';
import { Header } from '../components/layout/Header';
import { PerformanceDashboard } from '../components/dashboard/PerformanceDashboard';
import { HandoffAnalysis } from '../components/dashboard/HandoffAnalysis';
import { ManagerSchedule } from '../components/dashboard/ManagerSchedule';
import { AILearningTab } from '../components/dashboard/AILearningTab';
import { useVenue } from '../context/VenueContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ScrollArea } from '../components/ui/scroll-area';
import { 
  Loader2, 
  BarChart3, 
  MessageSquareWarning, 
  Users,
  Building2,
  Menu,
  Brain
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '../components/ui/sheet';

export default function DashboardPage() {
  const { currentVenue, venues, loading: venueLoading } = useVenue();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (venueLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#09090b]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#FF6B35] mx-auto mb-4" />
          <p className="text-[#a1a1aa]">載入場域資料中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-[#09090b]" data-testid="dashboard">
      {/* Sidebar - Hidden on mobile */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <Header title="運營管理中心" />

        {/* Mobile Menu Button */}
        <div className="lg:hidden flex items-center justify-between p-3 border-b border-[#27272a]">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="text-[#a1a1aa]">
                <Menu className="w-5 h-5 mr-2" />
                選單
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 bg-[#18181b] border-[#27272a] p-0">
              <Sidebar />
            </SheetContent>
          </Sheet>
          
          <div className="flex items-center gap-2 text-[#a1a1aa]">
            <Building2 className="w-4 h-4" />
            <span className="text-sm">{currentVenue?.name || '選擇場域'}</span>
          </div>
        </div>

        {/* Main Dashboard Content */}
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            {/* Tab Navigation */}
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="bg-[#18181b] border border-[#27272a] p-1 rounded-xl w-full md:w-auto">
                <TabsTrigger 
                  value="overview"
                  className="data-[state=active]:bg-[#FF6B35] data-[state=active]:text-white text-[#a1a1aa] rounded-lg px-4 transition-all duration-300 flex items-center gap-2"
                  data-testid="tab-overview"
                >
                  <BarChart3 className="w-4 h-4" />
                  <span className="hidden sm:inline">運營概況</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="handoffs"
                  className="data-[state=active]:bg-[#FF6B35] data-[state=active]:text-white text-[#a1a1aa] rounded-lg px-4 transition-all duration-300 flex items-center gap-2"
                  data-testid="tab-handoffs"
                >
                  <MessageSquareWarning className="w-4 h-4" />
                  <span className="hidden sm:inline">轉交分析</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="ai-learning"
                  className="data-[state=active]:bg-[#FF6B35] data-[state=active]:text-white text-[#a1a1aa] rounded-lg px-4 transition-all duration-300 flex items-center gap-2"
                  data-testid="tab-ai-learning"
                >
                  <Brain className="w-4 h-4" />
                  <span className="hidden sm:inline">AI 學習</span>
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="mt-6">
                <PerformanceDashboard venue={currentVenue} />
              </TabsContent>

              {/* Handoff Analysis Tab */}
              <TabsContent value="handoffs" className="mt-6">
                <HandoffAnalysis venue={currentVenue} autoRefresh={true} refreshInterval={300000} />
              </TabsContent>

              {/* AI Learning Tab */}
              <TabsContent value="ai-learning" className="mt-6">
                <AILearningTab />
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
