import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { asyncHandler, sendError, sendValidation } from "../lib/errors.js";
import { paginate, publicComment } from "../lib/serialize.js";
import { requireAuth } from "../middleware/auth.js";
import {
  hasProjectRole,
  loadProject,
  MANAGERS,
  WRITERS,
  READERS,
} from "../middleware/authorize.js";

const createSchema = z.object({
  body: z.string().min(1).max(2000),
});

const router = Router();

async function withTaskProject(req, res, taskId, nextFn) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return sendError(res, 404, "NOT_FOUND", "Task not found.");
  req.params.projectId = task.projectId;
  req.task = task;
  await loadProject(req, res, nextFn);
}

router.get(
  "/tasks/:id/comments",
  requireAuth,
  asyncHandler(async (req, res) => {
    await withTaskProject(req, res, req.params.id, async () => {
      if (!hasProjectRole(req.user, req.membership, READERS)) {
        return sendError(res, 403, "FORBIDDEN", "You are not on this project.");
      }

      const { page, limit, skip } = paginate(req.query);
      const where = { taskId: req.task.id };
      const [rows, total] = await Promise.all([
        prisma.comment.findMany({
          where,
          skip,
          take: limit,
          include: { user: { include: { globalRole: true } } },
          orderBy: { createdAt: "asc" },
        }),
        prisma.comment.count({ where }),
      ]);
      const items = rows.map(publicComment);
      res.json({ items, comments: items, page, limit, total });
    });
  })
);

router.post(
  "/tasks/:id/comments",
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return sendValidation(res, parsed.error.issues);

    await withTaskProject(req, res, req.params.id, async () => {
      if (!hasProjectRole(req.user, req.membership, WRITERS)) {
        return sendError(res, 403, "FORBIDDEN", "Viewers cannot comment.");
      }

      const comment = await prisma.comment.create({
        data: {
          taskId: req.task.id,
          userId: req.user.id,
          body: parsed.data.body,
        },
        include: { user: { include: { globalRole: true } } },
      });

      res.status(201).json({ comment: publicComment(comment) });
    });
  })
);

router.delete(
  "/comments/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const comment = await prisma.comment.findUnique({
      where: { id: req.params.id },
      include: { task: true },
    });
    if (!comment) return sendError(res, 404, "NOT_FOUND", "Comment not found.");

    req.params.projectId = comment.task.projectId;
    await loadProject(req, res, async () => {
      const isAuthor = comment.userId === req.user.id;
      const isManager = hasProjectRole(req.user, req.membership, MANAGERS);
      if (!isAuthor && !isManager) {
        return sendError(res, 403, "FORBIDDEN", "You can only delete your own comment.");
      }

      await prisma.comment.delete({ where: { id: comment.id } });
      res.status(204).send();
    });
  })
);

export default router;
