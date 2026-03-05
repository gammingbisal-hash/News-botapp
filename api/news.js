import fetch from 'node-fetch';
import { XMLParser } from 'fast-xml-parser';

const FEEDS = [
  { name: "Moneycontrol", url: "https://www.moneycontrol.com/rss/latestnews.xml", color: "#f97316" },
  { name: "Economic Times", url: "https://economictimes.indiatimes.com/markets/rss.cms", color: "#3b82f6" },
  { name: "Business Standard", url: "https://www.business-standard.com/rss/markets-106.rss", color: "#10b981" },
  { name: "Mint", url: "https://www.livemint.com/rss/markets", color: "#8b5cf6" },
];

async function parseFeed(feed) {
  try {
    const res = await fetch(feed.url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(8000),
    });
    const xml = await res.text();
    const parser = new XMLParser({ ignoreAttributes: false });
    const parsed = parser.parse(xml);
    const items = parsed?.rss?.channel?.item || [];
    const arr = Array.isArray(items) ? items : [items];
    return arr.slice(0, 8).map(item => ({
      id: item.guid?.["#text"] || item.guid || item.link || Math.random().toString(),
      title: item.title?.["#text"] || item.title || "",
      link: item.link || "",
      content: (item.description || "").replace(/<[^>]*>/g, "").trim().slice(0, 300),
      time: item.pubDate || new Date().toISOString(),
      source: feed.name,
      color: feed.color,
    }));
  } catch { return []; }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=120");
  try {
    const results = await Promise.all(FEEDS.map(parseFeed));
    const all = results.flat().sort((a, b) => new Date(b.time) - new Date(a.time));
    const seen = new Set();
    const unique = all.filter(n => {
      if (!n.title || seen.has(n.title)) return false;
      seen.add(n.title); return true;
    });
    res.status(200).json({ data: unique.slice(0, 30), updated: new Date().toISOString() });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
        }
