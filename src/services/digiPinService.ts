/**
 * digiPinService.ts
 * Decodes India Post's DigiPin geocode into lat/lng coordinates.
 *
 * DigiPin specification (India Post, 2023):
 * - 10 alphanumeric characters in format: XXX-XXX-XXXX (displayed) or XXXXXXXXXX (raw)
 * - Character set (23 chars, no ambiguous I/O/L/0/1/U/S/Z):
 *     "23456789CFGHJKMNPRTVWXY"
 * - Covers India bounding box: Lat 2°N–38°N, Lng 63°E–100°E
 * - Characters encode nested 4×8 grid subdivisions (2 rows × 4 cols per level)
 *
 * Each DigiPin char subdivides the current cell into an 8-column × 4-row grid.
 * The 23-char alphabet encodes positions 0-22 in a specific order.
 */

// Official DigiPin character set (position → character)
const DIGIPIN_CHARS = '23456789CFGHJKMNPRTVWXY';

// Grid dimensions at each subdivision level: 4 rows × 8 cols = 32 cells
// But only 23 chars are used → top 23 of the 32 cells
const ROWS = 4;
const COLS = 8; // 4×8=32 possible, but only 23 are valid

// India bounding box
const LAT_MIN = 2.0;
const LAT_MAX = 38.0;
const LNG_MIN = 63.0;
const LNG_MAX = 100.0;

/**
 * Validates a DigiPin code.
 * Accepts with or without dashes: "38J764KMPQ" or "38J-764-KMP Q"
 * Must be exactly 10 valid alphanumeric chars from the DigiPin charset.
 */
export function isValidDigiPin(code: string): boolean {
  if (!code) return false;
  // Strip dashes and spaces
  const clean = code.replace(/[-\s]/g, '').toUpperCase();
  if (clean.length !== 10) return false;
  return clean.split('').every(ch => DIGIPIN_CHARS.includes(ch));
}

/**
 * Decodes a DigiPin code to a lat/lng coordinate (centre of the encoded cell).
 * Returns null if the code is invalid or decode fails.
 *
 * Algorithm:
 * Each character subdivides the current bounding box into a 4-row × 8-col grid.
 * Position within the 23-char charset determines the row and column:
 *   colIndex = charPos % COLS   (0..7, left→right = west→east)
 *   rowIndex = Math.floor(charPos / COLS)  (0..3, top-down = north→south)
 * 
 * New lat bounds: latMax - (rowIndex+1)*cellH → latMax - rowIndex*cellH
 * New lng bounds: lngMin + colIndex*cellW → lngMin + (colIndex+1)*cellW
 * After all 10 chars, return the centre of the final cell.
 */
export function decodeDigiPin(code: string): { lat: number; lng: number } | null {
  if (!isValidDigiPin(code)) {
    console.log(`[digiPinService] Invalid DigiPin: "${code}"`);
    return null;
  }

  const clean = code.replace(/[-\s]/g, '').toUpperCase();

  let latMin = LAT_MIN;
  let latMax = LAT_MAX;
  let lngMin = LNG_MIN;
  let lngMax = LNG_MAX;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    const charPos = DIGIPIN_CHARS.indexOf(ch);

    // Each level divides the box into ROWS × COLS (max 32 cells)
    // We use only the first 23 positions
    const colIndex = charPos % COLS; // 0..7 (west→east)
    const rowIndex = Math.floor(charPos / COLS); // 0..3 (north→south)

    const latStep = (latMax - latMin) / ROWS;
    const lngStep = (lngMax - lngMin) / COLS;

    // North→South: rowIndex=0 is top (high lat), rowIndex=3 is bottom (low lat)
    const newLatMax = latMax - rowIndex * latStep;
    const newLatMin = newLatMax - latStep;
    const newLngMin = lngMin + colIndex * lngStep;
    const newLngMax = newLngMin + lngStep;

    latMin = newLatMin;
    latMax = newLatMax;
    lngMin = newLngMin;
    lngMax = newLngMax;
  }

  const lat = (latMin + latMax) / 2;
  const lng = (lngMin + lngMax) / 2;

  console.log(`[digiPinService] Decoded "${code}" → lat: ${lat.toFixed(6)}, lng: ${lng.toFixed(6)}`);
  console.log(`[digiPinService] Cell bounds: lat [${latMin.toFixed(6)}, ${latMax.toFixed(6)}], lng [${lngMin.toFixed(6)}, ${lngMax.toFixed(6)}]`);

  return { lat, lng };
}

/**
 * Encodes a lat/lng to a DigiPin string (useful for testing/validation).
 * Reverse of decodeDigiPin — encodes 10 levels deep.
 *
 * Note: The 4×8=32 cell grid uses only 23 of 32 positions (rows 0-2 fully,
 * row 3 is outside the alphabet). When the point falls into row 3, we encode
 * it into the nearest valid cell (row 2) and clamp the working coordinates
 * to that cell so subsequent levels don't diverge.
 */
export function encodeDigiPin(lat: number, lng: number): string | null {
  if (lat < LAT_MIN || lat > LAT_MAX || lng < LNG_MIN || lng > LNG_MAX) {
    console.log(`[digiPinService] Coordinates out of India bounding box: ${lat}, ${lng}`);
    return null;
  }

  let latMin = LAT_MIN;
  let latMax = LAT_MAX;
  let lngMin = LNG_MIN;
  let lngMax = LNG_MAX;
  // We track a "clamped" working point that stays inside the chosen cell at each level
  let workLat = lat;
  let workLng = lng;

  let result = '';

  for (let i = 0; i < 10; i++) {
    const latStep = (latMax - latMin) / ROWS;
    const lngStep = (lngMax - lngMin) / COLS;

    // North→South: rowIndex=0 is top (high lat)
    const rawRow = Math.floor((latMax - workLat) / latStep);
    const rawCol = Math.floor((workLng - lngMin) / lngStep);

    // Row 3 (positions 24-31) is outside the 23-char alphabet → cap to row 2
    const safeRow = Math.min(rawRow, ROWS - 2);
    const safeCol = Math.min(rawCol, COLS - 1);

    const charPos = Math.min(safeRow * COLS + safeCol, DIGIPIN_CHARS.length - 1);
    result += DIGIPIN_CHARS[charPos];

    // Zoom into the chosen cell
    const newLatMax = latMax - safeRow * latStep;
    const newLatMin = newLatMax - latStep;
    const newLngMin = lngMin + safeCol * lngStep;
    const newLngMax = newLngMin + lngStep;

    latMin = newLatMin;
    latMax = newLatMax;
    lngMin = newLngMin;
    lngMax = newLngMax;

    // Clamp working point to the chosen cell bounds so it stays valid next iteration
    workLat = Math.max(newLatMin, Math.min(newLatMax, workLat));
    workLng = Math.max(newLngMin, Math.min(newLngMax, workLng));
  }

  // Format: XXX-XXX-XXXX
  const formatted = `${result.slice(0, 3)}-${result.slice(3, 6)}-${result.slice(6)}`;
  console.log(`[digiPinService] Encoded (${lat}, ${lng}) → ${formatted}`);
  return formatted;
}
