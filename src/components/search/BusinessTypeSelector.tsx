import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface BusinessTypeProps {
  value: string;
  onValueChange: (value: string) => void;
}

// Optimized business types with search-friendly keywords
export const BUSINESS_TYPES = {
  'Restaurants & Food': [
    { value: 'restaurant', label: 'Restaurant', keywords: ['restaurant', 'dining', 'food'] },
    { value: 'cafe', label: 'Cafe & Coffee Shop', keywords: ['cafe', 'coffee shop', 'coffee'] },
    { value: 'fast-food', label: 'Fast Food', keywords: ['fast food', 'takeaway', 'quick service'] },
    { value: 'bar-pub', label: 'Bar & Pub', keywords: ['bar', 'pub', 'tavern', 'lounge'] },
    { value: 'bakery', label: 'Bakery', keywords: ['bakery', 'bread', 'pastry'] },
    { value: 'food-truck', label: 'Food Truck', keywords: ['food truck', 'mobile food'] }
  ],
  'Health & Medical': [
    { value: 'dentist', label: 'Dentist', keywords: ['dentist', 'dental clinic', 'oral health'] },
    { value: 'doctor', label: 'Doctor/GP', keywords: ['doctor', 'physician', 'GP', 'general practitioner'] },
    { value: 'pharmacy', label: 'Pharmacy', keywords: ['pharmacy', 'chemist', 'drugstore'] },
    { value: 'physiotherapy', label: 'Physiotherapy', keywords: ['physiotherapy', 'physical therapy', 'physio'] },
    { value: 'optician', label: 'Optician', keywords: ['optician', 'eye care', 'eyewear'] },
    { value: 'veterinarian', label: 'Veterinarian', keywords: ['veterinarian', 'vet', 'animal clinic'] }
  ],
  'Beauty & Personal Care': [
    { value: 'hair-salon', label: 'Hair Salon', keywords: ['hair salon', 'hairdresser', 'hair stylist'] },
    { value: 'beauty-salon', label: 'Beauty Salon', keywords: ['beauty salon', 'beauty', 'cosmetics'] },
    { value: 'nail-salon', label: 'Nail Salon', keywords: ['nail salon', 'manicure', 'pedicure'] },
    { value: 'spa', label: 'Spa & Wellness', keywords: ['spa', 'wellness', 'massage'] },
    { value: 'barber', label: 'Barber Shop', keywords: ['barber', 'barber shop', 'mens grooming'] },
    { value: 'tattoo', label: 'Tattoo Studio', keywords: ['tattoo', 'tattoo studio', 'body art'] }
  ],
  'Professional Services': [
    { value: 'lawyer', label: 'Lawyer', keywords: ['lawyer', 'attorney', 'legal services', 'solicitor'] },
    { value: 'accountant', label: 'Accountant', keywords: ['accountant', 'accounting', 'tax services'] },
    { value: 'real-estate', label: 'Real Estate', keywords: ['real estate', 'property', 'realtor'] },
    { value: 'insurance', label: 'Insurance', keywords: ['insurance', 'insurance agent', 'broker'] },
    { value: 'consultant', label: 'Consultant', keywords: ['consultant', 'consulting', 'advisory'] },
    { value: 'architect', label: 'Architect', keywords: ['architect', 'architectural', 'design'] }
  ],
  'Retail & Shopping': [
    { value: 'clothing', label: 'Clothing Store', keywords: ['clothing store', 'fashion', 'apparel'] },
    { value: 'grocery', label: 'Grocery Store', keywords: ['grocery', 'supermarket', 'food store'] },
    { value: 'electronics', label: 'Electronics Store', keywords: ['electronics', 'technology', 'gadgets'] },
    { value: 'bookstore', label: 'Bookstore', keywords: ['bookstore', 'books', 'library'] },
    { value: 'jewelry', label: 'Jewelry Store', keywords: ['jewelry', 'jewellery', 'watches'] },
    { value: 'furniture', label: 'Furniture Store', keywords: ['furniture', 'home decor', 'interior'] }
  ],
  'Home & Services': [
    { value: 'plumber', label: 'Plumber', keywords: ['plumber', 'plumbing', 'pipes'] },
    { value: 'electrician', label: 'Electrician', keywords: ['electrician', 'electrical', 'wiring'] },
    { value: 'contractor', label: 'Contractor', keywords: ['contractor', 'construction', 'builder'] },
    { value: 'cleaning', label: 'Cleaning Service', keywords: ['cleaning service', 'cleaner', 'housekeeping'] },
    { value: 'landscaping', label: 'Landscaping', keywords: ['landscaping', 'gardening', 'lawn care'] },
    { value: 'locksmith', label: 'Locksmith', keywords: ['locksmith', 'locks', 'security'] }
  ],
  'Automotive': [
    { value: 'car-dealership', label: 'Car Dealership', keywords: ['car dealership', 'auto dealer', 'car sales'] },
    { value: 'auto-repair', label: 'Auto Repair', keywords: ['auto repair', 'car repair', 'mechanic'] },
    { value: 'car-wash', label: 'Car Wash', keywords: ['car wash', 'auto detailing', 'vehicle cleaning'] },
    { value: 'gas-station', label: 'Gas Station', keywords: ['gas station', 'petrol station', 'fuel'] },
    { value: 'tire-shop', label: 'Tire Shop', keywords: ['tire shop', 'tyres', 'wheels'] }
  ]
};

export const BusinessTypeSelector = ({ value, onValueChange }: BusinessTypeProps) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="businessType">Business Type</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger id="businessType">
          <SelectValue placeholder="Select a business type for better results" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(BUSINESS_TYPES).map(([category, types]) => (
            <div key={category}>
              <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground">
                {category}
              </div>
              {types.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </div>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        💡 Optimized business types provide better search results with industry-specific keywords
      </p>
    </div>
  );
};

// Helper function to get search keywords for a business type
export const getBusinessTypeKeywords = (businessType: string): string[] => {
  for (const category of Object.values(BUSINESS_TYPES)) {
    const type = category.find(t => t.value === businessType);
    if (type) {
      return type.keywords;
    }
  }
  return [businessType];
};