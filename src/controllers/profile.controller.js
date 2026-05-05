import axios from "axios";
import { v7 as uuidv7 } from "uuid";
import { Profile } from "../models/profile.model.js";
import { validate as isUUID } from "uuid";
import { externalApiError } from "../lib/utils.js";
import { parseNaturalQuery } from "../utils/naturalLang.js";

import { Readable } from "stream";
import { parse } from "csv-parse";
import { invalidateProfileCache } from "../middleware/cache.js";

const BATCH_SIZE = 1000; // rows per bulk insert
const VALID_GENDERS = ["male", "female"];
const VALID_GROUPS = ["child", "teenager", "adult", "senior"];

export const importProfiles = async (req, res) => {
  if (!req.file) {
    return res
      .status(400)
      .json({ status: "error", message: "CSV file required" });
  }

  const stats = {
    total_rows: 0,
    inserted: 0,
    skipped: 0,
    reasons: {
      duplicate_name: 0,
      invalid_age: 0,
      missing_fields: 0,
      invalid_gender: 0,
      invalid_age_group: 0,
      malformed_row: 0,
    },
  };

  const REQUIRED = ["name", "gender", "age", "age_group", "country_id"];
  let batch = [];

  const flushBatch = async () => {
    if (batch.length === 0) return;

    // Get existing names to skip duplicates
    const names = batch.map((r) => r.name);
    const existing = await Profile.find(
      { name: { $in: names } },
      { name: 1 },
    ).lean();
    const existingSet = new Set(existing.map((p) => p.name));

    const toInsert = [];
    for (const row of batch) {
      if (existingSet.has(row.name)) {
        stats.skipped++;
        stats.reasons.duplicate_name++;
      } else {
        toInsert.push(row);
      }
    }

    if (toInsert.length > 0) {
      try {
        await Profile.insertMany(toInsert, { ordered: false });
        stats.inserted += toInsert.length;
      } catch (err) {
        // ordered: false means partial inserts succeed
        // Handle duplicate key errors from race conditions
        if (err.writeErrors) {
          const dupes = err.writeErrors.length;
          stats.inserted += toInsert.length - dupes;
          stats.skipped += dupes;
          stats.reasons.duplicate_name += dupes;
        }
      }
    }

    batch = [];
  };

  // Stream the CSV from buffer
  const stream = Readable.from(req.file.buffer);

  const parser = stream.pipe(
    parse({
      columns: true, // use first row as headers
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    }),
  );

  try {
    for await (const row of parser) {
      stats.total_rows++;

      // Validate required fields
      const missing = REQUIRED.filter((f) => !row[f] || row[f].trim() === "");
      if (missing.length > 0) {
        stats.skipped++;
        stats.reasons.missing_fields++;
        continue;
      }

      // Validate age
      const age = Number(row.age);
      if (isNaN(age) || age < 0 || age > 150) {
        stats.skipped++;
        stats.reasons.invalid_age++;
        continue;
      }

      // Validate gender
      if (!VALID_GENDERS.includes(row.gender.toLowerCase())) {
        stats.skipped++;
        stats.reasons.invalid_gender++;
        continue;
      }

      // Validate age_group
      if (!VALID_GROUPS.includes(row.age_group.toLowerCase())) {
        stats.skipped++;
        stats.reasons.invalid_age_group++;
        continue;
      }

      batch.push({
        id: uuidv7(),
        name: row.name.trim().toLowerCase(),
        gender: row.gender.toLowerCase(),
        gender_probability: parseFloat(row.gender_probability) || 0,
        age,
        age_group: row.age_group.toLowerCase(),
        country_id: row.country_id.toUpperCase(),
        country_name: row.country_name || null,
        country_probability: parseFloat(row.country_probability) || 0,
        created_at: new Date(),
      });

      // Flush batch when it reaches BATCH_SIZE
      if (batch.length >= BATCH_SIZE) {
        await flushBatch();
      }
    }

    // Flush remaining rows
    await flushBatch();

    // Invalidate profile caches after bulk insert
    await invalidateProfileCache();

    res.json({
      status: "success",
      total_rows: stats.total_rows,
      inserted: stats.inserted,
      skipped: stats.skipped,
      reasons: stats.reasons,
    });
  } catch (err) {
    console.error("CSV import error:", err.message);
    // Return partial results if we got some rows in
    res.status(500).json({
      status: "error",
      message: "Import failed midway",
      partial: stats,
    });
  }
};

