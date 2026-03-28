import type { NextApiRequest, NextApiResponse } from 'next';

// Real-world climate projects database
const REAL_WORLD_PROJECTS: Record<string, Array<{ name: string; description: string; similarity: string; successRate: string; url: string }>> = {
  solar: [
    { name: "Solar Sister (Africa)", description: "Distributes solar energy products through women entrepreneurs across rural Africa", similarity: "High", successRate: "Active - 5000+ entrepreneurs", url: "https://solarsister.org" },
    { name: "Barefoot College Solar", description: "Trains rural grandmothers to become solar engineers in developing countries", similarity: "High", successRate: "Active - 96 countries", url: "https://www.barefootcollege.org" },
    { name: "SolarAid", description: "Provides affordable solar lights to replace kerosene lamps in Africa", similarity: "Medium", successRate: "Active - 3M+ lights sold", url: "https://solar-aid.org" },
  ],
  wind: [
    { name: "Vestas Community Wind", description: "Community-owned wind energy projects across Europe and North America", similarity: "High", successRate: "Active - 100+ communities", url: "https://www.vestas.com" },
    { name: "Wind Empowerment", description: "Small wind turbines for rural electrification in developing countries", similarity: "High", successRate: "Active - 30+ countries", url: "https://windempowerment.org" },
  ],
  forest: [
    { name: "Eden Reforestation Projects", description: "Employs locals to plant millions of trees in deforested areas worldwide", similarity: "High", successRate: "Active - 1B+ trees planted", url: "https://edenprojects.org" },
    { name: "One Tree Planted", description: "Global reforestation charity planting trees across 80+ countries", similarity: "High", successRate: "Active - 100M+ trees", url: "https://onetreeplanted.org" },
    { name: "Trillion Trees Initiative", description: "UN-backed global initiative to protect and restore 1 trillion trees", similarity: "Medium", successRate: "Active - UN backed", url: "https://www.trilliontrees.org" },
  ],
  ocean: [
    { name: "The Ocean Cleanup", description: "Develops technology to extract plastic from oceans and rivers", similarity: "High", successRate: "Active - 10M+ kg removed", url: "https://theoceancleanup.com" },
    { name: "Parley for the Oceans", description: "Intercepts ocean plastic and upcycles it into products", similarity: "Medium", successRate: "Active - Adidas partnership", url: "https://www.parley.tv" },
    { name: "Sea Shepherd", description: "Direct action marine conservation organization protecting ocean wildlife", similarity: "Medium", successRate: "Active - 40+ years", url: "https://seashepherd.org" },
  ],
  carbon: [
    { name: "Climeworks (DAC)", description: "Direct air capture technology removing CO2 directly from atmosphere in Iceland", similarity: "High", successRate: "Active - Commercial scale", url: "https://climeworks.com" },
    { name: "Carbon Engineering", description: "Industrial-scale direct air capture and clean fuel synthesis", similarity: "High", successRate: "Active - Oxy partnership", url: "https://carbonengineering.com" },
    { name: "Charm Industrial", description: "Converts biomass to bio-oil and injects it underground for permanent storage", similarity: "Medium", successRate: "Active - Stripe backed", url: "https://charmindustrial.com" },
  ],
  agriculture: [
    { name: "Regenerative Agriculture Alliance", description: "Promotes soil health and carbon sequestration through farming practices", similarity: "High", successRate: "Active - 50+ countries", url: "https://regenagalliance.org" },
    { name: "Farmers for Climate Solutions", description: "Canadian farmers implementing climate-smart agriculture practices", similarity: "High", successRate: "Active - 1000+ farms", url: "https://farmersforclimatesolutions.ca" },
    { name: "Cool Farm Alliance", description: "Helps farmers measure and reduce their greenhouse gas emissions", similarity: "Medium", successRate: "Active - 100+ members", url: "https://coolfarmtool.org" },
  ],
  transport: [
    { name: "Lime (E-Scooters)", description: "Electric scooter and bike sharing reducing urban car trips globally", similarity: "High", successRate: "Active - 30+ countries", url: "https://li.me" },
    { name: "BlaBlaCar", description: "Long-distance carpooling platform reducing individual car journeys", similarity: "Medium", successRate: "Active - 22 countries", url: "https://www.blablacar.com" },
    { name: "Riversimple", description: "Hydrogen fuel cell cars with circular economy business model", similarity: "Medium", successRate: "Pilot stage - UK", url: "https://www.riversimple.com" },
  ],
  waste: [
    { name: "TerraCycle", description: "Recycles hard-to-recycle materials through brand-sponsored programs", similarity: "High", successRate: "Active - 21 countries", url: "https://www.terracycle.com" },
    { name: "Plastic Bank", description: "Stops ocean plastic by making it a currency in developing countries", similarity: "High", successRate: "Active - 8 countries", url: "https://plasticbank.com" },
    { name: "Loop Industries", description: "Depolymerizes plastic waste back to virgin-quality materials", similarity: "Medium", successRate: "Active - L'Oreal partnership", url: "https://loopindustries.com" },
  ],
  energy: [
    { name: "Rocky Mountain Institute", description: "Accelerates clean energy transition through research and market transformation", similarity: "High", successRate: "Active - 40+ years", url: "https://rmi.org" },
    { name: "Energy Access Ventures", description: "Invests in off-grid energy companies serving rural Africa", similarity: "Medium", successRate: "Active - $50M+ deployed", url: "https://energyaccessventures.com" },
  ],
  water: [
    { name: "Water.org", description: "Provides access to safe water and sanitation through microfinance", similarity: "High", successRate: "Active - 16M+ people helped", url: "https://water.org" },
    { name: "Charity: Water", description: "Funds clean water projects in developing countries with 100% model", similarity: "High", successRate: "Active - 17M+ people", url: "https://www.charitywater.org" },
  ],
  urban: [
    { name: "C40 Cities Network", description: "Network of megacities taking action on climate change", similarity: "High", successRate: "Active - 97 cities", url: "https://www.c40.org" },
    { name: "Urban Green Council", description: "Advances sustainable building practices in New York City", similarity: "Medium", successRate: "Active - NYC focused", url: "https://www.urbangreencouncil.org" },
    { name: "Sidewalk Labs", description: "Urban innovation to reduce cities' environmental footprint", similarity: "Medium", successRate: "Active - Google backed", url: "https://www.sidewalklabs.com" },
  ],
};

