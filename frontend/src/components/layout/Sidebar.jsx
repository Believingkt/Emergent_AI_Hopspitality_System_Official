import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { LayoutDashboard, Settings, LogOut, User, Sun, Moon } from 'lucide-react';
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
  const { theme, toggleTheme, isDark } = useTheme();

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
    <div className="h-screen w-16 bg-[#18181b] flex flex-col items-center py-4 border-r border-[#27272a]" data-testid="sidebar">
      {/* Logo */}
      <div className="mb-6">
        <img 
          src="https://customer-assets.emergentagent.com/job_430b19cf-7dc2-4179-a7b4-72c8b0096192/artifacts/k9ookbrh_%E4%BA%BA%E5%AE%A2%E5%A4%9Alogo%20%281%29.png"
          alt="Lakeze 人客多"
          className="w-10 h-10 object-contain"
        />
      </div>

      <Separator className="w-8 bg-[#27272a] mb-4" />

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
                  className={`w-10 h-10 rounded-lg transition-all duration-300 ${
                    isActive(item.path)
                      ? 'bg-[#FF6B35]/20 text-[#FF6B35] shadow-[0_0_10px_rgba(255,107,53,0.2)]'
                      : 'text-[#a1a1aa] hover:bg-[#27272a] hover:text-white'
                  }`}
                  data-testid={`nav-${item.label}`}
                >
                  <item.icon className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-[#27272a] text-white border-[#3f3f46]">
                {item.label}
              </TooltipContent>
            </Tooltip>
          ))}
        </TooltipProvider>
      </nav>

      {/* User & Logout */}
      <div className="flex flex-col items-center gap-2">
        <Separator className="w-8 bg-[#27272a] mb-2" />
        
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Avatar className="w-8 h-8 bg-gradient-to-br from-[#FF6B35] to-[#00B4D8] cursor-default">
                <AvatarFallback className="bg-transparent text-white text-xs font-medium">
                  {user?.name?.charAt(0) || <User className="w-4 h-4" />}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-[#27272a] text-white border-[#3f3f46]">
              <div className="text-sm font-medium">{user?.name}</div>
              <div className="text-xs text-[#a1a1aa]">{user?.email}</div>
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
                className="w-10 h-10 text-[#a1a1aa] hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-all duration-300"
                data-testid="logout-btn"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-[#27272a] text-white border-[#3f3f46]">
              登出
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};
