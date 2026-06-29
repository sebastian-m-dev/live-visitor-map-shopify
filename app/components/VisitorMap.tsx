import { useMemo } from "react";
import { Box, Text } from "@shopify/polaris";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from "react-simple-maps";

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

interface Session {
  id: string;
  latitude?: number | null;
  longitude?: number | null;
  city?: string | null;
  country?: string | null;
  lastSeen: Date;
}

interface Props {
  sessions: Session[];
}

export function VisitorMap({ sessions }: Props) {
  const markers = useMemo(
    () =>
      sessions
        .filter((s) => s.latitude && s.longitude && s.latitude !== 0)
        .map((s) => ({
          key: s.id,
          coordinates: [s.longitude!, s.latitude!] as [number, number],
          label: s.city ? `${s.city}, ${s.country}` : s.country || "Unknown",
          isActive:
            s.lastSeen.getTime() > Date.now() - 2 * 60 * 1000,
        })),
    [sessions]
  );

  if (markers.length === 0) {
    return (
      <Box padding="400">
        <Text as="p" alignment="center" tone="subdued">
          No visitor locations available yet.
        </Text>
      </Box>
    );
  }

  return (
    <Box width="100%">
      <div style={{ width: "100%", height: 400 }}>
        <ComposableMap
          projectionConfig={{ scale: 150 }}
          style={{ width: "100%", height: "100%" }}
        >
          <ZoomableGroup zoom={1} center={[0, 20]}>
            <Geographies geography={geoUrl}>
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill="#EAEAEA"
                    stroke="#D6D6DA"
                    style={{
                      default: { outline: "none" },
                      hover: { outline: "none", fill: "#F5F5F5" },
                      pressed: { outline: "none" },
                    }}
                  />
                ))
              }
            </Geographies>
            {markers.map((m) => (
              <Marker key={m.key} coordinates={m.coordinates}>
                <circle
                  r={6}
                  fill={m.isActive ? "#00C853" : "#2979FF"}
                  stroke="#FFF"
                  strokeWidth={2}
                  style={{ cursor: "pointer" }}
                />
                <title>{m.label}</title>
              </Marker>
            ))}
          </ZoomableGroup>
        </ComposableMap>
      </div>
    </Box>
  );
}