// Maps form category values directly to project database keys
const FORM_CATEGORY_MAP: Record<string, string[]> = {
  'renewable-energy': ['solar', 'wind', 'energy'],
  'reforestation':    ['forest'],
  'water-conservation': ['water'],
  'waste-management': ['waste'],
  'sustainable-agriculture': ['agriculture'],
  'carbon-capture':   ['carbon'],
  'climate-education': ['energy'],
  'transportation':   ['transport'],
  'ocean':            ['ocean'],
  'urban':            ['urban'],
};

function detectCategory(title: string, description: string, formCategory?: string): string[] {
  // 1. Form category is the most reliable signal — use it first
  if (formCategory && FORM_CATEGORY_MAP[formCategory]) {
    return FORM_CATEGORY_MAP[formCategory];
  }

  // 2. Keyword fallback when no form category provided
  const text = (title + ' ' + description).toLowerCase();
  const categories: string[] = [];
  if (text.match(/solar|photovoltaic|pv panel|sun energy/)) categories.push('solar');
  if (text.match(/wind turbine|wind farm|wind energy|wind power/)) categories.push('wind');
  if (text.match(/forest|tree|reforest|deforest|woodland|jungle/)) categories.push('forest');
  if (text.match(/ocean|sea|marine|coral|reef|coastal/)) categories.push('ocean');
  if (text.match(/carbon capture|co2|direct air|sequestration|carbon removal/)) categories.push('carbon');
  if (text.match(/farm|agriculture|crop|soil|food|livestock/)) categories.push('agriculture');
  if (text.match(/\btransport\b|\bvehicle\b|\bscooter\b|electric vehicle|\bmobility\b/)) categories.push('transport');
  if (text.match(/waste|recycle|landfill|compost|circular economy/)) categories.push('waste');
  if (text.match(/water|river|lake|irrigation|drought|flood/)) categories.push('water');
  if (text.match(/heat island|urban heat|cooling|green roof|smart city/)) categories.push('urban');
  if (text.match(/energy|power|electricity|grid|battery|storage/) && !categories.includes('solar') && !categories.includes('wind')) categories.push('energy');
  return categories.length > 0 ? categories : ['energy'];
}

