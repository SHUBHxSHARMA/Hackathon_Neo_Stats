import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { asyncHandler, sendError, sendValidation } from "../lib/errors.js";
import { paginate, publicTask } from "../lib/serialize.js";
import { requireAuth } from "../middleware/auth.js";
import { USER_INCLUDE, findRoleByName, globalRoleName } from "../lib/roles.js";
import {
  hasProjectRole,
  loadProject,
  requireProjectAccess,
  requireProjectRoles,
  MANAGERS,
  WRITERS,
  READERS,
} from "../middleware/authorize.js";

const PRIORITIES = ["low", "medium", "high"];
const STATUSES = ["todo", "in_progress", "done"];

function parseDueDate(value) {
  if (value === undefined) return { skip: true };
  if (value === null || value === "") return { value: null };

  const text = String(value).trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (!match) {
    return { error: "Due date must be a real calendar date." };
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 2000 || year > 2100) {
    return { error: "Due date year must be between 2000 and 2100." };
  }

  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return { error: "Due date must be a real calendar date." };
  }

  return { value: date };
}

const createSchema = z.object({
  title: z.string().min(2).max(160),
  description: z.string().max(4000).optional(),
  status: z.enum(STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  dueDate: z.union([z.string(), z.null()]).optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  asProjectManager: z.boolean().optional(),
});

const updateSchema = z.object({
  version: z.coerce.number().int().positive(),
  title: z.string().min(2).max(160).optional(),
  description: z.string().max(4000).optional(),
  status: z.enum(STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  dueDate: z.union([z.string(), z.null()]).optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  asProjectManager: z.boolean().optional(),
});

async function ensureTaskAssignee(projectId, userId, actor, asProjectManager) {
  if (!userId) return null;

  const person = await prisma.user.findUnique({ where: { id: userId } });
  if (!person || !person.isActive) {
    return { error: { status: 404, code: "NOT_FOUND", message: "User not found or inactive." } };
  }

  const makePm = Boolean(asProjectManager) && globalRoleName(actor) === "admin";
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });

  if (!member && !makePm) {
    return {
      error: {
        status: 400,
        code: "VALIDATION",
        message: "Assignee must be a member of this project.",
      },
    };
  }

  if (makePm) {
    const pmRole = await findRoleByName("project_manager");
    if (!pmRole) {
      return { error: { status: 500, code: "SERVER_ERROR", message: "project_manager role is missing." } };
    }
    if (!member) {
      await prisma.projectMember.create({
        data: { projectId, userId, roleId: pmRole.id },
      });
    } else {
      await prisma.projectMember.update({
        where: { id: member.id },
        data: { roleId: pmRole.id },
      });
    }
  }

  return { assigneeId: userId };
}

const taskInclude = {
  assignee: { include: USER_INCLUDE },
  createdBy: { include: USER_INCLUDE },
  _count: { select: { comments: true } },
};

function canEditTask(user, membership, _task) {
  if (hasProjectRole(user, membership, MANAGERS)) return true;
  return hasProjectRole(user, membership, WRITERS);
}

const projectTaskRouter = Router({ mergeParams: true });

projectTaskRouter.get(
  "/",
  requireAuth,
  loadProject,
  requireProjectAccess,
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = paginate(req.query);
    const where = { projectId: req.project.id };

    if (["todo", "in_progress", "done"].includes(req.query.status)) {
      where.status = req.query.status;
    }
    if (typeof req.query.assigneeId === "string" && req.query.assigneeId) {
      where.assigneeId = req.query.assigneeId;
    }

    const [items, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: "desc" },
        include: taskInclude,
      }),
      prisma.task.count({ where }),
    ]);

    res.json({ items: items.map(publicTask), page, limit, total });
  })
);

