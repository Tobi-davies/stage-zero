import axios from "axios";

export const classifyName = async (req, res) => {
  try {
    const { name } = req.query;
    // const { name } = req.params;

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

    const response = await axios.get(`https://api.genderize.io?name=${name}`);

    console.log(response);

    const { gender, probability, count } = response.data;

    if (!gender || count === 0) {
      return res.status(404).json({
        status: "error",
        message: "No prediction available for the provided name",
      });
    }

    const result = {
      name,
      gender,
      probability,
      sample_size: count,
      is_confident: probability >= 0.7 && count >= 100,
      processed_at: new Date().toISOString(),
    };

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Something went wrong",
      error,
    });
  }
};
