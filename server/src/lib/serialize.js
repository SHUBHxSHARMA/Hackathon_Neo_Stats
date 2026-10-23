import { globalRoleName, memberRoleName } from "./roles.js";

export function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    globalRole: globalRoleName(user),
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export function publicMember(member) {
  return {
    id: member.id,
    projectId: member.projectId,
    userId: member.userId,
    role: memberRoleName(member),
    createdAt: member.createdAt,
    user: member.user ? publicUser(member.user) : undefined,
  };
}

export function publicProject(project, extras = {}) {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    status: project.status,
    createdById: project.createdById,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    createdBy: project.createdBy ? publicUser(project.createdBy) : undefined,
    memberCount: project._count?.members,
    taskCount: project._count?.tasks,
    myRole: extras.myRole ?? null,
  };
}

function publicDateOnly(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function publicTask(task) {
  return {
    id: task.id,
    projectId: task.projectId,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueDate: publicDateOnly(task.dueDate),
    version: task.version,
    assigneeId: task.assigneeId,
    createdById: task.createdById,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    assignee: task.assignee ? publicUser(task.assignee) : null,
    createdBy: task.createdBy ? publicUser(task.createdBy) : undefined,
    commentCount: task._count?.comments,
  };
}

export function publicComment(comment) {
  return {
    id: comment.id,
    taskId: comment.taskId,
    userId: comment.userId,
    body: comment.body,
    createdAt: comment.createdAt,
    user: comment.user ? publicUser(comment.user) : undefined,
  };
}

export function paginate(query) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(query.limit) || 20));
  return { page, limit, skip: (page - 1) * limit };
}
