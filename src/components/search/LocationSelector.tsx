import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { MapPin } from 'lucide-react';

interface LocationProps {
  value: string;
  onValueChange: (value: string) => void;
}

// Standardized locations optimized for Google Places API
export const LOCATION_PRESETS = {
  'Ireland - Major Cities': [
    { value: 'Dublin, Ireland', label: 'Dublin (All Areas)', searchTerms: ['Dublin Ireland', 'Greater Dublin Area', 'Dublin Metro Area'] },
    { value: 'Cork, Ireland', label: 'Cork', searchTerms: ['Cork Ireland', 'Cork City'] },
    { value: 'Galway, Ireland', label: 'Galway', searchTerms: ['Galway Ireland', 'Galway City'] },
    { value: 'Limerick, Ireland', label: 'Limerick', searchTerms: ['Limerick Ireland', 'Limerick City'] },
    { value: 'Waterford, Ireland', label: 'Waterford', searchTerms: ['Waterford Ireland', 'Waterford City'] }
  ],
  'Dublin Districts': [
    { value: 'Dublin 1, Ireland', label: 'Dublin 1 (City Centre North)', searchTerms: ['Dublin 1', 'Dublin City Centre North'] },
    { value: 'Dublin 2, Ireland', label: 'Dublin 2 (City Centre South)', searchTerms: ['Dublin 2', 'Dublin City Centre South'] },
    { value: 'Dublin 3, Ireland', label: 'Dublin 3 (Clontarf, East Wall)', searchTerms: ['Dublin 3', 'Clontarf Dublin'] },
    { value: 'Dublin 4, Ireland', label: 'Dublin 4 (Ballsbridge, Donnybrook)', searchTerms: ['Dublin 4', 'Ballsbridge Dublin', 'Donnybrook Dublin'] },
    { value: 'Dublin 6, Ireland', label: 'Dublin 6 (Rathmines, Ranelagh)', searchTerms: ['Dublin 6', 'Rathmines Dublin', 'Ranelagh Dublin'] },
    { value: 'Dublin 8, Ireland', label: 'Dublin 8 (South Circular Road)', searchTerms: ['Dublin 8', 'South Circular Road Dublin'] },
    { value: 'Dublin 15, Ireland', label: 'Dublin 15 (Blanchardstown)', searchTerms: ['Dublin 15', 'Blanchardstown Dublin'] },
    { value: 'Dublin 24, Ireland', label: 'Dublin 24 (Tallaght)', searchTerms: ['Dublin 24', 'Tallaght Dublin'] }
  ],
  'Dublin Suburbs': [
    { value: 'Swords, Dublin, Ireland', label: 'Swords', searchTerms: ['Swords Dublin', 'Swords Ireland'] },
    { value: 'Dun Laoghaire, Dublin, Ireland', label: 'Dún Laoghaire', searchTerms: ['Dun Laoghaire Dublin', 'Dún Laoghaire Ireland'] },
    { value: 'Blackrock, Dublin, Ireland', label: 'Blackrock', searchTerms: ['Blackrock Dublin', 'Blackrock Ireland'] },
    { value: 'Howth, Dublin, Ireland', label: 'Howth', searchTerms: ['Howth Dublin', 'Howth Ireland'] },
    { value: 'Malahide, Dublin, Ireland', label: 'Malahide', searchTerms: ['Malahide Dublin', 'Malahide Ireland'] },
    { value: 'Sandyford, Dublin, Ireland', label: 'Sandyford', searchTerms: ['Sandyford Dublin', 'Sandyford Ireland'] },
    { value: 'Dundrum, Dublin, Ireland', label: 'Dundrum', searchTerms: ['Dundrum Dublin', 'Dundrum Ireland'] }
  ],
  'UK - Major Cities': [
    { value: 'London, UK', label: 'London', searchTerms: ['London UK', 'Greater London'] },
    { value: 'Manchester, UK', label: 'Manchester', searchTerms: ['Manchester UK', 'Greater Manchester'] },
    { value: 'Birmingham, UK', label: 'Birmingham', searchTerms: ['Birmingham UK'] },
    { value: 'Glasgow, Scotland', label: 'Glasgow', searchTerms: ['Glasgow Scotland', 'Glasgow UK'] },
    { value: 'Edinburgh, Scotland', label: 'Edinburgh', searchTerms: ['Edinburgh Scotland', 'Edinburgh UK'] }
  ],
  'US - Major Cities': [
    { value: 'New York, NY, USA', label: 'New York City', searchTerms: ['New York City', 'NYC', 'Manhattan'] },
    { value: 'Los Angeles, CA, USA', label: 'Los Angeles', searchTerms: ['Los Angeles', 'LA California'] },
    { value: 'Chicago, IL, USA', label: 'Chicago', searchTerms: ['Chicago Illinois', 'Chicago IL'] },
    { value: 'Boston, MA, USA', label: 'Boston', searchTerms: ['Boston Massachusetts', 'Boston MA'] },
    { value: 'San Francisco, CA, USA', label: 'San Francisco', searchTerms: ['San Francisco', 'SF California'] }
  ]
};

export const LocationSelector = ({ value, onValueChange }: LocationProps) => {
  const [useCustomLocation, setUseCustomLocation] = useState(false);
  const [customLocation, setCustomLocation] = useState('');

  const handleLocationChange = (selectedValue: string) => {
    if (selectedValue === 'custom') {
      setUseCustomLocation(true);
      onValueChange(customLocation);
    } else {
      setUseCustomLocation(false);
      onValueChange(selectedValue);
    }
  };

  const handleCustomLocationChange = (customValue: string) => {
    setCustomLocation(customValue);
    onValueChange(customValue);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="location">Location</Label>
      {!useCustomLocation ? (
        <Select value={value} onValueChange={handleLocationChange}>
          <SelectTrigger id="location">
            <MapPin className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Select a location for optimal results" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(LOCATION_PRESETS).map(([category, locations]) => (
              <div key={category}>
                <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground">
                  {category}
                </div>
                {locations.map((location) => (
                  <SelectItem key={location.value} value={location.value}>
                    {location.label}
                  </SelectItem>
                ))}
              </div>
            ))}
            <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground">
              Other
            </div>
            <SelectItem value="custom">
              Custom Location...
            </SelectItem>
          </SelectContent>
        </Select>
      ) : (
        <div className="space-y-2">
          <Input
            id="location"
            placeholder="Enter custom location (e.g., Barcelona, Spain)"
            value={customLocation}
            onChange={(e) => handleCustomLocationChange(e.target.value)}
            maxLength={100}
            required
          />
          <button
            type="button"
            onClick={() => {
              setUseCustomLocation(false);
              onValueChange('');
            }}
            className="text-xs text-primary hover:underline"
          >
            ← Back to preset locations
          </button>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        💡 Preset locations are optimized with multiple search variations for maximum coverage
      </p>
    </div>
  );
};

// Helper function to get search terms for a location
export const getLocationSearchTerms = (location: string): string[] => {
  for (const category of Object.values(LOCATION_PRESETS)) {
    const preset = category.find(l => l.value === location);
    if (preset) {
      return preset.searchTerms;
    }
  }
  // Return variations for custom locations
  return [location, location.split(',')[0]?.trim()].filter(Boolean);
};