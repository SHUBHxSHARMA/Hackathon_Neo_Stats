import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const password = "Password123!";

const ROLE_ROWS = [
  { id: "55555555-5555-5555-5555-555555555001", name: "admin", scope: "global" },
  { id: "55555555-5555-5555-5555-555555555002", name: "user", scope: "global" },
  { id: "55555555-5555-5555-5555-555555555003", name: "project_manager", scope: "project" },
  { id: "55555555-5555-5555-5555-555555555004", name: "team_member", scope: "project" },
  { id: "55555555-5555-5555-5555-555555555005", name: "viewer", scope: "project" },
];

async function upsertUser(passwordHash, roles, { name, email, globalRole }) {
  const role = roles[globalRole];
  return prisma.user.upsert({
    where: { email },
    update: { name, globalRoleId: role.id, isActive: true, passwordHash },
    create: { name, email, globalRoleId: role.id, passwordHash },
  });
}

async function main() {
  for (const row of ROLE_ROWS) {
    await prisma.role.upsert({
      where: { name: row.name },
      update: { scope: row.scope },
      create: row,
    });
  }
  const roles = Object.fromEntries(
    (await prisma.role.findMany()).map((role) => [role.name, role])
  );

  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await upsertUser(passwordHash, roles, {
    name: "Asha Admin",
    email: "admin@local.test",
    globalRole: "admin",
  });
  const pm = await upsertUser(passwordHash, roles, {
    name: "Priya Manager",
    email: "pm@local.test",
    globalRole: "user",
  });
  const member = await upsertUser(passwordHash, roles, {
    name: "Arjun Member",
    email: "member@local.test",
    globalRole: "user",
  });
  const viewer = await upsertUser(passwordHash, roles, {
    name: "Vikram Viewer",
    email: "viewer@local.test",
    globalRole: "user",
  });
  const sana = await upsertUser(passwordHash, roles, {
    name: "Sana Patel",
    email: "sana@local.test",
    globalRole: "user",
  });
  const meera = await upsertUser(passwordHash, roles, {
    name: "Meera Shah",
    email: "meera@local.test",
    globalRole: "user",
  });
  const kabir = await upsertUser(passwordHash, roles, {
    name: "Kabir Rao",
    email: "kabir@local.test",
    globalRole: "user",
  });
  const neha = await upsertUser(passwordHash, roles, {
    name: "Neha Iyer",
    email: "neha@local.test",
    globalRole: "user",
  });
  const rohan = await upsertUser(passwordHash, roles, {
    name: "Rohan Gupta",
    email: "rohan@local.test",
    globalRole: "user",
  });
  const leela = await upsertUser(passwordHash, roles, {
    name: "Leela Nair",
    email: "leela@local.test",
    globalRole: "user",
  });
  const intern = await upsertUser(passwordHash, roles, {
    name: "Dev Intern",
    email: "intern@local.test",
    globalRole: "user",
  });
  const tara = await upsertUser(passwordHash, roles, {
    name: "Tara Singh",
    email: "tara@local.test",
    globalRole: "user",
  });

  const project = await prisma.project.upsert({
    where: { id: "11111111-1111-1111-1111-111111111111" },
    update: {
      name: "Website relaunch",
      description: "Public marketing site for the hackathon demo.",
      status: "active",
    },
    create: {
      id: "11111111-1111-1111-1111-111111111111",
      name: "Website relaunch",
      description: "Public marketing site for the hackathon demo.",
      createdById: admin.id,
    },
  });

  for (const [userId, role] of [
    [pm.id, "project_manager"],
    [sana.id, "project_manager"],
    [member.id, "team_member"],
    [meera.id, "team_member"],
    [kabir.id, "team_member"],
    [neha.id, "team_member"],
    [viewer.id, "viewer"],
    [rohan.id, "viewer"],
  ]) {
    await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: project.id, userId } },
      update: { roleId: roles[role].id },
      create: { projectId: project.id, userId, roleId: roles[role].id },
    });
  }

  const landing = await prisma.task.upsert({
    where: { id: "22222222-2222-2222-2222-222222222222" },
    update: {
      title: "Draft landing page copy",
      description: "Headline, subcopy, and three feature blocks.",
      status: "in_progress",
      priority: "high",
      dueDate: new Date("2026-10-30T12:00:00.000Z"),
      assigneeId: member.id,
      createdById: pm.id,
    },
    create: {
      id: "22222222-2222-2222-2222-222222222222",
      projectId: project.id,
      title: "Draft landing page copy",
      description: "Headline, subcopy, and three feature blocks.",
      status: "in_progress",
      priority: "high",
      dueDate: new Date("2026-10-30T12:00:00.000Z"),
      assigneeId: member.id,
      createdById: pm.id,
      version: 1,
    },
  });

  await prisma.task.upsert({
    where: { id: "33333333-3333-3333-3333-333333333333" },
    update: {
      title: "Choose color palette",
      description: "Warm paper background, ink sidebar, teal actions.",
      status: "todo",
      priority: "medium",
      dueDate: new Date("2026-11-07T12:00:00.000Z"),
      assigneeId: pm.id,
      createdById: pm.id,
    },
    create: {
      id: "33333333-3333-3333-3333-333333333333",
      projectId: project.id,
      title: "Choose color palette",
      description: "Warm paper background, ink sidebar, teal actions.",
      status: "todo",
      priority: "medium",
      dueDate: new Date("2026-11-07T12:00:00.000Z"),
      assigneeId: pm.id,
      createdById: pm.id,
      version: 1,
    },
  });

  await prisma.comment.upsert({
    where: { id: "44444444-4444-4444-4444-444444444444" },
    update: {
      body: "Keep the first sentence under 12 words so judges can read it on a projector.",
    },
    create: {
      id: "44444444-4444-4444-4444-444444444444",
      taskId: landing.id,
      userId: pm.id,
      body: "Keep the first sentence under 12 words so judges can read it on a projector.",
    },
  });

  async function seedProject({ id, name, description, members, tasks }) {
    const created = await prisma.project.upsert({
      where: { id },
      update: { name, description, status: "active" },
      create: { id, name, description, createdById: admin.id },
    });
    for (const [userId, roleName] of members) {
      await prisma.projectMember.upsert({
        where: { projectId_userId: { projectId: created.id, userId } },
        update: { roleId: roles[roleName].id },
        create: { projectId: created.id, userId, roleId: roles[roleName].id },
      });
    }
    for (const task of tasks) {
      await prisma.task.upsert({
        where: { id: task.id },
        update: {
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority || "medium",
          dueDate: task.dueDate || null,
          assigneeId: task.assigneeId,
          createdById: task.createdById,
        },
        create: {
          id: task.id,
          projectId: created.id,
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority || "medium",
          dueDate: task.dueDate || null,
          assigneeId: task.assigneeId,
          createdById: task.createdById,
          version: 1,
        },
      });
    }
  }

  await seedProject({
    id: "11111111-1111-1111-1111-111111111112",
    name: "Mobile app beta",
    description: "Android and iOS beta for student testers.",
    members: [
      [sana.id, "project_manager"],
      [meera.id, "team_member"],
      [intern.id, "team_member"],
      [rohan.id, "viewer"],
    ],
    tasks: [
      {
        id: "22222222-2222-2222-2222-222222222223",
        title: "Fix login on small screens",
        description: "Buttons overflow on 360px width.",
        status: "in_progress",
        priority: "high",
        dueDate: new Date("2026-10-28T12:00:00.000Z"),
        assigneeId: meera.id,
        createdById: sana.id,
      },
      {
        id: "22222222-2222-2222-2222-222222222224",
        title: "Record a 30-second demo clip",
        description: "Silent screen capture for the booth laptop.",
        status: "todo",
        priority: "low",
        dueDate: new Date("2026-11-12T12:00:00.000Z"),
        assigneeId: intern.id,
        createdById: sana.id,
      },
    ],
  });

  await seedProject({
    id: "11111111-1111-1111-1111-111111111113",
    name: "Campus hiring drive",
    description: "Talks, booth roster, and follow-up mail for placements week.",
    members: [
      [pm.id, "project_manager"],
      [kabir.id, "team_member"],
      [leela.id, "team_member"],
      [viewer.id, "viewer"],
    ],
    tasks: [
      {
        id: "22222222-2222-2222-2222-222222222225",
        title: "Book the seminar hall",
        description: "Friday 4pm slot, projector and two mics.",
        status: "done",
        priority: "medium",
        dueDate: new Date("2026-10-17T12:00:00.000Z"),
        assigneeId: kabir.id,
        createdById: pm.id,
      },
      {
        id: "22222222-2222-2222-2222-222222222226",
        title: "Print QR posters",
        description: "Link to the interest form. A3, 12 copies.",
        status: "todo",
        priority: "medium",
        dueDate: new Date("2026-11-04T12:00:00.000Z"),
        assigneeId: leela.id,
        createdById: pm.id,
      },
    ],
  });

  await seedProject({
    id: "11111111-1111-1111-1111-111111111114",
    name: "Data cleanup sprint",
    description: "Normalize last year’s spreadsheet before the demo.",
    members: [
      [neha.id, "project_manager"],
      [member.id, "team_member"],
      [tara.id, "viewer"],
    ],
    tasks: [
      {
        id: "22222222-2222-2222-2222-222222222227",
        title: "Remove duplicate emails",
        description: "Keep the newest row when names match.",
        status: "todo",
        priority: "low",
        dueDate: new Date("2026-11-15T12:00:00.000Z"),
        assigneeId: member.id,
        createdById: neha.id,
      },
    ],
  });

  console.log("Seed complete. Demo password for every account: Password123!");
  console.log("Projects: Website relaunch, Mobile app beta, Campus hiring drive, Data cleanup sprint");
  console.log("On Website relaunch:");
  console.log("  pm@local.test      project_manager  Priya Manager");
  console.log("  sana@local.test    project_manager  Sana Patel");
  console.log("  member@local.test  team_member      Arjun Member");
  console.log("  meera@local.test   team_member      Meera Shah");
  console.log("  kabir@local.test   team_member      Kabir Rao");
  console.log("  neha@local.test    team_member      Neha Iyer");
  console.log("  viewer@local.test  viewer           Vikram Viewer");
  console.log("  rohan@local.test   viewer           Rohan Gupta");
  console.log("Not on a project (Admin can add from Users / Team):");
  console.log("  admin@local.test   global admin     Asha Admin");
  console.log("  leela@local.test   user             Leela Nair");
  console.log("  intern@local.test  user             Dev Intern");
  console.log("  tara@local.test    user             Tara Singh");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
