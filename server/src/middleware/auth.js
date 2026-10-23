import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";
import { sendError } from "../lib/errors.js";
import { USER_INCLUDE, globalRoleName } from "../lib/roles.js";

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return sendError(res, 401, "UNAUTHORIZED", "Login required.");
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: USER_INCLUDE,
    });

    if (!user || !user.isActive) {
      return sendError(res, 401, "UNAUTHORIZED", "Account is missing or deactivated.");
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return sendError(res, 401, "UNAUTHORIZED", "Invalid or expired token.");
    }
    next(err);
  }
}

export function requireAdmin(req, res, next) {
  if (globalRoleName(req.user) !== "admin") {
    return sendError(res, 403, "FORBIDDEN", "Admin only.");
  }
  next();
}

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, globalRole: globalRoleName(user) },
    process.env.JWT_SECRET,
    { expiresIn: "12h" }
  );
}
