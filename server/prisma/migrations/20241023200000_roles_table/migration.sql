-- CreateEnum
CREATE TYPE "RoleScope" AS ENUM ('global', 'project');

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scope" "RoleScope" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

INSERT INTO "roles" ("id", "name", "scope", "created_at", "updated_at") VALUES
('55555555-5555-5555-5555-555555555001', 'admin', 'global', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('55555555-5555-5555-5555-555555555002', 'user', 'global', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('55555555-5555-5555-5555-555555555003', 'project_manager', 'project', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('55555555-5555-5555-5555-555555555004', 'team_member', 'project', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('55555555-5555-5555-5555-555555555005', 'viewer', 'project', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

ALTER TABLE "users" ADD COLUMN "global_role_id" TEXT;

UPDATE "users" AS u
SET "global_role_id" = r.id
FROM "roles" AS r
WHERE r.name = u."global_role"::text;

ALTER TABLE "users" ALTER COLUMN "global_role_id" SET NOT NULL;

ALTER TABLE "users" ADD CONSTRAINT "users_global_role_id_fkey" FOREIGN KEY ("global_role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "users" DROP COLUMN "global_role";

ALTER TABLE "project_members" ADD COLUMN "role_id" TEXT;

UPDATE "project_members" AS pm
SET "role_id" = r.id
FROM "roles" AS r
WHERE r.name = pm."role"::text;

ALTER TABLE "project_members" ALTER COLUMN "role_id" SET NOT NULL;

ALTER TABLE "project_members" ADD CONSTRAINT "project_members_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "project_members" DROP COLUMN "role";

DROP TYPE "GlobalRole";
DROP TYPE "ProjectRole";