projectTaskRouter.post(
  "/",
  requireAuth,
  loadProject,
  requireProjectRoles(MANAGERS),
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return sendValidation(res, parsed.error.issues);

    const due = parseDueDate(parsed.data.dueDate);
    if (due.error) return sendError(res, 400, "VALIDATION", due.error);

    let assigneeId = parsed.data.assigneeId ?? null;
    if (assigneeId) {
      const resolved = await ensureTaskAssignee(
        req.project.id,
        assigneeId,
        req.user,
        parsed.data.asProjectManager
      );
      if (resolved.error) {
        return sendError(res, resolved.error.status, resolved.error.code, resolved.error.message);
      }
      assigneeId = resolved.assigneeId;
    }

    const task = await prisma.task.create({
      data: {
        projectId: req.project.id,
        title: parsed.data.title,
        description: parsed.data.description ?? "",
        status: parsed.data.status ?? "todo",
        priority: parsed.data.priority ?? "medium",
        dueDate: due.skip ? null : due.value,
        assigneeId,
        createdById: req.user.id,
      },
      include: taskInclude,
    });

    res.status(201).json({ task: publicTask(task) });
  })
);

const taskRouter = Router();

taskRouter.get(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: { ...taskInclude, project: true },
    });
    if (!task) return sendError(res, 404, "NOT_FOUND", "Task not found.");

    req.params.projectId = task.projectId;
    await loadProject(req, res, () => {
      if (!hasProjectRole(req.user, req.membership, READERS)) {
        return sendError(res, 403, "FORBIDDEN", "You are not on this project.");
      }
      res.json({ task: publicTask(task) });
    });
  })
);

taskRouter.patch(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) return sendValidation(res, parsed.error.issues);

    const due = parseDueDate(parsed.data.dueDate);
    if (due.error) return sendError(res, 400, "VALIDATION", due.error);

    const task = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!task) return sendError(res, 404, "NOT_FOUND", "Task not found.");

    req.params.projectId = task.projectId;
    await loadProject(req, res, async () => {
      if (!canEditTask(req.user, req.membership, task)) {
        return sendError(
          res,
          403,
          "FORBIDDEN",
          "You can only update tasks assigned to you."
        );
      }

      if (
        parsed.data.assigneeId !== undefined &&
        !hasProjectRole(req.user, req.membership, MANAGERS)
      ) {
        return sendError(res, 403, "FORBIDDEN", "Only a project manager can reassign a task.");
      }

      if (parsed.data.assigneeId) {
        const resolved = await ensureTaskAssignee(
          task.projectId,
          parsed.data.assigneeId,
          req.user,
          parsed.data.asProjectManager
        );
        if (resolved.error) {
          return sendError(res, resolved.error.status, resolved.error.code, resolved.error.message);
        }
      }

      const data = {};
      if (parsed.data.title !== undefined) data.title = parsed.data.title;
      if (parsed.data.description !== undefined) data.description = parsed.data.description;
      if (parsed.data.status !== undefined) data.status = parsed.data.status;
      if (parsed.data.priority !== undefined) data.priority = parsed.data.priority;
      if (!due.skip) data.dueDate = due.value;
      if (parsed.data.assigneeId !== undefined) data.assigneeId = parsed.data.assigneeId;

      const result = await prisma.task.updateMany({
        where: { id: task.id, version: parsed.data.version },
        data: { ...data, version: { increment: 1 }, updatedAt: new Date() },
      });

      if (result.count === 0) {
        const latest = await prisma.task.findUnique({
          where: { id: task.id },
          include: taskInclude,
        });
        if (!latest) {
          return sendError(res, 404, "NOT_FOUND", "Task not found.");
        }
        return sendError(
          res,
          409,
          "CONFLICT",
          "This task was updated by someone else. Reload the latest version.",
          { task: publicTask(latest) }
        );
      }

      const updated = await prisma.task.findUnique({
        where: { id: task.id },
        include: taskInclude,
      });
      res.json({ task: publicTask(updated) });
    });
  })
);

taskRouter.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const task = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!task) return sendError(res, 404, "NOT_FOUND", "Task not found.");

    req.params.projectId = task.projectId;
    await loadProject(req, res, async () => {
      if (!hasProjectRole(req.user, req.membership, MANAGERS)) {
        return sendError(res, 403, "FORBIDDEN", "Only a project manager can delete tasks.");
      }
      await prisma.task.delete({ where: { id: task.id } });
      res.status(204).send();
    });
  })
);

export { projectTaskRouter, taskRouter };
