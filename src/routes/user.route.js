import { Router } from "express";
const router = Router();

router.get("/users/me", async (req, res) => {
  const { _id, username, email, avatar_url, role, created_at, last_login_at } =
    req.user;
  res.json({
    status: "success",
    data: {
      id: _id,
      username,
      email,
      avatar_url,
      role,
      created_at,
      last_login_at,
    },
  });
});

export default router;