// ── helpers
function buildPaginationLinks(req, page, limit, total) {
  const total_pages = Math.ceil(total / limit);
  const base = `/api/profiles`;
  const params = new URLSearchParams(req.query);

  params.set("limit", limit);

  params.set("page", page);
  const self = `${base}?${params.toString()}`;

  params.set("page", page + 1);
  const next = page < total_pages ? `${base}?${params.toString()}` : null;

  params.set("page", page - 1);
  const prev = page > 1 ? `${base}?${params.toString()}` : null;

  return { self, next, prev, total_pages };
}

function buildQuery(queryParams) {
  const {
    gender,
    country_id,
    age_group,
    min_age,
    max_age,
    min_gender_probability,
    min_country_probability,
  } = queryParams;

  const query = {};

  if (gender) query.gender = new RegExp(`^${gender}$`, "i");
  if (country_id) query.country_id = new RegExp(`^${country_id}$`, "i");
  if (age_group) query.age_group = new RegExp(`^${age_group}$`, "i");

  if (min_age || max_age) {
    query.age = {};
    if (min_age) query.age.$gte = Number(min_age);
    if (max_age) query.age.$lte = Number(max_age);
  }

  if (min_country_probability) {
    query.country_probability = { $gte: Number(min_country_probability) };
  }

  if (min_gender_probability) {
    query.gender_probability = { $gte: Number(min_gender_probability) };
  }

  return query;
}

function buildSortOption(sort_by, order) {
  if (!sort_by) return { created_at: -1 };

  const allowedFields = ["age", "created_at", "gender_probability"];
  if (!allowedFields.includes(sort_by)) return null;

  return { [sort_by]: order === "asc" ? 1 : -1 };
}

// ── POST /api/profiles (admin only)
const CreateProfile = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res
        .status(400)
        .json({ status: "error", message: "Name is required" });
    }

    if (typeof name !== "string") {
      return res
        .status(422)
        .json({ status: "error", message: "Name must be a string" });
    }

    const formattedName = name.trim().toLowerCase();

    const existingProfile = await Profile.findOne({ name: formattedName });
    if (existingProfile) {
      return res.status(200).json({
        status: "success",
        message: "Profile already exists",
        data: existingProfile,
      });
    }

    const [genderDetails, ageDetails, nationalityDetails] = await Promise.all([
      axios.get(`https://api.genderize.io?name=${name}`),
      axios.get(`https://api.agify.io?name=${name}`),
      axios.get(`https://api.nationalize.io?name=${name}`),
    ]);

    const { gender, probability, count } = genderDetails.data;
    const { age } = ageDetails.data;
    const { country } = nationalityDetails.data;

    if (!gender || count === 0) return externalApiError(res, "Genderize");
    if (age === null) return externalApiError(res, "Agify");
    if (!country || country.length === 0)
      return externalApiError(res, "Nationalize");

    const selectedCountry = country.reduce((max, current) =>
      current.probability > max.probability ? current : max,
    );

    // Resolve country name
    let country_name = null;
    try {
      const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
      country_name = regionNames.of(selectedCountry.country_id);
    } catch (_) {}

    const result = {
      id: uuidv7(),
      name: formattedName,
      gender,
      gender_probability: probability,
      age,
      age_group:
        age < 12
          ? "child"
          : age < 20
            ? "teenager"
            : age < 60
              ? "adult"
              : "senior",
      country_id: selectedCountry.country_id,
      country_name,
      country_probability: selectedCountry.probability,
      created_at: new Date().toISOString(),
    };

    const profile = await Profile.create(result);

    res.status(201).json({ status: "success", data: profile });
  } catch (error) {
    res
      .status(500)
      .json({ status: "error", message: "Something went wrong", error });
  }
};

// ── GET /api/profiles/:id
const getSingleProfile = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isUUID(id)) {
      return res
        .status(422)
        .json({ status: "error", message: "Invalid ID format" });
    }

    const profile = await Profile.findOne({ id });

    if (!profile) {
      return res
        .status(404)
        .json({ status: "error", message: "Profile not found" });
    }

    res.status(200).json({ status: "success", data: profile });
  } catch (error) {
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
};