function getExistingProjects(categories: string[]) {
  const projects: any[] = [];
  categories.forEach(cat => {
    if (REAL_WORLD_PROJECTS[cat]) {
      projects.push(...REAL_WORLD_PROJECTS[cat].slice(0, 2));
    }
  });
  return projects.slice(0, 3);
}

function generateScores(title: string, description: string, category: string, fundingAmount: string) {
  const text = (title + ' ' + description).toLowerCase();
  const funding = parseFloat(fundingAmount) || 0;

  let envScore = 60;
  let feasScore = 60;
  let innovScore = 60;

  // Environmental score based on keywords
  if (text.match(/measurable|quantifiable|tons co2|carbon offset|emissions reduction/)) envScore += 15;
  if (text.match(/community|local|grassroots|inclusive/)) envScore += 8;
  if (text.match(/biodiversity|ecosystem|habitat|wildlife/)) envScore += 10;
  if (text.match(/renewable|clean energy|zero emission|net zero/)) envScore += 12;

  // Feasibility score
  if (text.match(/timeline|milestone|phase|roadmap|plan/)) feasScore += 15;
  if (text.match(/partner|collaboration|team|expert|organization/)) feasScore += 10;
  if (text.match(/pilot|prototype|tested|proven|existing/)) feasScore += 12;
  if (funding > 0 && funding < 100000) feasScore += 10;
  if (funding > 500000) feasScore -= 10;

  // Innovation score
  if (text.match(/blockchain|ai|machine learning|iot|sensor|smart/)) innovScore += 15;
  if (text.match(/novel|unique|first|innovative|new approach/)) innovScore += 12;
  if (text.match(/technology|digital|data|platform/)) innovScore += 8;
  if (text.match(/community.owned|decentralized|dao|governance/)) innovScore += 10;

  // Cap scores at 95
  envScore = Math.min(95, envScore + Math.floor(Math.random() * 8));
  feasScore = Math.min(95, feasScore + Math.floor(Math.random() * 8));
  innovScore = Math.min(95, innovScore + Math.floor(Math.random() * 8));

  const overall = Math.round((envScore + feasScore + innovScore) / 3);

  return { overall, envScore, feasScore, innovScore };
}

function generateStrengths(title: string, description: string): string[] {
  const text = (title + ' ' + description).toLowerCase();
  const strengths: string[] = [];
  if (text.match(/community|local|people/)) strengths.push("Strong community engagement focus");
  if (text.match(/measurable|metric|kpi|target|goal/)) strengths.push("Clear measurable impact targets");
  if (text.match(/partner|collaboration|organization/)) strengths.push("Collaborative approach with existing organizations");
  if (text.match(/technology|digital|smart|ai|iot/)) strengths.push("Leverages modern technology for impact");
  if (text.match(/scalable|scale|expand|replicate/)) strengths.push("Scalable model with replication potential");
  if (text.match(/local|region|area|specific/)) strengths.push("Targeted local implementation strategy");
  if (strengths.length < 2) {
    strengths.push("Clear environmental objectives defined");
    strengths.push("Addresses a real climate challenge");
  }
  return strengths.slice(0, 3);
}

function generateConcerns(title: string, description: string, funding: string): string[] {
  const text = (title + ' ' + description).toLowerCase();
  const concerns: string[] = [];
  if (!text.match(/timeline|schedule|month|year|phase/)) concerns.push("No clear implementation timeline provided");
  if (!text.match(/budget|cost|expense|fund allocation/)) concerns.push("Detailed budget breakdown is missing");
  if (!text.match(/risk|challenge|barrier|obstacle/)) concerns.push("Risk assessment and mitigation plan needed");
  if (!text.match(/monitor|measure|track|evaluate|impact/)) concerns.push("Monitoring and evaluation framework unclear");
  if (parseFloat(funding) > 500000 && !text.match(/justif|reason|why|because/)) concerns.push("High funding request needs stronger justification");
  if (concerns.length < 2) concerns.push("Long-term sustainability plan not addressed");
  return concerns.slice(0, 3);
}

