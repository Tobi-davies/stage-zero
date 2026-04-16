export const externalApiError = (res, apiName) => {
  return res.status(502).json({
    status: "502",
    message: `${apiName} returned an invalid response`,
  });
};
