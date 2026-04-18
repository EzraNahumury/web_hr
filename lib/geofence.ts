export const MAX_GEOFENCE_RADIUS_METERS = 25;

export type WorkLocation = {
  label: string;
  latitude: number;
  longitude: number;
};

// Koordinat diambil dari Google Maps share link yang diberikan.
// Satu penempatan bisa punya lebih dari satu lokasi (misal Gudang punya 2 titik);
// karyawan dianggap valid kalau masuk radius salah satu titiknya.
export const WORK_LOCATIONS: Record<string, WorkLocation[]> = {
  Office: [
    {
      label: "Office (Jl. Wonocatur)",
      latitude: -7.8026256,
      longitude: 110.4068213,
    },
  ],
  Toko: [
    {
      label: "Toko (AVA Sport Store)",
      latitude: -7.8026601,
      longitude: 110.4066919,
    },
  ],
  Ayres: [
    {
      label: "Ayres Apparel",
      latitude: -7.8067173,
      longitude: 110.4056819,
    },
  ],
  JNE: [
    {
      label: "JNE Ambarrukmo",
      latitude: -7.7831106,
      longitude: 110.4007024,
    },
  ],
  Gudang: [
    {
      label: "Gudang Avasportivo 1",
      latitude: -7.8020204,
      longitude: 110.4090615,
    },
    {
      label: "Gudang Avasportivo 2",
      latitude: -7.8056449,
      longitude: 110.4037354,
    },
  ],
};

export const WFA_PLACEMENT = "WFA";

export type GeofenceResult =
  | {
      valid: true;
      bypass: true;
      reason: "wfa";
      distanceMeters: null;
      location: null;
      placement: string;
    }
  | {
      valid: true;
      bypass: false;
      distanceMeters: number;
      location: WorkLocation;
      placement: string;
    }
  | {
      valid: false;
      bypass: false;
      reason: "no_placement" | "unknown_placement" | "out_of_range";
      distanceMeters: number | null;
      location: WorkLocation | null;
      placement: string | null;
      message: string;
    };

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

export function haversineDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) {
  const R = 6_371_000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function checkGeofence(
  placement: string | null | undefined,
  latitude: number,
  longitude: number,
): GeofenceResult {
  if (!placement) {
    return {
      valid: false,
      bypass: false,
      reason: "no_placement",
      distanceMeters: null,
      location: null,
      placement: null,
      message:
        "Penempatan Anda belum di-set oleh admin. Hubungi HR untuk melengkapi data sebelum presensi.",
    };
  }

  if (placement === WFA_PLACEMENT) {
    return {
      valid: true,
      bypass: true,
      reason: "wfa",
      distanceMeters: null,
      location: null,
      placement,
    };
  }

  const locations = WORK_LOCATIONS[placement];
  if (!locations || locations.length === 0) {
    return {
      valid: false,
      bypass: false,
      reason: "unknown_placement",
      distanceMeters: null,
      location: null,
      placement,
      message: `Lokasi untuk penempatan "${placement}" belum terdaftar. Hubungi HR.`,
    };
  }

  let nearest = locations[0];
  let nearestDistance = haversineDistanceMeters(
    latitude,
    longitude,
    nearest.latitude,
    nearest.longitude,
  );
  for (let i = 1; i < locations.length; i += 1) {
    const d = haversineDistanceMeters(
      latitude,
      longitude,
      locations[i].latitude,
      locations[i].longitude,
    );
    if (d < nearestDistance) {
      nearest = locations[i];
      nearestDistance = d;
    }
  }

  if (nearestDistance > MAX_GEOFENCE_RADIUS_METERS) {
    return {
      valid: false,
      bypass: false,
      reason: "out_of_range",
      distanceMeters: nearestDistance,
      location: nearest,
      placement,
      message: `Anda berada ${Math.round(nearestDistance)} meter dari ${nearest.label} (lokasi terdekat dari penempatan ${placement}). Maksimal jarak presensi adalah ${MAX_GEOFENCE_RADIUS_METERS} meter.`,
    };
  }

  return {
    valid: true,
    bypass: false,
    distanceMeters: nearestDistance,
    location: nearest,
    placement,
  };
}
