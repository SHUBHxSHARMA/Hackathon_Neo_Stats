import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { asyncHandler, sendError, sendValidation } from "../lib/errors.js";
import { paginate, publicMember } from "../lib/serialize.js";
import { requireAuth } from "../middleware/auth.js";
import { MEMBER_INCLUDE, findRoleByName, globalRoleName, memberRoleName } from "../lib/roles.js";
import {
  loadProject,
  requireProjectAccess,
  requireProjectRoles,
  MANAGERS,
} from "../middleware/authorize.js";

const router = Router({ mergeParams: true });

const addSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["project_manager", "team_member", "viewer"]),
});

const roleSchema = z.object({
  role: z.enum(["project_manager", "team_member", "viewer"]),
});

router.get(
  "/",
  requireAuth,
  loadProject,
  requireProjectAccess,
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = paginate(req.query);
    const where = { projectId: req.project.id };
    const [rows, total] = await Promise.all([
      prisma.projectMember.findMany({
        where,
        skip,
        take: limit,
        include: MEMBER_INCLUDE,
        orderBy: { createdAt: "asc" },
      }),
      prisma.projectMember.count({ where }),
    ]);
    const items = rows.map(publicMember);
    res.json({ items, members: items, page, limit, total });
  })
);

router.post(
  "/",
  requireAuth,
  loadProject,
  requireProjectRoles(MANAGERS),
  asyncHandler(async (req, res) => {
    const parsed = addSchema.safeParse(req.body);
    if (!parsed.success) return sendValidation(res, parsed.error.issues);

    if (parsed.data.role === "project_manager" && globalRoleName(req.user) !== "admin") {
      return sendError(
        res,
        403,
        "FORBIDDEN",
        "Only an admin can assign a project manager."
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: parsed.data.userId },
    });
    if (!user || !user.isActive) {
      return sendError(res, 404, "NOT_FOUND", "User not found or inactive.");
    }

    const existing = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: req.project.id,
          userId: user.id,
        },
      },
    });
    if (existing) {
      return sendError(res, 409, "CONFLICT", "User is already on this project.");
    }

    const role = await findRoleByName(parsed.data.role);
    if (!role || role.scope !== "project") {
      return sendError(res, 400, "VALIDATION", "Invalid project role.");
    }

    const member = await prisma.projectMember.create({
      data: {
        projectId: req.project.id,
        userId: user.id,
        roleId: role.id,
      },
      include: MEMBER_INCLUDE,
    });

    res.status(201).json({ member: publicMember(member) });
  })
);

router.patch(
  "/:userId",
  requireAuth,
  loadProject,
  requireProjectRoles(MANAGERS),
  asyncHandler(async (req, res) => {
    const parsed = roleSchema.safeParse(req.body);
    if (!parsed.success) return sendValidation(res, parsed.error.issues);

    const member = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: req.project.id,
          userId: req.params.userId,
        },
      },
      include: MEMBER_INCLUDE,
    });
    if (!member) {
      return sendError(res, 404, "NOT_FOUND", "Member not found on this project.");
    }

    if (
      globalRoleName(req.user) !== "admin" &&
      (parsed.data.role === "project_manager" || memberRoleName(member) === "project_manager")
    ) {
      return sendError(
        res,
        403,
        "FORBIDDEN",
        "Only an admin can assign or change a project manager."
      );
    }

    const role = await findRoleByName(parsed.data.role);
    if (!role || role.scope !== "project") {
      return sendError(res, 400, "VALIDATION", "Invalid project role.");
    }

    const updated = await prisma.projectMember.update({
      where: { id: member.id },
      data: { roleId: role.id },
      include: MEMBER_INCLUDE,
    });

    res.json({ member: publicMember(updated) });
  })
);

router.delete(
  "/:userId",
  requireAuth,
  loadProject,
  requireProjectRoles(MANAGERS),
  asyncHandler(async (req, res) => {
    const member = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: req.project.id,
          userId: req.params.userId,
        },
      },
      include: { role: true },
    });
    if (!member) {
      return sendError(res, 404, "NOT_FOUND", "Member not found on this project.");
    }

    if (memberRoleName(member) === "project_manager" && globalRoleName(req.user) !== "admin") {
      return sendError(
        res,
        403,
        "FORBIDDEN",
        "Only an admin can remove a project manager."
      );
    }

    await prisma.projectMember.delete({ where: { id: member.id } });
    res.status(204).send();
  })
);

export default router;
