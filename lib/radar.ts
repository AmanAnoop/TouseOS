/** Radar — server-side geofence verification for event check-in. */

export function isRadarConfigured(): boolean {
  return Boolean(process.env.RADAR_SECRET_KEY?.trim());
}

export interface GeofenceCheckResult {
  inside: boolean;
  distanceMeters?: number;
}

/** Verify coordinates are within radius (feet) of event center — server only. */
export async function verifyWithinGeofence(opts: {
  originLat: number;
  originLng: number;
  userLat: number;
  userLng: number;
  radiusFeet: number;
}): Promise<GeofenceCheckResult> {
  const secret = process.env.RADAR_SECRET_KEY?.trim();
  if (!secret) {
    return { inside: false };
  }

  try {
    const res = await fetch(
      "https://api.radar.io/v1/route/distance",
      {
        method: "POST",
        headers: {
          Authorization: secret,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          origin: { latitude: opts.userLat, longitude: opts.userLng },
          destination: { latitude: opts.originLat, longitude: opts.originLng },
          modes: ["foot"],
          units: "imperial",
        }),
      },
    );
    if (!res.ok) return { inside: false };
    const data = await res.json();
    const feet = data?.routes?.foot?.distance?.value ?? data?.distance?.value;
    if (feet == null) return { inside: false };
    return {
      inside: feet <= opts.radiusFeet,
      distanceMeters: feet * 0.3048,
    };
  } catch {
    return { inside: false };
  }
}
