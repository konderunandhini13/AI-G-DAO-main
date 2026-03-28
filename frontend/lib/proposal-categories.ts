'use client';

export interface ProposalCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  gradient: string;
}

/**
 * Climate project categories for proposal organization
 */
export const PROPOSAL_CATEGORIES: ProposalCategory[] = [
  {
    id: 'renewable-energy',
    name: 'Renewable Energy',
    description: 'Solar, wind, hydro, and other clean energy projects',
    icon: '⚡',
    color: 'yellow',
    gradient: 'from-yellow-500 to-orange-500'
  },
  {
    id: 'forest-conservation',
    name: 'Forest Conservation',
    description: 'Reforestation, forest protection, and biodiversity projects',
    icon: '🌳',
    color: 'green',
    gradient: 'from-green-500 to-emerald-500'
  },
  {
    id: 'ocean-cleanup',
    name: 'Ocean Cleanup',
    description: 'Marine conservation, plastic removal, and ocean restoration',
    icon: '🌊',
    color: 'blue',
    gradient: 'from-blue-500 to-cyan-500'
  },
  {
    id: 'carbon-capture',
    name: 'Carbon Capture',
    description: 'CO2 removal, carbon sequestration, and emission reduction',
    icon: '💨',
    color: 'gray',
    gradient: 'from-gray-500 to-slate-500'
  },
  {
    id: 'sustainable-agriculture',
    name: 'Sustainable Agriculture',
    description: 'Organic farming, regenerative practices, and food security',
    icon: '🌾',
    color: 'amber',
    gradient: 'from-amber-500 to-yellow-500'
  },
  {
    id: 'water-conservation',
    name: 'Water Conservation',
    description: 'Clean water access, purification, and watershed protection',
    icon: '💧',
    color: 'cyan',
    gradient: 'from-cyan-500 to-blue-500'
  },
  {
    id: 'waste-management',
    name: 'Waste Management',
    description: 'Recycling, composting, and circular economy solutions',
    icon: '♻️',
    color: 'purple',
    gradient: 'from-purple-500 to-indigo-500'
  },
  {
    id: 'clean-transportation',
    name: 'Clean Transportation',
    description: 'Electric vehicles, public transit, and sustainable mobility',
    icon: '🚗',
    color: 'teal',
    gradient: 'from-teal-500 to-green-500'
  },
  {
    id: 'climate-education',
    name: 'Climate Education',
    description: 'Awareness campaigns, research, and community engagement',
    icon: '📚',
    color: 'indigo',
    gradient: 'from-indigo-500 to-purple-500'
  },
  {
    id: 'green-infrastructure',
    name: 'Green Infrastructure',
    description: 'Sustainable buildings, smart cities, and eco-friendly development',
    icon: '🏢',
    color: 'emerald',
    gradient: 'from-emerald-500 to-teal-500'
  }
];

/**
 * Get category by ID
 */
export function getCategoryById(categoryId: string): ProposalCategory | undefined {
  return PROPOSAL_CATEGORIES.find(cat => cat.id === categoryId);
}

/**
 * Get all category IDs
 */
export function getAllCategoryIds(): string[] {
  return PROPOSAL_CATEGORIES.map(cat => cat.id);
}

/**
 * Get category display name
 */
export function getCategoryName(categoryId: string): string {
  const category = getCategoryById(categoryId);
  return category?.name || categoryId.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Normalize category ID from various formats
 */
export function normalizeCategoryId(input: string): string {
  if (!input) return 'renewable-energy'; // Default category
  
  const normalized = input.toLowerCase().replace(/\s+/g, '-');
  
  // Handle common variations
  const variations: Record<string, string> = {
    'solar': 'renewable-energy',
    'wind': 'renewable-energy',
    'hydro': 'renewable-energy',
    'energy': 'renewable-energy',
    'clean-energy': 'renewable-energy',
    'forest': 'forest-conservation',
    'trees': 'forest-conservation',
    'reforestation': 'forest-conservation',
    'ocean': 'ocean-cleanup',
    'marine': 'ocean-cleanup',
    'water': 'water-conservation',
    'carbon': 'carbon-capture',
    'co2': 'carbon-capture',
    'agriculture': 'sustainable-agriculture',
    'farming': 'sustainable-agriculture',
    'waste': 'waste-management',
    'recycling': 'waste-management',
    'transport': 'clean-transportation',
    'transportation': 'clean-transportation',
    'education': 'climate-education',
    'research': 'climate-education',
    'infrastructure': 'green-infrastructure',
    'building': 'green-infrastructure'
  };
  
  // Check variations first
  if (variations[normalized]) {
    return variations[normalized];
  }
  
  // Check if it's already a valid category
  if (PROPOSAL_CATEGORIES.find(cat => cat.id === normalized)) {
    return normalized;
  }
  
  // Default fallback
  return 'renewable-energy';
}

/**
 * Filter proposals by categories
 */
export function filterProposalsByCategories(
  proposals: any[], 
  selectedCategories: string[]
): any[] {
  if (selectedCategories.length === 0) return proposals;
  
  return proposals.filter(proposal => {
    const normalizedCategory = normalizeCategoryId(proposal.category);
    return selectedCategories.includes(normalizedCategory);
  });
}

/**
 * Get category statistics from proposals
 */
export function getCategoryStats(proposals: any[]): Record<string, number> {
  const stats: Record<string, number> = {};
  
  // Initialize all categories with 0
  PROPOSAL_CATEGORIES.forEach(cat => {
    stats[cat.id] = 0;
  });
  
  // Count proposals by category
  proposals.forEach(proposal => {
    const normalizedCategory = normalizeCategoryId(proposal.category);
    stats[normalizedCategory] = (stats[normalizedCategory] || 0) + 1;
  });
  
  return stats;
}