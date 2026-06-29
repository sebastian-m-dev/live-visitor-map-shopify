import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useLoaderData, useFetcher } from "react-router";
import {
  Page,
  Card,
  BlockStack,
  Text,
  FormLayout,
  TextField,
  Select,
  Checkbox,
  Button,
  Banner,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import db from "../db.server";

interface Settings {
  retentionDays: number;
  anonymizeIp: boolean;
  mapStyle: string;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const store = await db.store.findUnique({ where: { shop: session.shop } });
  const defaults: Settings = { retentionDays: 90, anonymizeIp: false, mapStyle: "light" };
  const settings = store?.settings ? JSON.parse(store.settings) : defaults;
  return { settings };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const form = await request.formData();
  const settings = {
    retentionDays: parseInt(form.get("retentionDays") as string) || 90,
    anonymizeIp: form.get("anonymizeIp") === "true",
    mapStyle: (form.get("mapStyle") as string) || "light",
  };
  await db.store.upsert({
    where: { shop: session.shop },
    update: { settings: JSON.stringify(settings) },
    create: { shop: session.shop, settings: JSON.stringify(settings) },
  });
  return { success: true };
};

export default function SettingsPage() {
  const { settings } = useLoaderData<typeof loader>() as { settings: Settings };
  const fetcher = useFetcher<{ success: boolean }>();
  const [retentionDays, setRetentionDays] = useState(String(settings.retentionDays));
  const [anonymizeIp, setAnonymizeIp] = useState(settings.anonymizeIp);
  const [mapStyle, setMapStyle] = useState(settings.mapStyle);

  const handleSave = () => {
    fetcher.submit(
      { retentionDays, anonymizeIp: String(anonymizeIp), mapStyle },
      { method: "POST" }
    );
  };

  return (
    <Page
      title="Settings"
      primaryAction={
        <Button variant="primary" onClick={handleSave} loading={fetcher.state === "submitting"}>
          Save
        </Button>
      }
    >
      {fetcher.data?.success && <Banner tone="success">Settings saved.</Banner>}
      <Card>
        <BlockStack gap="400">
          <Text as="h2" variant="headingMd">Data Retention</Text>
          <FormLayout>
            <TextField
              label="Retention period (days)"
              type="number"
              value={retentionDays}
              onChange={setRetentionDays}
              min={1}
              max={365}
              autoComplete="off"
              helpText="Auto-delete visits older than this many days"
            />
          </FormLayout>
        </BlockStack>
      </Card>
      <Card>
        <BlockStack gap="400">
          <Text as="h2" variant="headingMd">Privacy</Text>
          <Checkbox
            label="Anonymize IP addresses (last octet set to 0)"
            checked={anonymizeIp}
            onChange={setAnonymizeIp}
          />
        </BlockStack>
      </Card>
      <Card>
        <BlockStack gap="400">
          <Text as="h2" variant="headingMd">Map Display</Text>
          <FormLayout>
            <Select
              label="Map style"
              value={mapStyle}
              onChange={setMapStyle}
              options={[
                { label: "Light", value: "light" },
                { label: "Dark", value: "dark" },
              ]}
            />
          </FormLayout>
        </BlockStack>
      </Card>
    </Page>
  );
}
