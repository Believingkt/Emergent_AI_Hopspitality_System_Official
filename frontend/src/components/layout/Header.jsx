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
    <header className="h-16 bg-white border-b border-[#E2E8F0] px-6 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-semibold text-[#1F2E0E]" style={{ fontFamily: 'Manrope, sans-serif' }}>
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Connection Status */}
        <div className="flex items-center gap-2">
          {connected ? (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1.5">
              <Wifi className="w-3 h-3" />
              <span className="text-xs">即時連線</span>
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 gap-1.5">
              <WifiOff className="w-3 h-3" />
              <span className="text-xs">離線</span>
            </Badge>
          )}
        </div>

        {/* Venue Selector */}
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-[#64748B]" />
          <Select
            value={currentVenue?.id || ''}
            onValueChange={handleVenueChange}
          >
            <SelectTrigger 
              className="w-[200px] bg-white border-[#E2E8F0] focus:ring-[#3D4A2C] rounded-sm"
              data-testid="venue-selector"
            >
              <SelectValue placeholder="選擇場域" />
            </SelectTrigger>
            <SelectContent className="bg-white border-[#E2E8F0] rounded-sm">
              {venues.map((venue) => (
                <SelectItem 
                  key={venue.id} 
                  value={venue.id}
                  className="cursor-pointer hover:bg-[#F5F5F0]"
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