// ── GET /api/profiles
const getAllProfiles = async (req, res) => {
  try {
    const { sort_by, order, page = 1, limit = 10 } = req.query;

    const query = buildQuery(req.query);
    const sortOption = buildSortOption(sort_by, order);

    if (!sortOption) {
      return res
        .status(422)
        .json({ status: "error", message: "Invalid sort_by field" });
    }

    const pageNumber = Math.max(Number(page), 1);
    const limitNumber = Math.min(Number(limit) || 10, 50);
    const skip = (pageNumber - 1) * limitNumber;

    const [profiles, total] = await Promise.all([
      Profile.find(query).sort(sortOption).skip(skip).limit(limitNumber),
      Profile.countDocuments(query),
    ]);

    const { self, next, prev, total_pages } = buildPaginationLinks(
      req,
      pageNumber,
      limitNumber,
      total,
    );

    res.status(200).json({
      status: "success",
      page: pageNumber,
      limit: limitNumber,
      total,
      total_pages,
      links: { self, next, prev },
      data: profiles,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
};

// ── GET /api/profiles/search

const SearchProfiles = async (req, res) => {
  try {
    const { q, page = 1, limit = 10 } = req.query;

    if (!q) {
      return res
        .status(400)
        .json({ status: "error", message: "Query parameter q is required" });
    }

    const filter = parseNaturalQuery(q);

    if (!filter) {
      return res
        .status(400)
        .json({ status: "error", message: "Unable to interpret query" });
    }

    const pageNum = Math.max(Number(page), 1);
    const limitNum = Math.min(Number(limit) || 10, 50);
    const skip = (pageNum - 1) * limitNum;

    const [profiles, total] = await Promise.all([
      Profile.find(filter).skip(skip).limit(limitNum),
      Profile.countDocuments(filter),
    ]);

    const total_pages = Math.ceil(total / limitNum);
    const base = `/api/profiles/search`;
    const params = new URLSearchParams(req.query);

    params.set("page", pageNum);
    const self = `${base}?${params.toString()}`;
    params.set("page", pageNum + 1);
    const next = pageNum < total_pages ? `${base}?${params.toString()}` : null;
    params.set("page", pageNum - 1);
    const prev = pageNum > 1 ? `${base}?${params.toString()}` : null;

    res.status(200).json({
      status: "success",
      page: pageNum,
      limit: limitNum,
      total,
      total_pages,
      links: { self, next, prev },
      data: profiles,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
};

// ── GET /api/profiles/export

const exportProfiles = async (req, res) => {
  try {
    const { sort_by, order } = req.query;

    const query = buildQuery(req.query);
    const sortOption = buildSortOption(sort_by, order) || { created_at: -1 };

    const profiles = await Profile.find(query).sort(sortOption);

    // Build CSV
    const columns = [
      "id",
      "name",
      "gender",
      "gender_probability",
      "age",
      "age_group",
      "country_id",
      "country_name",
      "country_probability",
      "created_at",
    ];

    const header = columns.join(",");

    const rows = profiles.map((p) =>
      columns
        .map((col) => {
          const val = p[col] ?? "";
          // Wrap in quotes if value contains comma or quote
          return String(val).includes(",") ? `"${val}"` : val;
        })
        .join(","),
    );

    const csv = [header, ...rows].join("\n");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="profiles_${timestamp}.csv"`,
    );
    res.status(200).send(csv);
  } catch (error) {
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
};

// ── DELETE /api/profiles/:id (admin only)

const deleteProfile = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isUUID(id)) {
      return res
        .status(422)
        .json({ status: "error", message: "Invalid ID format" });
    }

    const deleted = await Profile.findOneAndDelete({ id });

    if (!deleted) {
      return res
        .status(404)
        .json({ status: "error", message: "Profile not found" });
    }

    return res.status(204).send();
  } catch (error) {
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
};

export {
  CreateProfile,
  getSingleProfile,
  getAllProfiles,
  SearchProfiles,
  exportProfiles,
  deleteProfile,
};
