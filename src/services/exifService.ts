/**
 * exifService.ts
 * Extracts EXIF metadata (GPS, camera model, timestamp) from a File object.
 * Uses the 'exifr' library which handles JPEG, HEIC, TIFF, PNG, etc.
 */
import exifr from 'exifr';

export interface ExifData {
  gps: { lat: number; lng: number } | null;
  cameraModel: string | null;
  captureTime: Date | null;
  hasExif: boolean;
}

/**
 * Extracts EXIF data from an image File.
 * Returns null fields gracefully if the file has no EXIF or extraction fails.
 */
export async function extractExifData(file: File): Promise<ExifData> {
  const result: ExifData = {
    gps: null,
    cameraModel: null,
    captureTime: null,
    hasExif: false,
  };

  try {
    // Parse GPS + TIFF tags (Make, Model, DateTimeOriginal)
    const parsed = await exifr.parse(file, {
      gps: true,
      tiff: true,
      // Explicit tags we care about
      pick: ['Make', 'Model', 'DateTimeOriginal', 'CreateDate', 'GPSLatitude', 'GPSLongitude'],
    });

    if (!parsed) {
      console.log('[exifService] No EXIF data found in file:', file.name);
      return result;
    }

    result.hasExif = true;
    console.log('[exifService] Raw EXIF parsed:', parsed);

    // --- GPS ---
    if (typeof parsed.latitude === 'number' && typeof parsed.longitude === 'number') {
      result.gps = { lat: parsed.latitude, lng: parsed.longitude };
      console.log(`[exifService] GPS found: ${parsed.latitude}, ${parsed.longitude}`);
    } else {
      console.log('[exifService] No GPS coords in EXIF.');
    }

    // --- Camera model ---
    const make = parsed.Make ?? '';
    const model = parsed.Model ?? '';
    if (make || model) {
      // Avoid duplicating make in model string (e.g., "Apple iPhone 15" vs "Apple / iPhone 15")
      result.cameraModel = model.startsWith(make)
        ? model.trim()
        : `${make} ${model}`.trim();
      console.log(`[exifService] Camera: ${result.cameraModel}`);
    } else {
      console.log('[exifService] No camera model in EXIF.');
    }

    // --- Capture timestamp ---
    const rawTime = parsed.DateTimeOriginal ?? parsed.CreateDate ?? null;
    if (rawTime instanceof Date && !isNaN(rawTime.getTime())) {
      result.captureTime = rawTime;
      console.log(`[exifService] Capture time: ${rawTime.toISOString()}`);
    } else if (rawTime) {
      // Sometimes exifr returns a string like "2026:03:22 12:00:00"
      const parsed2 = new Date(String(rawTime).replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3'));
      if (!isNaN(parsed2.getTime())) {
        result.captureTime = parsed2;
        console.log(`[exifService] Capture time (parsed from string): ${parsed2.toISOString()}`);
      }
    } else {
      console.log('[exifService] No capture timestamp in EXIF.');
    }
  } catch (err) {
    // Graceful — never crash the report flow due to EXIF failure
    console.warn('[exifService] EXIF extraction failed:', err);
  }

  return result;
}
