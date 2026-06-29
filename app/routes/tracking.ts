import type { ActionFunctionArgs } from "react-router";
import db from "../db.server";
import { lookupGeo } from "../lib/geo.server";
import { sseManager } from "../lib/sse.server";

function anonymizeIp(ip: string): string {
  if (ip.includes(".")) return ip.replace(/\.\d+$/, ".0");
  if (ip.includes(":")) return ip.replace(/:[0-9a-fA-F]+$/, ":0");
  return ip;
}

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const body = await request.json();
    const { session_id, page_url, referrer, shop } = body;

    const resolvedShop =
      shop ||
      request.headers.get("X-Shop-Domain") ||
      "";

    if (!resolvedShop) {
      return new Response(JSON.stringify({ error: "unknown shop" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const cfIp = request.headers.get("CF-Connecting-IP");
    const xff = request.headers.get("X-Forwarded-For");
    const rawIp = cfIp || (xff ? xff.split(",")[0].trim() : "") || "0.0.0.0";

    const store = await db.store.findUnique({ where: { shop: resolvedShop } });
    const settings = store?.settings ? JSON.parse(store.settings) : {};
    const ip = settings.anonymizeIp ? anonymizeIp(rawIp) : rawIp;

    const geo = await lookupGeo(ip);
    const now = new Date();

    const existingSession = await db.visitorSession.findUnique({
      where: {
        shop_sessionId: { shop: resolvedShop, sessionId: session_id || rawIp + now.getTime() },
      },
    });

    if (existingSession) {
      await db.visitorSession.update({
        where: { id: existingSession.id },
        data: { lastSeen: now, isActive: true, ip },
      });
    } else {
      await db.visitorSession.create({
        data: {
          shop: resolvedShop,
          sessionId: session_id || rawIp + now.getTime(),
          ip,
          city: geo.city,
          country: geo.country,
          countryCode: geo.countryCode,
          latitude: geo.lat,
          longitude: geo.lon,
          userAgent: request.headers.get("User-Agent") || "",
          firstSeen: now,
          lastSeen: now,
          isActive: true,
        },
      });
    }

    const event = await db.visitEvent.create({
      data: {
        shop: resolvedShop,
        sessionId: session_id || rawIp + now.getTime(),
        pageUrl: page_url || "",
        referrer: referrer || "",
        createdAt: now,
      },
    });

    const activeCount = await db.visitorSession.count({
      where: {
        shop: resolvedShop,
        isActive: true,
        lastSeen: { gte: new Date(Date.now() - 2 * 60 * 1000) },
      },
    });

    sseManager.broadcast(resolvedShop, "visit", {
      activeVisitors: activeCount,
      event: { ...event, createdAt: event.createdAt.toISOString() },
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "internal" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
