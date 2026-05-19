/**
 * Multi-country PII detection for SG, MY, CN, HK.
 *
 * Used by:
 *  - ChatWidget.jsx  — interactive field validation during chat collection
 *  - App.jsx (AddUserForm) — form-level validators and re-validation on country change
 *
 * NOTE: Keep regex patterns in sync with backend/app/services/pii_detector.py.
 * The two modules serve different consumers (FE: interactive validation,
 * BE: log masking), but the patterns themselves should mean the same thing.
 */

import { parsePhoneNumberFromString } from "libphonenumber-js/max";

export const COUNTRIES = ["SG", "MY", "CN", "HK"];

export const COUNTRY_META = {
  SG: { flag: "🇸🇬", name: "Singapore",  code: "+65",  idLabel: "NRIC no.",          idExample: "S1234567D",            phoneExample: "91234567" },
  MY: { flag: "🇲🇾", name: "Malaysia",   code: "+60",  idLabel: "MyKad no.",         idExample: "850315-12-1234",       phoneExample: "12-345 6789" },
  CN: { flag: "🇨🇳", name: "China",      code: "+86",  idLabel: "ID no. (身份证)",   idExample: "110101199003070011",   phoneExample: "138 1234 5678" },
  HK: { flag: "🇭🇰", name: "Hong Kong",  code: "+852", idLabel: "HKID no.",          idExample: "A1234563",             phoneExample: "5123 4567" },
};

const ID_PATTERNS = {
  SG: /^[STFGM]\d{7}[A-Z]$/i,
  MY: /^\d{12}$/,
  CN: /^\d{17}[\dX]$/i,
  HK: /^[A-Z]{1,2}\d{6}[\dA]$/i,
};

// Normalize ID input: strip spaces, hyphens, parens
function normalizeId(value) {
  return value.trim().replace(/[\s\-()]/g, "").toUpperCase();
}

// ---- ID checksums ----------------------------------------------------------

// SG NRIC/FIN: weighted sum mod 11, lookup last letter
function sgNricChecksumValid(v) {
  const upper = v.toUpperCase();
  if (!/^[STFGM]\d{7}[A-Z]$/.test(upper)) return false;
  const first = upper[0];
  const digits = upper.slice(1, 8).split("").map(Number);
  const weights = [2, 7, 6, 5, 4, 3, 2];
  let sum = digits.reduce((acc, d, i) => acc + d * weights[i], 0);
  if (first === "T" || first === "G") sum += 4;
  if (first === "M") sum += 3;
  const remainder = sum % 11;
  const tables = {
    S: ["J","Z","I","H","G","F","E","D","C","B","A"],
    T: ["J","Z","I","H","G","F","E","D","C","B","A"],
    F: ["X","W","U","T","R","Q","P","N","M","L","K"],
    G: ["X","W","U","T","R","Q","P","N","M","L","K"],
    M: ["K","L","J","N","P","Q","R","T","U","W","X"],
  };
  return tables[first][remainder] === upper[8];
}

// MY MyKad: validate date portion (YYMMDD) is a real calendar date
function myIcDateValid(v) {
  if (!/^\d{12}$/.test(v)) return false;
  const yy = parseInt(v.slice(0, 2), 10);
  const mm = parseInt(v.slice(2, 4), 10);
  const dd = parseInt(v.slice(4, 6), 10);
  if (mm < 1 || mm > 12) return false;
  if (dd < 1 || dd > 31) return false;
  const daysInMonth = new Date(2000 + yy, mm, 0).getDate();
  return dd <= daysInMonth;
}

// CN ID: ISO 7064 MOD 11-2 checksum on first 17 digits
function cnIdChecksumValid(v) {
  const upper = v.toUpperCase();
  if (!/^\d{17}[\dX]$/.test(upper)) return false;
  const weights = [7,9,10,5,8,4,2,1,6,3,7,9,10,5,8,4,2];
  const checkChars = "10X98765432";
  const sum = upper.slice(0,17).split("").reduce((acc, d, i) => acc + Number(d) * weights[i], 0);
  return checkChars[sum % 11] === upper[17];
}

// HKID: weighted sum mod 11. Two-letter prefix uses 36 for both prefix letters
// (simplified — full algorithm allots different weights to prefix letters).
function hkIdChecksumValid(v) {
  const upper = v.toUpperCase();
  if (!/^[A-Z]{1,2}\d{6}[\dA]$/.test(upper)) return false;
  const padded = upper.length === 8 ? " " + upper : upper;  // pad to 9 chars
  const charVal = (c) => c === " " ? 36 : (c >= "A" && c <= "Z" ? c.charCodeAt(0) - 55 : Number(c));
  const weights = [9,8,7,6,5,4,3,2];
  const checkChar = padded[8];
  const checkVal = checkChar === "A" ? 10 : Number(checkChar);
  const sum = padded.slice(0,8).split("").reduce((acc, c, i) => acc + charVal(c) * weights[i], 0);
  return (sum + checkVal) % 11 === 0;
}

