import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { asyncHandler, sendError, sendValidation } from "../lib/errors.js";
import { paginate, publicProject } from "../lib/serialize.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { USER_INCLUDE, globalRoleName, memberRoleName } from "../lib/roles.js";
import {
  loadProject,
  requireProjectAccess,
  requireProjectRoles,
  MANAGERS,
} from "../middleware/authorize.js";

const router = Router();

const createSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(2000).optional(),
});

const updateSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  description: z.string().max(2000).optional(),
});

router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = paginate(req.query);
    const status = req.query.status === "archived" ? "archived" : "active";

    const where =
      globalRoleName(req.user) === "admin"
        ? { status }
        : {
            status,
            members: { some: { userId: req.user.id } },
          };

    const [items, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: "desc" },
        include: {
          createdBy: { include: USER_INCLUDE },
          _count: { select: { members: true, tasks: true } },
          members: { where: { userId: req.user.id }, include: { role: true } },
        },
      }),
      prisma.project.count({ where }),
    ]);

    res.json({
      items: items.map((project) =>
        publicProject(project, {
          myRole:
            globalRoleName(req.user) === "admin"
              ? "admin"
              : memberRoleName(project.members[0]),
        })
      ),
      page,
      limit,
      total,
    });
  })
);

router.post(
  "/",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return sendValidation(res, parsed.error.issues);

    const project = await prisma.project.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description ?? "",
        createdById: req.user.id,
      },
      include: {
        createdBy: { include: USER_INCLUDE },
        _count: { select: { members: true, tasks: true } },
      },
    });

    res.status(201).json({
      project: publicProject(project, { myRole: "admin" }),
    });
  })
);

router.get(
  "/:id",
  requireAuth,
  loadProject,
  requireProjectAccess,
  asyncHandler(async (req, res) => {
    const project = await prisma.project.findUnique({
      where: { id: req.project.id },
      include: {
        createdBy: { include: USER_INCLUDE },
        _count: { select: { members: true, tasks: true } },
      },
    });

    res.json({
      project: publicProject(project, {
        myRole:
          globalRoleName(req.user) === "admin" ? "admin" : memberRoleName(req.membership),
      }),
    });
  })
);

router.patch(
  "/:id",
  requireAuth,
  loadProject,
  requireProjectRoles(MANAGERS),
  asyncHandler(async (req, res) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) return sendValidation(res, parsed.error.issues);

    const project = await prisma.project.update({
      where: { id: req.project.id },
      data: parsed.data,
      include: {
        createdBy: { include: USER_INCLUDE },
        _count: { select: { members: true, tasks: true } },
      },
    });

    res.json({
      project: publicProject(project, {
        myRole:
          globalRoleName(req.user) === "admin" ? "admin" : memberRoleName(req.membership),
      }),
    });
  })
);

router.post(
  "/:id/archive",
  requireAuth,
  requireAdmin,
  loadProject,
  asyncHandler(async (req, res) => {
    if (req.project.status === "archived") {
      return sendError(res, 400, "VALIDATION", "Project is already archived.");
    }

    const project = await prisma.project.update({
      where: { id: req.project.id },
      data: { status: "archived" },
      include: {
        createdBy: { include: USER_INCLUDE },
        _count: { select: { members: true, tasks: true } },
      },
    });

    res.json({ project: publicProject(project, { myRole: "admin" }) });
  })
);

router.delete(
  "/:id",
  requireAuth,
  requireAdmin,
  loadProject,
  asyncHandler(async (req, res) => {
    await prisma.project.delete({ where: { id: req.project.id } });
    res.status(204).send();
  })
);

export default router;
