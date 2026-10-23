import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { asyncHandler, sendValidation } from "../lib/errors.js";
import { publicUser } from "../lib/serialize.js";
import { requireAuth } from "../middleware/auth.js";
import { USER_INCLUDE } from "../lib/roles.js";

const router = Router();

const profileSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  password: z.string().min(8).max(80).optional(),
});

router.patch(
  "/profile",
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = profileSchema.safeParse(req.body);
    if (!parsed.success) return sendValidation(res, parsed.error.issues);

    const data = {};
    if (parsed.data.name) data.name = parsed.data.name;
    if (parsed.data.password) {
      data.passwordHash = await bcrypt.hash(parsed.data.password, 10);
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data,
      include: USER_INCLUDE,
    });

    res.json({ user: publicUser(user) });
  })
);

export default router;
