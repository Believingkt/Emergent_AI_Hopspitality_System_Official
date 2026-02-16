import { useVenue } from '../../context/VenueContext';
import { useWebSocket } from '../../context/WebSocketContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Badge } from '../ui/badge';
import { Building2, Wifi, WifiOff } from 'lucide-react';

export const Header = ({ title }) => {
  const { venues, currentVenue, selectVenue } = useVenue();
  const { connected } = useWebSocket();

  const handleVenueChange = (venueId) => {
    const venue = venues.find(v => v.id === venueId);
    if (venue) {
      selectVenue(venue);
    }
  };

  return (
    <header className="h-16 glass-header px-6 flex items-center justify-between sticky top-0 z-50" data-testid="header">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-semibold text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Connection Status */}
        <div className="flex items-center gap-2">
          {connected ? (
            <Badge variant="outline" className="bg-[#22c55e]/15 text-[#22c55e] border-[#22c55e]/30 gap-1.5">
              <Wifi className="w-3 h-3" />
              <span className="text-xs">即時連線</span>
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-red-500/15 text-red-400 border-red-500/30 gap-1.5">
              <WifiOff className="w-3 h-3" />
              <span className="text-xs">離線</span>
            </Badge>
          )}
        </div>

        {/* Venue Selector */}
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-[#a1a1aa]" />
          <Select
            value={currentVenue?.id || ''}
            onValueChange={handleVenueChange}
          >
            <SelectTrigger 
              className="w-[200px] bg-[#27272a]/50 border-[#27272a] text-white focus:ring-[#FF6B35] focus:border-[#FF6B35] rounded-lg"
              data-testid="venue-selector"
            >
              <SelectValue placeholder="選擇場域" />
            </SelectTrigger>
            <SelectContent className="bg-[#18181b] border-[#27272a] rounded-lg">
              {venues.map((venue) => (
                <SelectItem 
                  key={venue.id} 
                  value={venue.id}
                  className="cursor-pointer text-white hover:bg-[#27272a] focus:bg-[#27272a] focus:text-white"
                  data-testid={`venue-option-${venue.id}`}
                >
                  {venue.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </header>
  );
};
