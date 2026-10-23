import { prisma } from "./prisma.js";

export const USER_INCLUDE = { globalRole: true };

export const MEMBER_INCLUDE = {
  role: true,
  user: { include: { globalRole: true } },
};

export function globalRoleName(user) {
  if (!user) return null;
  if (typeof user.globalRole === "string") return user.globalRole;
  return user.globalRole?.name ?? null;
}

export function memberRoleName(membership) {
  if (!membership) return null;
  if (typeof membership.role === "string") return membership.role;
  return membership.role?.name ?? null;
}

export async function findRoleByName(name) {
  return prisma.role.findUnique({ where: { name } });
}
