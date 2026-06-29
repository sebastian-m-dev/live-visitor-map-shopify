import { useEffect, useRef, useState } from "react";
import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import {
  Card,
  BlockStack,
  InlineGrid,
  Text,
  DataTable,
  Box,
  SkeletonBodyText,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { VisitorMap } from "../components/VisitorMap";

interface DashboardData {
  activeVisitors: number;
  todayVisits: number;
  todayUnique: number;
  activeSessions: Awaited<ReturnType<typeof db.visitorSession.findMany>>;
  recentEvents: {
    id: string;
    sessionId: string;
    ip: string;
    city: string;
    country: string;
    pageUrl: string;
    createdAt: string;
  }[];
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [activeVisitors, todayVisits, todayUnique, activeSessions, recentEvents] =
    await Promise.all([
      db.visitorSession.count({
        where: { shop, isActive: true, lastSeen: { gte: twoMinAgo } },
      }),
      db.visitEvent.count({
        where: { shop, createdAt: { gte: todayStart } },
      }),
      db.visitorSession.count({
        where: { shop, firstSeen: { gte: todayStart } },
      }),
      db.visitorSession.findMany({
        where: { shop, isActive: true, lastSeen: { gte: twoMinAgo } },
        orderBy: { lastSeen: "desc" },
        take: 50,
      }),
      db.visitEvent.findMany({
        where: {
          shop,
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
        include: { visitor: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    ]);

  return {
    activeVisitors,
    todayVisits,
    todayUnique,
    activeSessions,
    recentEvents: recentEvents.map((e) => ({
      id: e.id,
      sessionId: e.sessionId,
      ip: e.visitor.ip,
      city: e.visitor.city || "",
      country: e.visitor.country || "",
      pageUrl: e.pageUrl,
      createdAt: e.createdAt.toISOString(),
    })),
  };
};

export default function DashboardPage() {
  const initial = useLoaderData<typeof loader>() as unknown as DashboardData;
  const [data, setData] = useState(initial);
  const evtSource = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource("/tracking/stream");
    evtSource.current = es;

    es.addEventListener("visit", (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        setData((prev) => ({
          ...prev,
          activeVisitors: payload.activeVisitors ?? prev.activeVisitors,
          todayVisits: prev.todayVisits + 1,
          recentEvents: [payload.event, ...prev.recentEvents.slice(0, 99)],
        }));
      } catch {}
    });

    return () => es.close();
  }, []);

  const rows = data.recentEvents.slice(0, 50).map((e) => [
    new Date(e.createdAt).toLocaleString(),
    e.ip,
    e.city ? `${e.city}, ${e.country}` : e.country || "Unknown",
    e.pageUrl.length > 60 ? e.pageUrl.slice(0, 60) + "…" : e.pageUrl,
  ]);

  return (
    <BlockStack gap="400">
      <InlineGrid columns={{ xs: 1, sm: 3 }} gap="400">
        <Card>
          <BlockStack gap="100">
            <Text as="h3" variant="headingMd" tone="subdued">
              Active Visitors
            </Text>
            <Text as="p" variant="heading2xl" fontWeight="bold">
              {data.activeVisitors}
            </Text>
          </BlockStack>
        </Card>
        <Card>
          <BlockStack gap="100">
            <Text as="h3" variant="headingMd" tone="subdued">
              Today's Visits
            </Text>
            <Text as="p" variant="heading2xl" fontWeight="bold">
              {data.todayVisits}
            </Text>
          </BlockStack>
        </Card>
        <Card>
          <BlockStack gap="100">
            <Text as="h3" variant="headingMd" tone="subdued">
              Unique Today
            </Text>
            <Text as="p" variant="heading2xl" fontWeight="bold">
              {data.todayUnique}
            </Text>
          </BlockStack>
        </Card>
      </InlineGrid>

      <Card>
        <Text as="h2" variant="headingLg">
          Live Visitor Map
        </Text>
        <Box paddingBlockStart="400">
          <VisitorMap sessions={data.activeSessions} />
        </Box>
      </Card>

      <Card>
        <Text as="h2" variant="headingLg">
          Recent Visits (7 days)
        </Text>
        <Box paddingBlockStart="400">
          <DataTable
            columnContentTypes={["text", "text", "text", "text"]}
            headings={["Time", "IP", "Location", "Page"]}
            rows={rows}
          />
        </Box>
      </Card>
    </BlockStack>
  );
}
