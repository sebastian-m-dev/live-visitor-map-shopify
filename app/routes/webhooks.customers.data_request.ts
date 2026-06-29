import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);
  const payload = await request.json();

  console.log(`[GDPR] ${topic} from ${shop} for customer ${payload.customer_id}`);

  const visitorSessions = await db.visitorSession.findMany({
    where: { shop },
    include: { visitEvents: true },
    take: 100,
  });

  return new Response(JSON.stringify({
    received: true,
    shop,
    customerId: payload.customer_id,
    sessionsFound: visitorSessions.length,
  }), {
    headers: { "Content-Type": "application/json" },
  });
};
