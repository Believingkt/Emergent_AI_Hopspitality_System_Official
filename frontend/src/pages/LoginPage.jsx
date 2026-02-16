import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import { Loader2, Mail, Lock, AlertCircle, Users, MessageSquare, TrendingUp, Zap, CheckCircle2 } from 'lucide-react';

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
    { icon: Zap, text: '直覺協作系統' },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Brand & Value Proposition */}
      <div className="hidden lg:flex lg:w-3/5 relative bg-[#1a1f16] overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E")`
          }} />
        </div>

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a1f16] via-[#2a3424] to-[#1a1f16]" />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-16 py-12 w-full">
          {/* Logo */}
          <div className="mb-8">
            <img 
              src="https://customer-assets.emergentagent.com/job_e6d9fa16-06bf-4039-ab22-a2ae293b4fd7/artifacts/g3viyuio_%E7%B6%B2%E9%A0%81logo.png"
              alt="Lakeze Logo"
              className="h-14 object-contain"
            />
          </div>

          {/* Main Headline */}
          <div className="mb-10">
            <p className="text-[#8B9A7C] text-sm font-medium tracking-[0.2em] uppercase mb-4">
              AI × 真人協作
            </p>
            <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight mb-6" style={{ fontFamily: 'Manrope, sans-serif' }}>
              讓 AI 幫你接單<br/>
              <span className="text-[#C4A962]">你專注成交</span>
            </h1>
            <p className="text-xl text-white/70 leading-relaxed max-w-lg">
              源自 10 萬筆真實接單經驗，打造出不拐彎抹角的 AI 銷售 Agent。
              <span className="text-white font-medium">成交率達真人 96%</span>，省下 Call Center 每月人力成本。
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 mb-12">
            {stats.map((stat, index) => (
              <div 
                key={index}
                className="text-center p-5 bg-white/5 backdrop-blur-sm rounded-sm border border-white/10"
              >
                <div className="text-3xl font-bold text-[#C4A962] mb-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {stat.value}
                </div>
                <div className="text-white font-medium text-sm">{stat.label}</div>
                <div className="text-white/50 text-xs mt-1">{stat.sublabel}</div>
              </div>
            ))}
          </div>

          {/* Features */}
          <div className="flex flex-wrap gap-4">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10"
              >
                <feature.icon className="w-4 h-4 text-[#C4A962]" />
                <span className="text-white/80 text-sm">{feature.text}</span>
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
      <div className="flex-1 flex items-center justify-center p-8 bg-[#F5F5F0]">
        <div className="w-full max-w-md">
          {/* Mobile Hero */}
          <div className="lg:hidden mb-8 text-center">
            <img 
              src="https://customer-assets.emergentagent.com/job_e6d9fa16-06bf-4039-ab22-a2ae293b4fd7/artifacts/g3viyuio_%E7%B6%B2%E9%A0%81logo.png"
              alt="Lakeze Logo"
              className="h-12 mx-auto mb-4"
            />
            <h2 className="text-xl font-bold text-[#1a1f16] mb-2">AI × 真人協作平台</h2>
            <p className="text-[#64748B] text-sm">10萬筆經驗訓練 · 96% 成交率</p>
          </div>

          <Card className="border-0 shadow-xl bg-white rounded-sm">
            <CardContent className="p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-[#1a1f16]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  管家登入
                </h2>
                <p className="text-[#64748B] mt-1">進入多場域管理後台</p>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div 
                    className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-sm text-red-700 text-sm animate-fade-in"
                    data-testid="login-error"
                  >
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[#1a1f16] font-medium">
                    電子郵件
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-12 bg-white border-[#E2E8F0] focus:border-[#3D4A2C] focus:ring-[#3D4A2C] rounded-sm"
                      data-testid="login-email-input"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-[#1a1f16] font-medium">
                    密碼
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 h-12 bg-white border-[#E2E8F0] focus:border-[#3D4A2C] focus:ring-[#3D4A2C] rounded-sm"
                      data-testid="login-password-input"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-[#1a1f16] hover:bg-[#2a3424] text-white font-medium rounded-sm shadow-lg hover:shadow-xl transition-all duration-200"
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
              <div className="mt-8 pt-6 border-t border-[#E2E8F0]">
                <div className="flex items-center justify-center gap-6 text-xs text-[#64748B]">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                    <span>SSL 加密</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                    <span>資料保護</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                    <span>24/7 監控</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-xs text-[#64748B]">
            © 2025 Lakeze 人客多. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
