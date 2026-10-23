import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { asyncHandler, sendError, sendValidation } from "../lib/errors.js";
import { paginate, publicUser } from "../lib/serialize.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { USER_INCLUDE, findRoleByName } from "../lib/roles.js";

const router = Router();

const createSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(80),
  globalRole: z.enum(["admin", "user"]).optional(),
});

const updateSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).max(80).optional(),
  globalRole: z.enum(["admin", "user"]).optional(),
});

router.get(
  "/directory",
  requireAuth,
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    });
    res.json({ users });
  })
);

router.get(
  "/",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = paginate(req.query);
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";

    const where = q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        }
      : {};

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: USER_INCLUDE,
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ items: items.map(publicUser), page, limit, total });
  })
);

router.post(
  "/",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return sendValidation(res, parsed.error.issues);

    const email = parsed.data.email.toLowerCase();
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return sendError(res, 409, "CONFLICT", "That email is already in use.");
    }

    const role = await findRoleByName(parsed.data.globalRole ?? "user");
    if (!role || role.scope !== "global") {
      return sendError(res, 400, "VALIDATION", "globalRole must be admin or user.");
    }

    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email,
        passwordHash: await bcrypt.hash(parsed.data.password, 10),
        globalRoleId: role.id,
      },
      include: USER_INCLUDE,
    });

    res.status(201).json({ user: publicUser(user) });
  })
);

router.get(
  "/:id",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: USER_INCLUDE,
    });
    if (!user) return sendError(res, 404, "NOT_FOUND", "User not found.");
    res.json({ user: publicUser(user) });
  })
);

router.patch(
  "/:id",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) return sendValidation(res, parsed.error.issues);

    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return sendError(res, 404, "NOT_FOUND", "User not found.");

    const data = {};
    if (parsed.data.name) data.name = parsed.data.name;
    if (parsed.data.globalRole) {
      const role = await findRoleByName(parsed.data.globalRole);
      if (!role || role.scope !== "global") {
        return sendError(res, 400, "VALIDATION", "globalRole must be admin or user.");
      }
      data.globalRoleId = role.id;
    }
    if (parsed.data.email) {
      data.email = parsed.data.email.toLowerCase();
      const taken = await prisma.user.findUnique({ where: { email: data.email } });
      if (taken && taken.id !== user.id) {
        return sendError(res, 409, "CONFLICT", "That email is already in use.");
      }
    }
    if (parsed.data.password) {
      data.passwordHash = await bcrypt.hash(parsed.data.password, 10);
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data,
      include: USER_INCLUDE,
    });

    res.json({ user: publicUser(updated) });
  })
);

router.post(
  "/:id/deactivate",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    if (req.params.id === req.user.id) {
      return sendError(res, 400, "VALIDATION", "You cannot deactivate yourself.");
    }

    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return sendError(res, 404, "NOT_FOUND", "User not found.");

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { isActive: false },
      include: USER_INCLUDE,
    });

    res.json({ user: publicUser(updated) });
  })
);

router.post(
  "/:id/activate",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return sendError(res, 404, "NOT_FOUND", "User not found.");

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { isActive: true },
      include: USER_INCLUDE,
    });

    res.json({ user: publicUser(updated) });
  })
);

export default router;