function generateInnovativeAddons(categories: string[], title: string, description: string): string[] {
  const text = (title + ' ' + description).toLowerCase();

  const addons: Record<string, string[]> = {
    solar: [
      "Add IoT-based real-time energy monitoring dashboard",
      "Integrate peer-to-peer energy trading using blockchain",
      "Include battery storage for 24/7 clean energy access",
      "Deploy mobile app for community energy usage tracking",
      "Add predictive maintenance alerts using AI sensor data",
    ],
    wind: [
      "Deploy AI-powered predictive maintenance for turbines",
      "Add community energy sharing platform",
      "Integrate weather forecasting for optimal energy generation",
      "Use digital twin simulation to optimize turbine placement",
      "Create local energy cooperative with token-based governance",
    ],
    forest: [
      "Use drone technology for large-scale seed dispersal",
      "Implement satellite monitoring for deforestation alerts",
      "Add carbon credit tokenization for community income",
      "Deploy soil moisture sensors to improve seedling survival rates",
      "Create a public biodiversity dashboard with species tracking",
    ],
    ocean: [
      "Deploy autonomous underwater drones for monitoring",
      "Use AI to track plastic accumulation patterns",
      "Create community-based plastic collection incentive system",
      "Integrate real-time ocean health dashboard for public transparency",
      "Partner with fishing communities for data collection incentives",
    ],
    carbon: [
      "Integrate blockchain for transparent carbon credit tracking",
      "Use AI to optimize capture efficiency",
      "Partner with airlines for carbon offset marketplace",
      "Add real-time CO2 measurement sensors with public dashboard",
      "Develop community carbon credit wallet for local stakeholders",
      "Use geospatial data to identify highest-impact capture sites",
    ],
    agriculture: [
      "Add soil carbon sensors for real-time monitoring",
      "Implement precision agriculture using satellite data",
      "Create farmer cooperative for carbon credit trading",
      "Deploy AI crop health monitoring using drone imagery",
      "Integrate weather-based irrigation automation to reduce water use",
    ],
    transport: [
      "Add gamification to encourage sustainable transport choices",
      "Integrate with city smart traffic systems",
      "Deploy AI route optimization to minimize emissions",
      "Create a community carpooling app with carbon savings tracker",
      "Add real-time emissions dashboard visible to commuters",
    ],
    waste: [
      "Use AI sorting robots to improve recycling rates",
      "Create blockchain-based waste tracking system",
      "Develop community reward tokens for recycling participation",
      "Deploy smart bins with fill-level sensors for optimized collection",
      "Add QR-code product scanning to guide consumers on disposal",
    ],
    energy: [
      "Add smart grid integration for demand response",
      "Implement AI energy consumption optimization",
      "Create community energy cooperative model",
      "Deploy real-time energy audit tools for households",
      "Integrate with local utility for dynamic pricing incentives",
    ],
    water: [
      "Deploy IoT sensors for real-time water quality monitoring",
      "Use AI to predict and prevent water waste",
      "Integrate rainwater harvesting with smart collection systems",
      "Add community water usage dashboard for behavioral nudging",
      "Create mobile alerts for contamination events using sensor data",
    ],
    urban: [
      "Add green roof network with biodiversity monitoring",
      "Implement smart cooling systems with AI optimization",
      "Create urban heat island mapping using satellite data",
      "Deploy air quality sensors with public real-time dashboard",
      "Integrate with city planning tools for data-driven green zoning",
    ],
  };

  // Skip addons that describe something the proposal already mentions
  const skipKeywords: Record<string, string[]> = {
    blockchain: ['blockchain', 'token', 'crypto', 'web3', 'dao'],
    ai: ['ai ', 'artificial intelligence', 'machine learning', 'ml model'],
    iot: ['iot', 'sensor', 'smart device'],
    satellite: ['satellite', 'remote sensing'],
    drone: ['drone', 'uav'],
    dashboard: ['dashboard', 'monitoring platform'],
    cooperative: ['cooperative', 'co-op', 'community owned'],
  };

  const isAlreadyMentioned = (addon: string): boolean => {
    const addonLower = addon.toLowerCase();
    for (const [key, keywords] of Object.entries(skipKeywords)) {
      const addonHasKey = keywords.some(k => addonLower.includes(k));
      const proposalHasKey = keywords.some(k => text.includes(k));
      if (addonHasKey && proposalHasKey) return true;
    }
    return false;
  };

  // Use a hash of the title to pick a different starting offset per proposal
  const titleHash = title.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);

  const result: string[] = [];
  categories.forEach(cat => {
    if (!addons[cat]) return;
    const pool = addons[cat].filter(a => !isAlreadyMentioned(a));
    // Rotate starting index based on title hash so same-category proposals get different addons
    const offset = titleHash % pool.length;
    const rotated = [...pool.slice(offset), ...pool.slice(0, offset)];
    result.push(...rotated.slice(0, 2));
  });
  return result.slice(0, 4);
}

