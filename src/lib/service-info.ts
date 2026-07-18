import { readFileSync } from "fs";
import { join } from "path";
import { normalizeGuess } from "./guess";
import type { ServiceEntry } from "./service-entry";

export type ServiceInfo = {
  description: string;
  url: string;
  documentation_links?: string[];
};

type MetaEntry = {
  name: string;
  description?: string;
  url?: string;
  documentation_links?: string[];
};

type MetaFile = {
  categories: Array<{ services: MetaEntry[] }>;
};

function buildFallbackUrl(name: string): string {
  const query = encodeURIComponent(name);
  return `https://learn.microsoft.com/en-us/search/?terms=${query}&category=Documentation`;
}

function buildFallbackDescription(entry: ServiceEntry): string {
  const parts: string[] = [];
  if (entry.category) parts.push(`${entry.category} service`);
  if (entry.computeModel && entry.computeModel !== "Managed Service") parts.push(`(${entry.computeModel})`);
  if (entry.launchYear) parts.push(`launched in ${entry.launchYear}`);
  if (parts.length === 0) return `A Microsoft Azure service.`;
  return `An Azure ${parts.join(", ")}.`;
}

// Module-level singleton — built once per cold start.
let _infoMap: Map<string, ServiceInfo> | null = null;

function getInfoMap(): Map<string, ServiceInfo> {
  if (_infoMap) return _infoMap;

  // Load base vocab (always present — every service has at least these fields)
  const vocabRaw = readFileSync(join(process.cwd(), "public", "vocab", "services.json"), "utf-8");
  const vocab: ServiceEntry[] = JSON.parse(vocabRaw);

  // Build a fallback entry for every service from vocab
  const map = new Map<string, ServiceInfo>();
  for (const entry of vocab) {
    map.set(normalizeGuess(entry.name), {
      description: buildFallbackDescription(entry),
      url: buildFallbackUrl(entry.name),
    });
  }

  // Overlay with richer metadata where available
  try {
    const metaRaw = readFileSync(join(process.cwd(), "public", "vocab", "services-metadata.json"), "utf-8");
    const metaFile: MetaFile = JSON.parse(metaRaw);
    for (const cat of metaFile.categories) {
      for (const svc of cat.services) {
        const key = normalizeGuess(svc.name);
        const existing = map.get(key);
        if (existing) {
          map.set(key, {
            description: svc.description ?? existing.description,
            url: svc.url ?? existing.url,
            documentation_links: svc.documentation_links,
          });
        }
      }
    }
  } catch {
    // metadata enrichment is optional — fallbacks above are sufficient
  }

  _infoMap = map;
  return map;
}

export function getServiceInfo(answerName: string): ServiceInfo | undefined {
  return getInfoMap().get(normalizeGuess(answerName));
}
