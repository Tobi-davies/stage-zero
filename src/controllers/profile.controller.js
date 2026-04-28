import axios from "axios";
import { v7 as uuidv7 } from "uuid";
import { Profile } from "../models/profile.model.js";
import { validate as isUUID } from "uuid";
import { externalApiError } from "../lib/utils.js";
import { parseNaturalQuery } from "../utils/naturalLang.js";

const CreateProfile = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        status: "error",
        message: "Name is required",
      });
    }

    if (typeof name !== "string") {
      return res.status(422).json({
        status: "error",
        message: "Name must be a string",
      });
    }

    const formattedName = name.trim().toLowerCase();

    // idempotency
    const existingProfile = await Profile.findOne({ name: formattedName });

    if (existingProfile) {
      return res.status(200).json({
        status: "success",
        message: "Profile already exists",
        data: existingProfile,
      });
    }

    //call external APIs
    const [genderDetails, ageDetails, nationalityDetails] = await Promise.all([
      axios.get(`https://api.genderize.io?name=${name}`),
      axios.get(`https://api.agify.io?name=${name}`),
      axios.get(`https://api.nationalize.io?name=${name}`),
    ]);

    const { gender, probability, count } = genderDetails.data;

    const { age } = ageDetails?.data;

    const { country } = nationalityDetails?.data;

    console.log(nationalityDetails.data);

    //error handling
    if (!gender || count === 0) {
      return externalApiError(res, "Genderize");
    }

    if (age === null) {
      return externalApiError(res, "Agify");
    }

    if (!country || country.length === 0) {
      return externalApiError(res, "Nationalize");
    }

    const now = new Date().toISOString();

    const selectedCountry = country.reduce((max, current) =>
      current.probability > max.probability ? current : max,
    );

    const result = {
      id: uuidv7(),
      name,
      gender,
      gender_probability: probability,
      sample_size: count,
      age,
      age_group:
        age === 0 || age < 12
          ? "child"
          : age >= 13 && age < 20
            ? "teenager"
            : age >= 20 && age < 60
              ? "adult"
              : "senior",
      country_id: selectedCountry?.country_id,
      country_probability: selectedCountry?.probability,
      created_at: now,
    };

    //create profile
    const profile = await Profile.create({
      ...result,
    });

    res.status(201).json({
      status: "success",
      data: profile,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Something went wrong",
      error,
    });
  }
};

//Fetch single profile
const getSingleProfile = async (req, res) => {
  try {
    const { id } = req.params;

    //validate id
    if (!id) {
      return res.status(400).json({
        status: "error",
        message: "Profile ID is required",
      });
    }

    if (!isUUID(id)) {
      return res.status(422).json({
        status: "error",
        message: "Invalid ID format",
      });
    }

    const profile = await Profile.findOne({ id });

    if (!profile) {
      return res.status(404).json({
        status: "error",
        message: "Profile not found",
      });
    }

    res.status(200).json({
      status: "success",
      data: profile,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

// Fetch all profile
const getAllProfiles = async (req, res) => {
  try {
    const {
      gender,
      country_id,
      age_group,
      min_age,
      max_age,
      min_gender_probability,
      min_country_probability,
      sort_by,
      order,
      page = 1,
      limit = 10,
    } = req.query;

    const query = {};

    if (gender) {
      query.gender = new RegExp(`^${gender}$`, "i");
    }

    if (country_id) {
      query.country_id = new RegExp(`^${country_id}$`, "i");
    }

    if (age_group) {
      query.age_group = new RegExp(`^${age_group}$`, "i");
    }

    // if (min_age) {
    //   query.age = { $gte: Number(min_age) };
    // }

    // if (max_age) {
    //   query.age = { $lte: Number(max_age) };
    // }

    if (min_age || max_age) {
      query.age = {};
      if (min_age) query.age.$gte = Number(min_age);
      if (max_age) query.age.$lte = Number(max_age);
    }

    if (min_country_probability) {
      query.country_probability = {};
      if (min_country_probability)
        query.country_probability.$gte = Number(min_country_probability);
    }

    if (min_gender_probability) {
      query.gender_probability = {};
      if (min_gender_probability)
        query.gender_probability.$gte = Number(min_gender_probability);
    }

    // default sorting
    let sortOption = { created_at: -1 };

    if (sort_by) {
      const allowedFields = ["age", "created_at", "gender_probability"];

      // validate field
      if (!allowedFields.includes(sort_by)) {
        return res.status(422).json({
          status: "error",
          message: "Invalid query parameters",
        });
      }

      // normalize order
      const sortOrder = order === "asc" ? 1 : -1;

      sortOption = {
        [sort_by]: sortOrder,
      };
    }

    // 📄 Pagination
    const pageNumber = Number(page);
    const limitNumber = Math.min(Number(limit) || 10, 50);
    const skip = (pageNumber - 1) * limitNumber;

    //Get data from database
    // const profiles = await Profile.find(query).select(
    //   "id name gender age age_group country_id",
    // );

    // Query execution
    const [profiles, total] = await Promise.all([
      Profile.find(query).sort(sortOption).skip(skip).limit(limitNumber),
      Profile.countDocuments(query),
    ]);

    // console.log(total, "totaltotal");
    // ?gender=male&country_id=NG&min_age=25&max_age=40&page=2&limit=15

    res.status(200).json({
      status: "success",
      page: pageNumber,
      limit: limitNumber,
      total: total,
      data: profiles,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

const SearchProfiles = async (req, res) => {
  try {
    const { q, page = 1, limit = 10 } = req.query;
    console.log(q);

    const filter = parseNaturalQuery(q);

    if (!filter) {
      return res.status(400).json({
        status: "error",
        message: "Unable to interpret query",
      });
    }

    // pagination
    const limitNum = Math.min(Number(limit) || 10, 50);
    const pageNum = Math.max(Number(page) || 1, 1);
    const skip = (pageNum - 1) * limitNum;

    const [profiles, total] = await Promise.all([
      Profile.find(filter).skip(skip).limit(limitNum),
      Profile.countDocuments(filter),
    ]);

    res.status(200).json({
      status: "success",
      page: pageNum,
      limit: limitNum,
      total,
      data: profiles,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

const deleteProfile = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        status: "error",
        message: "Profile ID is required",
      });
    }

    const deleted = await Profile.findOneAndDelete({ id });

    if (!deleted)
      return res.status(404).json({
        status: "error",
        message: "Profile not found",
      });

    return res.status(204).send();
  } catch (error) {
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
};

export {
  CreateProfile,
  getSingleProfile,
  getAllProfiles,
  deleteProfile,
  SearchProfiles,
};
