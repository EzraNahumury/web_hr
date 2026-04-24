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
  placementInput: string | string[] | null | undefined,
  latitude: number,
  longitude: number,
): GeofenceResult {
  const placements = Array.isArray(placementInput)
    ? placementInput.filter(Boolean)
    : placementInput
      ? [placementInput]
      : [];

  if (placements.length === 0) {
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

  // WFA bypass if any placement is WFA
  if (placements.includes(WFA_PLACEMENT)) {
    return {
      valid: true,
      bypass: true,
      reason: "wfa",
      distanceMeters: null,
      location: null,
      placement: WFA_PLACEMENT,
    };
  }

  // Find the single closest valid location across all placements
  let bestValid: { placement: string; location: WorkLocation; distance: number } | null = null;
  let bestInvalid: { placement: string; location: WorkLocation; distance: number } | null = null;

  for (const placement of placements) {
    const locations = WORK_LOCATIONS[placement];
    if (!locations || locations.length === 0) continue;

    for (const loc of locations) {
      const d = haversineDistanceMeters(latitude, longitude, loc.latitude, loc.longitude);
      if (d <= MAX_GEOFENCE_RADIUS_METERS) {
        if (!bestValid || d < bestValid.distance) {
          bestValid = { placement, location: loc, distance: d };
        }
      } else {
        if (!bestInvalid || d < bestInvalid.distance) {
          bestInvalid = { placement, location: loc, distance: d };
        }
      }
    }
  }

  if (bestValid) {
    return {
      valid: true,
      bypass: false,
      distanceMeters: bestValid.distance,
      location: bestValid.location,
      placement: bestValid.placement,
    };
  }

  // All placements out of range — report closest
  if (bestInvalid) {
    return {
      valid: false,
      bypass: false,
      reason: "out_of_range",
      distanceMeters: bestInvalid.distance,
      location: bestInvalid.location,
      placement: bestInvalid.placement,
      message: `Anda berada ${Math.round(bestInvalid.distance)} meter dari ${bestInvalid.location.label} (lokasi terdekat). Maksimal jarak presensi adalah ${MAX_GEOFENCE_RADIUS_METERS} meter.`,
    };
  }

  // All placement names unknown
  return {
    valid: false,
    bypass: false,
    reason: "unknown_placement",
    distanceMeters: null,
    location: null,
    placement: placements[0],
    message: `Lokasi untuk penempatan "${placements.join(", ")}" belum terdaftar. Hubungi HR.`,
  };
}
