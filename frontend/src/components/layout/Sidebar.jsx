import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, Settings, LogOut, User } from 'lucide-react';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { Avatar, AvatarFallback } from '../ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';

export const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAdmin } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { icon: LayoutDashboard, label: '儀表板', path: '/dashboard' },
    ...(isAdmin ? [{ icon: Settings, label: '設定', path: '/settings' }] : [])
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="h-screen w-16 bg-[#3D4A2C] flex flex-col items-center py-4 shadow-xl">
      {/* Logo */}
      <div className="mb-6">
        <img 
          src="https://customer-assets.emergentagent.com/job_e6d9fa16-06bf-4039-ab22-a2ae293b4fd7/artifacts/g3viyuio_%E7%B6%B2%E9%A0%81logo.png"
          alt="Lakeze"
          className="w-10 h-10 object-contain"
        />
      </div>

      <Separator className="w-8 bg-white/20 mb-4" />

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-2">
        <TooltipProvider delayDuration={0}>
          {navItems.map((item) => (
            <Tooltip key={item.path}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate(item.path)}
                  className={`w-10 h-10 rounded-sm transition-all duration-200 ${
                    isActive(item.path)
                      ? 'bg-white/20 text-[#D4AF37]'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                  data-testid={`nav-${item.label}`}
                >
                  <item.icon className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-[#1F2E0E] text-white border-0">
                {item.label}
              </TooltipContent>
            </Tooltip>
          ))}
        </TooltipProvider>
      </nav>

      {/* User & Logout */}
      <div className="flex flex-col items-center gap-2">
        <Separator className="w-8 bg-white/20 mb-2" />
        
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Avatar className="w-8 h-8 bg-[#D4AF37] cursor-default">
                <AvatarFallback className="bg-[#D4AF37] text-white text-xs font-medium">
                  {user?.name?.charAt(0) || <User className="w-4 h-4" />}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-[#1F2E0E] text-white border-0">
              <div className="text-sm font-medium">{user?.name}</div>
              <div className="text-xs text-white/70">{user?.email}</div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="w-10 h-10 text-white/70 hover:bg-red-500/20 hover:text-red-300 rounded-sm transition-all duration-200"
                data-testid="logout-btn"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-[#1F2E0E] text-white border-0">
              登出
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};
