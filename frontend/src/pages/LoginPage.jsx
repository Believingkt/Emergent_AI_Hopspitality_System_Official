import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Loader2, Mail, Lock, AlertCircle } from 'lucide-react';

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
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Brand */}
      <div 
        className="hidden lg:flex lg:w-1/2 relative bg-[#3D4A2C] items-center justify-center overflow-hidden"
      >
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }} />
        </div>
        
        <div className="relative z-10 text-center px-12 animate-fade-in">
          <img 
            src="https://customer-assets.emergentagent.com/job_e6d9fa16-06bf-4039-ab22-a2ae293b4fd7/artifacts/g3viyuio_%E7%B6%B2%E9%A0%81logo.png"
            alt="Lakeze Logo"
            className="w-64 mx-auto mb-8"
          />
          <h1 className="text-3xl font-bold text-white mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
            多場域 AI 管家協作平台
          </h1>
          <p className="text-white/70 text-lg max-w-md mx-auto">
            統一管理多個場域的客戶對話，提升團隊協作效率
          </p>
          
          <div className="mt-12 flex items-center justify-center gap-8 text-white/60 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#D4AF37]"></div>
              <span>即時協作</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#D4AF37]"></div>
              <span>多場域支援</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#D4AF37]"></div>
              <span>智能分派</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[#F5F5F0]">
        <div className="w-full max-w-md animate-slide-in-up">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8 text-center">
            <img 
              src="https://customer-assets.emergentagent.com/job_e6d9fa16-06bf-4039-ab22-a2ae293b4fd7/artifacts/g3viyuio_%E7%B6%B2%E9%A0%81logo.png"
              alt="Lakeze Logo"
              className="w-48 mx-auto mb-4"
            />
          </div>

          <Card className="border-0 shadow-xl bg-white rounded-sm">
            <CardHeader className="space-y-1 pb-6">
              <CardTitle className="text-2xl font-bold text-[#3D4A2C]">
                歡迎回來
              </CardTitle>
              <CardDescription className="text-[#64748B]">
                請輸入您的帳號密碼登入系統
              </CardDescription>
            </CardHeader>
            
            <CardContent>
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
                  <Label htmlFor="email" className="text-[#1F2E0E] font-medium">
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
                      className="pl-10 h-11 bg-white border-[#E2E8F0] focus:border-[#3D4A2C] focus:ring-[#3D4A2C] rounded-sm"
                      data-testid="login-email-input"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-[#1F2E0E] font-medium">
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
                      className="pl-10 h-11 bg-white border-[#E2E8F0] focus:border-[#3D4A2C] focus:ring-[#3D4A2C] rounded-sm"
                      data-testid="login-password-input"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-[#3D4A2C] hover:bg-[#2C381E] text-white font-medium rounded-sm shadow-md hover:shadow-lg transition-all duration-200"
                  data-testid="login-submit-btn"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      登入中...
                    </>
                  ) : (
                    '登入'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-sm text-[#64748B]">
            © 2025 Lakeze 人客多. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
