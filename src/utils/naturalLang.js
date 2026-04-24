import fs from "fs";

export const parseNaturalQuery = (query) => {
  const data = JSON.parse(fs.readFileSync("src/seed_profiles.json", "utf-8"));

  const countries = {};

  data.profiles.forEach((p) => {
    const key = p.country_name?.toLowerCase();
    if (key && !countries[key]) {
      countries[key] = p.country_id;
    }
  });

  if (!query) return null;

  const q = query.toLowerCase();

  const filter = {};

  let interpreted = false;

  const hasMale = /\bmale\b/.test(q);
  const hasFemale = /\bfemale\b/.test(q);

  if (hasMale && hasFemale) {
    // (returns male + female)
  } else if (hasMale) {
    filter.gender = "male";
  } else if (hasFemale) {
    filter.gender = "female";
  }

  // ✅ Age groups
  if (q.includes("child")) {
    filter.age_group = "child";
    interpreted = true;
  }

  if (q.includes("teen")) {
    filter.age_group = "teenager";
    interpreted = true;
  }

  if (q.includes("adult")) {
    filter.age_group = "adult";
    interpreted = true;
  }

  if (q.includes("senior")) {
    filter.age_group = "senior";
    interpreted = true;
  }

  // ✅ "young"
  if (q.includes("young")) {
    filter.age = { $gte: 16, $lte: 24 };
    interpreted = true;
  }
  // ✅ "old"
  if (q.includes("old")) {
    filter.age = { $gte: 60 };
    interpreted = true;
  }

  if (q.includes("people")) {
  }

  // ✅ "above X"
  const aboveMatch = q.match(/above (\d+)/);
  if (aboveMatch) {
    const age = Number(aboveMatch[1]);
    filter.age = { ...(filter.age || {}), $gt: age };
    interpreted = true;
  }

  // ✅ "below X"
  const belowMatch = q.match(/below (\d+)/);
  if (belowMatch) {
    const age = Number(belowMatch[1]);
    filter.age = { ...(filter.age || {}), $lte: age };
    interpreted = true;
  }

  // for (const country in countries) {
  //   const regex = new RegExp(`\\b${country}\\b`, "i");

  //   if (regex.test(q)) {
  //     filter.country_id = countries[country];
  //     break; // stop after first match
  //   }
  // }

  const fromMatch = q.match(/from\s+(.+)/);

  if (fromMatch) {
    const raw = fromMatch[1].toLowerCase();

    const country = Object.keys(countries)
      .sort((a, b) => b.length - a.length)
      .find((c) => raw.includes(c));

    if (country) {
      filter.country_id = countries[country];
    }
  }

  return interpreted ? filter : null;
};
