import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);

  console.log(`[GDPR] ${topic} from ${shop} — purging all data`);

  await db.visitEvent.deleteMany({ where: { shop } });
  await db.visitorSession.deleteMany({ where: { shop } });
  await db.domainMapping.deleteMany({ where: { shop } });
  await db.store.delete({ where: { shop } }).catch(() => {});

  return new Response(JSON.stringify({ received: true, shop }), {
    headers: { "Content-Type": "application/json" },
  });
};
