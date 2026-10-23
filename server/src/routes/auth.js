import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { asyncHandler, sendError, sendValidation } from "../lib/errors.js";
import { publicUser } from "../lib/serialize.js";
import { requireAuth, signToken } from "../middleware/auth.js";
import { USER_INCLUDE } from "../lib/roles.js";

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return sendValidation(res, parsed.error.issues);

    const email = parsed.data.email.toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email },
      include: USER_INCLUDE,
    });

    if (!user || !user.isActive) {
      return sendError(res, 401, "UNAUTHORIZED", "Invalid email or password.");
    }

    const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!ok) {
      return sendError(res, 401, "UNAUTHORIZED", "Invalid email or password.");
    }

    res.json({ token: signToken(user), user: publicUser(user) });
  })
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: publicUser(req.user) });
  })
);

export default router;
