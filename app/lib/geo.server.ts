interface GeoResult {
  city: string;
  country: string;
  countryCode: string;
  lat: number;
  lon: number;
}

const cache = new Map<string, { result: GeoResult; expires: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000;

export async function lookupGeo(ip: string): Promise<GeoResult> {
  if (ip === "127.0.0.1" || ip === "::1" || ip === "0.0.0.0") {
    return { city: "Localhost", country: "Localhost", countryCode: "XX", lat: 0, lon: 0 };
  }

  const cached = cache.get(ip);
  if (cached && cached.expires > Date.now()) {
    return cached.result;
  }

  try {
    const token = process.env.IPINFO_TOKEN;
    const url = token
      ? `https://ipinfo.io/${ip}?token=${token}`
      : `https://ipinfo.io/${ip}/json`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`ipinfo responded ${res.status}`);

    const data = await res.json();
    const [latStr, lonStr] = (data.loc ?? "0,0").split(",");

    const result: GeoResult = {
      city: data.city ?? "Unknown",
      country: data.country ?? "Unknown",
      countryCode: data.country ?? "XX",
      lat: parseFloat(latStr) || 0,
      lon: parseFloat(lonStr) || 0,
    };

    cache.set(ip, { result, expires: Date.now() + CACHE_TTL });
    return result;
  } catch {
    return { city: "Unknown", country: "Unknown", countryCode: "XX", lat: 0, lon: 0 };
  }
}
