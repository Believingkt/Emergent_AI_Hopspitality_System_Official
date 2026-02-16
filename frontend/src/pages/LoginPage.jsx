import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import { Loader2, Mail, Lock, AlertCircle, Users, MessageSquare, Zap, CheckCircle2, Sparkles, DollarSign, TrendingUp } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);
    
    if (result.success) {
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 100);
    } else {
      setError(result.error);
      setLoading(false);
    }
  };

  const stats = [
    { value: '96%', label: '成交率', sublabel: '媲美真人客服' },
    { value: '260%', label: '收入成長', sublabel: '實際運營成果' },
    { value: '10萬+', label: '接單經驗', sublabel: 'AI 訓練數據' },
  ];

  const features = [
    { icon: Users, text: '多場域集中管理' },
    { icon: MessageSquare, text: 'LINE 智能真人切換' },
    { icon: Zap, text: 'PMS 庫存直連' },
    { icon: DollarSign, text: '支持動態報價' },
    { icon: TrendingUp, text: '成交率與詢問率分析' },
  ];

  return (
    <div className="min-h-screen flex" data-testid="login-page">
      {/* Left Panel - Brand & Value Proposition */}
      <div className="hidden lg:flex lg:w-3/5 relative bg-[#09090b] overflow-hidden">
        {/* Animated Background Grid */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: `linear-gradient(rgba(255, 107, 53, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 107, 53, 0.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }} />
        </div>

        {/* Gradient Glow Effects */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-[#FF6B35] opacity-10 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#00B4D8] opacity-10 blur-[120px] rounded-full" />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-16 py-12 w-full">
          {/* Logo */}
          <div className="mb-8">
            <img 
              src="https://customer-assets.emergentagent.com/job_430b19cf-7dc2-4179-a7b4-72c8b0096192/artifacts/6ffwi2v3_%E4%BA%BA%E5%AE%A2%E5%A4%9A%E7%89%B9%E8%A8%B1%E5%8A%A0%E7%9B%9F%E9%A0%AD%E8%B2%BC.png"
              alt="Lakeze 人客多 Logo"
              className="h-16 object-contain"
              data-testid="login-logo"
            />
          </div>

          {/* Main Headline */}
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-[#FF6B35]" />
              <p className="text-[#FF6B35] text-sm font-semibold tracking-[0.2em] uppercase">
                AI × 真人協作
              </p>
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight mb-6" style={{ fontFamily: 'Manrope, sans-serif' }}>
              AI 智能接單<br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF6B35] to-[#00B4D8]">您專心經營品牌</span>
            </h1>
            <p className="text-xl text-white/70 leading-relaxed max-w-lg">
              源自 <span className="text-white font-semibold">10 萬筆以上成交訂單</span> 的真實接單經驗，
              真人 × AI 協作，<span className="text-[#00B4D8] font-medium">讓成交率持續成長</span>。
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-12">
            {stats.map((stat, index) => (
              <div 
                key={index}
                className="text-center p-5 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 hover:border-[#FF6B35]/40 transition-all duration-300 card-hover"
              >
                <div className="text-3xl font-bold text-[#FF6B35] mb-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {stat.value}
                </div>
                <div className="text-white font-medium text-sm">{stat.label}</div>
                <div className="text-white/50 text-xs mt-1">{stat.sublabel}</div>
              </div>
            ))}
          </div>

          {/* Features */}
          <div className="flex flex-wrap gap-3">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/5 rounded-full border border-white/10 hover:border-[#00B4D8]/50 transition-all duration-300"
              >
                <feature.icon className="w-4 h-4 text-[#00B4D8]" />
                <span className="text-white/90 text-sm font-medium">{feature.text}</span>
              </div>
            ))}
          </div>

          {/* Bottom Tagline */}
          <div className="mt-12 pt-8 border-t border-white/10">
            <p className="text-white/40 text-sm">
              由旅宿業經營者打造 — 從場域設計、運營到客服，我們實戰出真知
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[#09090b]">
        <div className="w-full max-w-md">
          {/* Mobile Hero */}
          <div className="lg:hidden mb-8 text-center">
            <img 
              src="https://customer-assets.emergentagent.com/job_430b19cf-7dc2-4179-a7b4-72c8b0096192/artifacts/k9ookbrh_%E4%BA%BA%E5%AE%A2%E5%A4%9Alogo%20%281%29.png"
              alt="Lakeze 人客多 Logo"
              className="h-12 mx-auto mb-4"
            />
            <h2 className="text-xl font-bold text-white mb-2">AI 智能接單，您專心經營品牌</h2>
            <p className="text-[#a1a1aa] text-sm">10萬筆經驗訓練 · 96% 成交率</p>
          </div>

          <Card className="border border-[#27272a] shadow-2xl bg-[#18181b] rounded-xl overflow-hidden">
            <CardContent className="p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  管家登入
                </h2>
                <p className="text-[#a1a1aa] mt-1">進入多場域管理後台</p>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div 
                    className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm animate-fade-in"
                    data-testid="login-error"
                  >
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white font-medium">
                    電子郵件
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a1a1aa]" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-12 bg-[#27272a]/50 border-[#27272a] text-white placeholder:text-[#52525b] focus:border-[#FF6B35] focus:ring-[#FF6B35] rounded-lg"
                      data-testid="login-email-input"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-white font-medium">
                    密碼
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a1a1aa]" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 h-12 bg-[#27272a]/50 border-[#27272a] text-white placeholder:text-[#52525b] focus:border-[#FF6B35] focus:ring-[#FF6B35] rounded-lg"
                      data-testid="login-password-input"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-[#FF6B35] hover:bg-[#E55A2B] text-white font-semibold rounded-full shadow-lg btn-glow transition-all duration-300"
                  data-testid="login-submit-btn"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      登入中...
                    </>
                  ) : (
                    '進入管理後台'
                  )}
                </Button>
              </form>

              {/* Trust Badges */}
              <div className="mt-8 pt-6 border-t border-[#27272a]">
                <div className="flex items-center justify-center gap-6 text-xs text-[#a1a1aa]">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#22c55e]" />
                    <span>SSL 加密</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#22c55e]" />
                    <span>資料保護</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#22c55e]" />
                    <span>24/7 監控</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-xs text-[#52525b]">
            © 2025 Lakeze 人客多. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
