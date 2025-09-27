import { BusinessLead } from './FirecrawlService';

export interface LeadQuality {
  score: number;
  category: 'excellent' | 'okay' | 'poor';
  label: string;
  reasons: string[];
  contactCompleteness: number;
  locationRelevance: number;
}

export class LeadQualityService {
  /**
   * Calculates comprehensive lead quality based on contact info and location relevance
   */
  static calculateLeadQuality(lead: BusinessLead, searchLocation: string): LeadQuality {
    let score = 0;
    const reasons: string[] = [];
    
    // Contact Information Scoring (70% of total score)
    const contactScore = this.calculateContactScore(lead, reasons);
    score += contactScore * 0.7;
    
    // Location Relevance Scoring (30% of total score)
    const locationScore = this.calculateLocationScore(lead, searchLocation, reasons);
    score += locationScore * 0.3;
    
    // Determine category based on final score
    let category: 'excellent' | 'okay' | 'poor';
    let label: string;
    
    if (score >= 80) {
      category = 'excellent';
      label = 'Excellent Lead';
    } else if (score >= 50) {
      category = 'okay';
      label = 'Good Lead';
    } else {
      category = 'poor';
      label = 'Basic Lead';
    }
    
    return {
      score: Math.round(score),
      category,
      label,
      reasons,
      contactCompleteness: contactScore,
      locationRelevance: locationScore
    };
  }

  /**
   * Groups leads by quality category
   */
  static groupLeadsByQuality(leads: BusinessLead[], searchLocation: string): {
    excellent: { lead: BusinessLead; quality: LeadQuality }[];
    okay: { lead: BusinessLead; quality: LeadQuality }[];
    poor: { lead: BusinessLead; quality: LeadQuality }[];
  } {
    const leadsWithQuality = leads.map(lead => ({
      lead,
      quality: this.calculateLeadQuality(lead, searchLocation)
    }));

    return {
      excellent: leadsWithQuality.filter(item => item.quality.category === 'excellent'),
      okay: leadsWithQuality.filter(item => item.quality.category === 'okay'),
      poor: leadsWithQuality.filter(item => item.quality.category === 'poor')
    };
  }

  /**
   * Sorts leads by quality score (highest first)
   */
  static sortLeadsByQuality(leads: BusinessLead[], searchLocation: string): { lead: BusinessLead; quality: LeadQuality }[] {
    const leadsWithQuality = leads.map(lead => ({
      lead,
      quality: this.calculateLeadQuality(lead, searchLocation)
    }));

    return leadsWithQuality.sort((a, b) => b.quality.score - a.quality.score);
  }

  private static calculateContactScore(lead: BusinessLead, reasons: string[]): number {
    let score = 0;
    
    // Email scoring (35 points max)
    if (lead.email && this.isValidEmail(lead.email)) {
      score += 35;
      reasons.push('✅ Valid email address');
      
      // Bonus for professional email domains
      if (this.isProfessionalEmail(lead.email)) {
        score += 5;
        reasons.push('✨ Professional email domain');
      }
    } else {
      reasons.push('❌ No email address');
    }
    
    // Phone scoring (30 points max)
    if (lead.phone && this.isValidPhone(lead.phone)) {
      score += 30;
      reasons.push('✅ Valid phone number');
      
      // Bonus for formatted phone numbers
      if (this.isWellFormattedPhone(lead.phone)) {
        score += 5;
        reasons.push('✨ Well-formatted phone');
      }
    } else {
      reasons.push('❌ No phone number');
    }
    
    // Website scoring (25 points max)
    if (lead.website && this.isValidWebsite(lead.website)) {
      score += 25;
      reasons.push('✅ Valid website');
      
      // Bonus for HTTPS
      if (lead.website.startsWith('https://')) {
        score += 3;
        reasons.push('✨ Secure website (HTTPS)');
      }
    } else {
      reasons.push('❌ No website');
    }
    
    // Address scoring (10 points max)
    if (lead.address && lead.address.length > 10) {
      score += 10;
      reasons.push('✅ Complete address');
    } else {
      reasons.push('❌ No address information');
    }
    
    // Social media bonus (5 points max)
    if (lead.instagram) {
      score += 5;
      reasons.push('✨ Social media presence');
    }
    
    return Math.min(100, score);
  }

