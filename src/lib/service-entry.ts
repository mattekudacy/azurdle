export type ServiceEntry = {
  name: string;
  category: string;
  launchYear: number;
  computeModel: string;
  pricingModel: string;
  awsEquivalent: string;
  // enriched from services-metadata.json (not all services have entries)
  description?: string;
  tags?: string[];
  documentation_links?: string[];
};
