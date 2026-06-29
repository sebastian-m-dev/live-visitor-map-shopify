import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { sseManager } from "../lib/sse.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      controller.enqueue(encoder.encode("retry: 3000\n\n"));

      const cleanup = sseManager.add(shop, {
        shop,
        write: (data: string) => {
          try {
            controller.enqueue(encoder.encode(data));
          } catch {}
        },
        close: () => controller.close(),
      });

      request.signal.addEventListener("abort", cleanup);

      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(":ping\n\n"));
        } catch {
          clearInterval(keepAlive);
        }
      }, 15000);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
};