  private static calculateLocationScore(lead: BusinessLead, searchLocation: string, reasons: string[]): number {
    let score = 50; // Base score
    
    if (!lead.address) {
      reasons.push('⚠️ No address to verify location');
      return 30; // Lower score for unknown location
    }
    
    const leadLocation = lead.address.toLowerCase();
    const targetLocation = searchLocation.toLowerCase();
    
    // Extract city/area from search location
    const targetCity = targetLocation.split(',')[0].trim();
    const targetCountry = this.extractCountry(targetLocation);
    
    // Check for exact city match
    if (leadLocation.includes(targetCity)) {
      score += 30;
      reasons.push('✅ Located in target city');
      
      // Check for specific area/district match
      if (this.isSpecificAreaMatch(leadLocation, targetLocation)) {
        score += 20;
        reasons.push('✨ Located in specific target area');
      }
    } else {
      // Check for nearby areas or suburbs
      if (this.isNearbyArea(leadLocation, targetCity, targetCountry)) {
        score += 10;
        reasons.push('📍 Located in nearby area');
      } else {
        score -= 20;
        reasons.push('⚠️ Location may be outside target area');
      }
    }
    
    // Country verification
    if (targetCountry && leadLocation.includes(targetCountry)) {
      score += 10;
      reasons.push('✅ Correct country');
    }
    
    return Math.max(0, Math.min(100, score));
  }

  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length < 100;
  }

  private static isProfessionalEmail(email: string): boolean {
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) return false;
    
    // Avoid generic email providers
    const genericProviders = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com'];
    return !genericProviders.includes(domain);
  }

  private static isValidPhone(phone: string): boolean {
    const cleanPhone = phone.replace(/\D/g, '');
    return cleanPhone.length >= 10 && cleanPhone.length <= 15;
  }

  private static isWellFormattedPhone(phone: string): boolean {
    // Check for common formatting patterns
    const patterns = [
      /^\+\d{1,4}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}$/,
      /^\(\d{3}\)\s*\d{3}[-.\s]\d{4}$/,
      /^\d{3}[-.\s]\d{3}[-.\s]\d{4}$/
    ];
    
    return patterns.some(pattern => pattern.test(phone));
  }

  private static isValidWebsite(website: string): boolean {
    try {
      new URL(website.startsWith('http') ? website : `https://${website}`);
      return true;
    } catch {
      return false;
    }
  }

  private static extractCountry(location: string): string | null {
    const countries = ['ireland', 'uk', 'united kingdom', 'usa', 'united states', 'canada', 'australia'];
    const lowerLocation = location.toLowerCase();
    
    return countries.find(country => lowerLocation.includes(country)) || null;
  }

  private static isSpecificAreaMatch(leadLocation: string, targetLocation: string): boolean {
    // Check for postal codes, districts, or specific area names
    const targetParts = targetLocation.toLowerCase().split(',').map(s => s.trim());
    
    return targetParts.some(part => {
      if (part.length < 3) return false; // Skip very short parts
      return leadLocation.includes(part);
    });
  }

  private static isNearbyArea(leadLocation: string, targetCity: string, targetCountry: string | null): boolean {
    // Define nearby areas for major cities
    const nearbyAreas: { [key: string]: string[] } = {
      'dublin': ['dun laoghaire', 'blackrock', 'howth', 'malahide', 'swords', 'tallaght', 'blanchardstown'],
      'london': ['croydon', 'bromley', 'kingston', 'richmond', 'harrow', 'barnet', 'enfield'],
      'manchester': ['salford', 'stockport', 'oldham', 'rochdale', 'bolton', 'bury'],
      'cork': ['ballincollig', 'carrigaline', 'cobh', 'midleton'],
      'galway': ['salthill', 'oranmore', 'claregalway']
    };
    
    const nearby = nearbyAreas[targetCity.toLowerCase()] || [];
    return nearby.some(area => leadLocation.includes(area));
  }

  /**
   * Get quality statistics for a group of leads
   */
  static getQualityStats(leads: BusinessLead[], searchLocation: string): {
    excellent: number;
    okay: number;
    poor: number;
    averageScore: number;
    totalWithEmail: number;
    totalWithPhone: number;
    totalWithWebsite: number;
  } {
    const qualities = leads.map(lead => this.calculateLeadQuality(lead, searchLocation));
    
    return {
      excellent: qualities.filter(q => q.category === 'excellent').length,
      okay: qualities.filter(q => q.category === 'okay').length,
      poor: qualities.filter(q => q.category === 'poor').length,
      averageScore: Math.round(qualities.reduce((sum, q) => sum + q.score, 0) / qualities.length),
      totalWithEmail: leads.filter(lead => lead.email && this.isValidEmail(lead.email)).length,
      totalWithPhone: leads.filter(lead => lead.phone && this.isValidPhone(lead.phone)).length,
      totalWithWebsite: leads.filter(lead => lead.website && this.isValidWebsite(lead.website)).length
    };
  }
}