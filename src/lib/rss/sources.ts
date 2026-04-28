/**
 * Default RSS feed sources for global news
 * Focus on geopolitical, economic, and market-moving news
 */

export interface RSSSource {
  name: string
  url: string
  category: 'geopolitical' | 'economic' | 'general' | 'regional'
  priority: number // 1-5, higher = more important
}

export const DEFAULT_RSS_SOURCES: RSSSource[] = [
  // Global News - High Priority
  {
    name: 'Reuters World News',
    url: 'https://www.reutersagency.com/feed/?taxonomy=best-topics&post_type=best',
    category: 'geopolitical',
    priority: 5,
  },
  {
    name: 'BBC News - World',
    url: 'http://feeds.bbci.co.uk/news/world/rss.xml',
    category: 'geopolitical',
    priority: 5,
  },
  {
    name: 'Al Jazeera',
    url: 'https://www.aljazeera.com/xml/rss/all.xml',
    category: 'geopolitical',
    priority: 4,
  },
  
  // Economic & Financial News
  {
    name: 'Financial Times',
    url: 'https://www.ft.com/?format=rss',
    category: 'economic',
    priority: 5,
  },
  {
    name: 'Bloomberg',
    url: 'https://www.bloomberg.com/feed/podcast/etf-report.xml',
    category: 'economic',
    priority: 5,
  },
  {
    name: 'The Economist',
    url: 'https://www.economist.com/the-world-this-week/rss.xml',
    category: 'economic',
    priority: 4,
  },
  
  // Regional News - Important Markets
  {
    name: 'South China Morning Post',
    url: 'https://www.scmp.com/rss/91/feed',
    category: 'regional',
    priority: 3,
  },
  {
    name: 'The Guardian - World',
    url: 'https://www.theguardian.com/world/rss',
    category: 'geopolitical',
    priority: 4,
  },
  {
    name: 'Associated Press',
    url: 'https://apnews.com/apf-topnews',
    category: 'general',
    priority: 4,
  },
  
  // Central Banks & Policy
  {
    name: 'Federal Reserve News',
    url: 'https://www.federalreserve.gov/feeds/press_all.xml',
    category: 'economic',
    priority: 5,
  },
  {
    name: 'ECB Press Releases',
    url: 'https://www.ecb.europa.eu/rss/press.html',
    category: 'economic',
    priority: 5,
  },
]

/**
 * Get RSS sources filtered by category
 */
export function getSourcesByCategory(category: RSSSource['category']): RSSSource[] {
  return DEFAULT_RSS_SOURCES.filter((source) => source.category === category)
}

/**
 * Get RSS sources filtered by minimum priority
 */
export function getSourcesByPriority(minPriority: number): RSSSource[] {
  return DEFAULT_RSS_SOURCES.filter((source) => source.priority >= minPriority)
}

/**
 * Get all RSS source URLs
 */
export function getAllSourceURLs(): string[] {
  return DEFAULT_RSS_SOURCES.map((source) => source.url)
}