const ID_CHECKSUMS = {
  SG: sgNricChecksumValid,
  MY: myIcDateValid,
  CN: cnIdChecksumValid,
  HK: hkIdChecksumValid,
};

// ---- Public detection API --------------------------------------------------

// TODO(prod): flip this to `true` before deploying to production so we reject
// regex-valid but checksum-invalid IDs (e.g. `310113199912121212` — a valid CN
// 18-digit shape with the wrong final check digit). Set to `false` for demos so
// fabricated test data is accepted.
const STRICT_ID_CHECKSUM = false;

/**
 * Detect which country an ID value matches.
 *
 * When STRICT_ID_CHECKSUM is true, both the regex shape AND the country's
 * check-digit algorithm must pass. When false (demo mode), regex shape alone
 * is sufficient. The checksum implementations
 * (sgNricChecksumValid / myIcDateValid / cnIdChecksumValid / hkIdChecksumValid)
 * remain in this file and are wired up via ID_CHECKSUMS.
 */
export function detectId(value, currentCountry) {
  const normalized = normalizeId(value);
  if (!normalized) return { country: null, isValid: false, regexOnly: false, matchesCurrent: false };

  // Strong = regex + (in strict mode) checksum
  const strongHits = COUNTRIES.filter(c =>
    ID_PATTERNS[c].test(normalized) && (!STRICT_ID_CHECKSUM || ID_CHECKSUMS[c](normalized))
  );
  if (strongHits.length > 0) {
    const chosen = strongHits.includes(currentCountry) ? currentCountry : strongHits[0];
    return { country: chosen, isValid: true, regexOnly: false, matchesCurrent: chosen === currentCountry };
  }

  // In strict mode only: regex matches but checksum failed — still identify
  // the country so the chat can flag "looks like X but check digit fails".
  if (STRICT_ID_CHECKSUM) {
    const weakHits = COUNTRIES.filter(c => ID_PATTERNS[c].test(normalized));
    if (weakHits.length > 0) {
      const chosen = weakHits.includes(currentCountry) ? currentCountry : weakHits[0];
      return { country: chosen, isValid: false, regexOnly: true, matchesCurrent: chosen === currentCountry };
    }
  }

  return { country: null, isValid: false, regexOnly: false, matchesCurrent: false };
}

/**
 * Detect which country a phone value belongs to, using libphonenumber.
 *
 * libphonenumber's `defaultCountry` does NOT auto-detect the country — it
 * forces interpretation as that country. So we try each supported country
 * as a hint and collect every valid-mobile match. When multiple countries
 * match (e.g., 8-digit number starting with 9 matches both SG and HK), we
 * prefer currentCountry as the tie-breaker. An explicit country code in
 * the input collapses all hints to the same answer automatically.
 */
export function detectPhone(value, currentCountry) {
  if (!value || !value.trim()) {
    return { country: null, isValid: false, matchesCurrent: false, formatted: "", nationalNumber: "" };
  }

  const buildResult = (parsed) => ({
    country: parsed.country,
    isValid: true,
    matchesCurrent: parsed.country === currentCountry,
    formatted: parsed.formatInternational(),
    nationalNumber: parsed.nationalNumber,
  });

  // Pass 1: explicit country code present (e.g., +60, +86). libphonenumber
  // returns the actual country regardless of hint, so try without a hint first.
  let noHint;
  try { noHint = parsePhoneNumberFromString(value); } catch { noHint = null; }
  if (noHint && noHint.country && COUNTRIES.includes(noHint.country)
      && noHint.isValid() && noHint.getType() === "MOBILE") {
    return buildResult(noHint);
  }

  // Pass 2: ambiguous local number. Try each country as hint; only count a
  // match when libphonenumber confirms validity as a MOBILE for THAT country
  // (parsed.country === hint, isValid, type === MOBILE).
  const candidates = [];
  for (const c of COUNTRIES) {
    let parsed;
    try { parsed = parsePhoneNumberFromString(value, c); } catch { parsed = null; }
    if (!parsed || parsed.country !== c) continue;
    if (!parsed.isValid() || parsed.getType() !== "MOBILE") continue;
    candidates.push(parsed);
  }

  if (candidates.length === 0) {
    return { country: null, isValid: false, matchesCurrent: false, formatted: "", nationalNumber: "" };
  }

  // Prefer currentCountry as tiebreaker when more than one country matches
  const chosen = candidates.find(p => p.country === currentCountry) || candidates[0];
  return buildResult(chosen);
}

/**
 * Parse a free-text country choice from a user reply.
 * Returns SG/MY/CN/HK or null if the reply is too ambiguous.
 */
export function parseCountryChoice(text) {
  const t = text.toLowerCase().trim();
  if (/\b(sg|singapore)\b/.test(t)) return "SG";
  if (/\b(my|malaysia|malaysian)\b/.test(t)) return "MY";
  if (/\b(cn|china|chinese|prc)\b/.test(t)) return "CN";
  if (/\b(hk|hong\s*kong)\b/.test(t)) return "HK";
  return null;
}
