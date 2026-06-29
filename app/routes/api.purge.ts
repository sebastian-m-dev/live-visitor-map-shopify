import type { ActionFunctionArgs } from "react-router";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const auth = request.headers.get("Authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const stores = await db.store.findMany();
  let purged = 0;

  for (const store of stores) {
    const settings = JSON.parse(store.settings);
    const days = settings.retentionDays || 90;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const result = await db.visitEvent.deleteMany({
      where: { shop: store.shop, createdAt: { lt: cutoff } },
    });
    purged += result.count;
  }

  return new Response(JSON.stringify({ purged, stores: stores.length }), {
    headers: { "Content-Type": "application/json" },
  });
};
