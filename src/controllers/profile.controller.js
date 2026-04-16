import axios from "axios";
import { v7 as uuidv7 } from "uuid";
import { Profile } from "../models/profile.model.js";
import { validate as isUUID } from "uuid";
import { externalApiError } from "../lib/utils.js";

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

const getAllProfiles = async (req, res) => {
  try {
    const { gender, country_id, age_group } = req.query;

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

    //Get data from database
    const profiles = await Profile.find(query).select(
      "id name gender age age_group country_id",
    );

    res.status(200).json({
      status: "success",
      count: profiles.length,
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

export { CreateProfile, getSingleProfile, getAllProfiles, deleteProfile };
