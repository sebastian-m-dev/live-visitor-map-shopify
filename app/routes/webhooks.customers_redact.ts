import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);
  const payload = await request.json();

  console.log(`[GDPR] ${topic} from ${shop} for customer ${payload.customer_id}`);

  await db.visitEvent.deleteMany({ where: { shop } });
  await db.visitorSession.deleteMany({ where: { shop } });

  return new Response(JSON.stringify({ received: true, shop }), {
    headers: { "Content-Type": "application/json" },
  });
};
