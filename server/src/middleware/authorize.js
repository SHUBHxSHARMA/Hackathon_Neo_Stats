import { prisma } from "../lib/prisma.js";
import { sendError } from "../lib/errors.js";
import { MEMBER_INCLUDE, globalRoleName, memberRoleName } from "../lib/roles.js";

export async function loadProject(req, res, next) {
  try {
    const projectId = req.params.projectId || req.params.id;
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return sendError(res, 404, "NOT_FOUND", "Project not found.");
    }

    const membership = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId: project.id, userId: req.user.id },
      },
      include: MEMBER_INCLUDE,
    });

    req.project = project;
    req.membership = membership;
    next();
  } catch (err) {
    next(err);
  }
}

export function hasProjectRole(user, membership, roles) {
  if (globalRoleName(user) === "admin") return true;
  const name = memberRoleName(membership);
  return Boolean(name && roles.includes(name));
}

export function requireProjectAccess(req, res, next) {
  if (!hasProjectRole(req.user, req.membership, ["project_manager", "team_member", "viewer"])) {
    return sendError(res, 403, "FORBIDDEN", "You are not on this project.");
  }
  next();
}

export function requireProjectRoles(roles) {
  return (req, res, next) => {
    if (!hasProjectRole(req.user, req.membership, roles)) {
      return sendError(
        res,
        403,
        "FORBIDDEN",
        "You do not have permission for this action."
      );
    }
    next();
  };
}

export const MANAGERS = ["project_manager"];
export const WRITERS = ["project_manager", "team_member"];
export const READERS = ["project_manager", "team_member", "viewer"];
