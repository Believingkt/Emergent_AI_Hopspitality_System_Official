import React, { useState } from 'react';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Eye, EyeOff } from 'lucide-react';

export const SecureCredentialField = ({ 
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
