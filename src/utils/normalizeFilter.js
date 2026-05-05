// Canonical country name → ISO code map for common variations
const COUNTRY_ALIASES = {
  nigeria: "NG",
  nigerian: "NG",
  kenya: "KE",
  kenyan: "KE",
  ghana: "GH",
  ghanaian: "GH",
  "south africa": "ZA",
  "south african": "ZA",
  ethiopia: "ET",
  ethiopian: "ET",
  egypt: "EG",
  egyptian: "EG",
  tanzania: "TZ",
  tanzanian: "TZ",
  uganda: "UG",
  ugandan: "UG",
  senegal: "SN",
  senegalese: "SN",
  morocco: "MA",
  moroccan: "MA",
};

const GENDER_ALIASES = {
  male: "male",
  man: "male",
  men: "male",
  boy: "male",
  boys: "male",
  males: "male",
  female: "female",
  woman: "female",
  women: "female",
  girl: "female",
  girls: "female",
  females: "female",
};

const AGE_GROUP_ALIASES = {
  child: "child",
  children: "child",
  kids: "child",
  kid: "child",
  teen: "teenager",
  teens: "teenager",
  teenager: "teenager",
  teenagers: "teenager",
  adolescent: "teenager",
  adult: "adult",
  adults: "adult",
  senior: "senior",
  seniors: "senior",
  elderly: "senior",
  old: "senior",
  young: null, // "young" maps to an age range, not an age_group — handled separately
};

/**
 * Normalizes a parsed filter object into a canonical form.
 * Two semantically equivalent filters will produce identical output.
 *
 * Input: raw query params object (from req.query or parseNaturalQuery output)
 * Output: normalized filter object with consistent field names and values
 */
export function normalizeFilter(raw) {
  const out = {};

  // ── gender ───────────────────────────────────────────────────────────────
  if (raw.gender) {
    const g = GENDER_ALIASES[raw.gender.toLowerCase().trim()];
    if (g) out.gender = g;
  }

  // ── country ──────────────────────────────────────────────────────────────
  if (raw.country_id) {
    const c = raw.country_id.trim().toUpperCase();
    // Accept ISO codes directly (2 chars), or try alias map
    out.country_id =
      c.length === 2
        ? c
        : COUNTRY_ALIASES[raw.country_id.toLowerCase().trim()] || c;
  }

  // ── age group ─────────────────────────────────────────────────────────────
  if (raw.age_group) {
    const ag = AGE_GROUP_ALIASES[raw.age_group.toLowerCase().trim()];
    if (ag) out.age_group = ag;
  }

  // ── age range — normalize to numbers, sort min/max ────────────────────────
  const minAge = raw.min_age !== undefined ? Number(raw.min_age) : undefined;
  const maxAge = raw.max_age !== undefined ? Number(raw.max_age) : undefined;

  if (!isNaN(minAge) && minAge >= 0) out.min_age = minAge;
  if (!isNaN(maxAge) && maxAge >= 0) out.max_age = maxAge;

  // Swap if min > max (user error — correct silently)
  if (
    out.min_age !== undefined &&
    out.max_age !== undefined &&
    out.min_age > out.max_age
  ) {
    [out.min_age, out.max_age] = [out.max_age, out.min_age];
  }

  // ── pagination — normalize to integers ────────────────────────────────────
  if (raw.page) out.page = Math.max(1, parseInt(raw.page));
  if (raw.limit) out.limit = Math.min(50, Math.max(1, parseInt(raw.limit)));

  // ── sort — normalize field names and order values ─────────────────────────
  const ALLOWED_SORT = ["age", "created_at", "gender_probability"];
  if (raw.sort_by && ALLOWED_SORT.includes(raw.sort_by)) {
    out.sort_by = raw.sort_by;
    out.order = raw.order === "asc" ? "asc" : "desc";
  }

  return out;
}

/**
 * Produces a deterministic cache key from a normalized filter.
 * Keys are sorted alphabetically so field order never affects the key.
 */
export function filterToCacheKey(normalizedFilter) {
  return JSON.stringify(
    Object.keys(normalizedFilter)
      .sort()
      .reduce((acc, k) => {
        acc[k] = normalizedFilter[k];
        return acc;
      }, {}),
  );
}
