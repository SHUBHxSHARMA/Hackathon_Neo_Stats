import "dotenv/config";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import projectRoutes from "./routes/projects.js";
import memberRoutes from "./routes/members.js";
import { projectTaskRouter, taskRouter } from "./routes/tasks.js";
import commentRoutes from "./routes/comments.js";
import meRoutes from "./routes/me.js";
import { sendError } from "./lib/errors.js";
import { prisma } from "./lib/prisma.js";

const app = express();
const port = Number(process.env.PORT) || 4000;

if (!process.env.JWT_SECRET) {
  console.warn("JWT_SECRET is missing. Set it in server/.env before logging in.");
}

app.use(cors({ origin: ["http://localhost:5173"], credentials: true }));
app.use(express.json());

app.get("/api/health", async (_req, res) => {
  let database = "disconnected";
  try {
    await prisma.$queryRaw`SELECT 1`;
    database = "connected";
  } catch {
    database = "disconnected";
  }
  res.json({ ok: true, name: "WorkNest API", database });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/me", meRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/projects/:projectId/members", memberRoutes);
app.use("/api/projects/:projectId/tasks", projectTaskRouter);
app.use("/api/tasks", taskRouter);
app.use("/api", commentRoutes);

app.use((_req, res) => {
  sendError(res, 404, "NOT_FOUND", "Route not found.");
});

app.use((err, _req, res, _next) => {
  console.error(err);
  const prismaCode = err.code || err.errorCode;
  const dbDown =
    prismaCode === "P1001" ||
    prismaCode === "P1003" ||
    prismaCode === "P1017" ||
    err.name === "PrismaClientInitializationError" ||
    /Can't reach database server/i.test(String(err.message || ""));
  if (dbDown) {
    return sendError(
      res,
      503,
      "DB_UNAVAILABLE",
      "PostgreSQL is not running on this laptop yet. Start it, create database neoboard, then run migrate and seed."
    );
  }
  sendError(res, 500, "SERVER_ERROR", "Something went wrong on the server.");
});

app.listen(port, () => {
  console.log(`WorkNest API running on http://localhost:${port}`);
});