function generateRealWorldComparison(title: string, description: string, categories: string[], existingProjects: any[]): string {
  const projectNames = existingProjects.map(p => p.name).join(', ');
  const cat = categories[0] || 'climate';
  return `Your proposal is similar to ${projectNames}. These projects have demonstrated success in the ${cat} space. To stand out, focus on your unique geographic context, community ownership model, or technology integration that these projects haven't addressed. Key differentiator opportunity: ${existingProjects[0]?.description ? `Unlike ${existingProjects[0].name} which ${existingProjects[0].description.toLowerCase()}, your proposal could emphasize local governance and community-led implementation.` : 'emphasize measurable local impact and community ownership.'}`;
}

function generateRecommendedChanges(title: string, description: string, categories: string[]): string[] {
  const text = (title + ' ' + description).toLowerCase();
  const changes: string[] = [];

  if (!text.match(/timeline|phase|month/)) changes.push("Add a phased timeline: Phase 1 (0-6 months): Setup & pilot, Phase 2 (6-18 months): Scale, Phase 3 (18-36 months): Full deployment");
  if (!text.match(/partner|organization|ngo|university/)) changes.push(`Partner with established ${categories[0] || 'climate'} organizations like UNDP, WWF, or local universities for credibility`);
  if (!text.match(/measur|kpi|metric|ton|kg|mw|kwh/)) changes.push("Add specific measurable KPIs: e.g., 'Reduce X tons CO2 per year' or 'Power Y households with clean energy'");
  if (!text.match(/community|local people|stakeholder/)) changes.push("Include community stakeholder engagement plan with local ownership structure");
  changes.push("Apply for matching grants from Green Climate Fund or Global Environment Facility to double your impact");

  return changes.slice(0, 4);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { title, description, category, fundingAmount, expectedImpact, location } = req.body;

    const categories = detectCategory(title, description, category);
    const existingProjects = getExistingProjects(categories);
    const { overall, envScore, feasScore, innovScore } = generateScores(title, description, category, fundingAmount);
    const strengths = generateStrengths(title, description);
    const concerns = generateConcerns(title, description, fundingAmount);
    const innovativeAddons = generateInnovativeAddons(categories, title, description);
    const realWorldComparison = generateRealWorldComparison(title, description, categories, existingProjects);
    const recommendedChanges = generateRecommendedChanges(title, description, categories);

    const isNovel = innovScore > 75 && existingProjects.length < 2;
    const categoryLabel = overall >= 80 ? 'excellent' : overall >= 65 ? 'good' : overall >= 50 ? 'needs-improvement' : 'poor';

    return res.status(200).json({
      score: overall,
      category: categoryLabel,
      environmentalScore: envScore,
      feasibilityScore: feasScore,
      innovationScore: innovScore,
      isNovel,
      existingProjects,
      strengths,
      concerns,
      suggestions: recommendedChanges,
      realWorldComparison,
      recommendedChanges,
      innovativeAddons,
    });
  } catch (error: any) {
    console.error('Analysis error:', error);
    return res.status(500).json({ error: error.message });
  }
}
