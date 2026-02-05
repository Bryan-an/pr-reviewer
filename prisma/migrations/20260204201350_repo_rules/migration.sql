-- CreateTable
CREATE TABLE "Repository" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "org" TEXT NOT NULL,
    "project" TEXT NOT NULL,
    "adoRepoId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "remoteUrl" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "RepoRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "repositoryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "markdown" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RepoRule_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Repository_org_project_name_idx" ON "Repository"("org", "project", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Repository_org_project_adoRepoId_key" ON "Repository"("org", "project", "adoRepoId");

-- CreateIndex
CREATE INDEX "RepoRule_repositoryId_enabled_sortOrder_updatedAt_idx" ON "RepoRule"("repositoryId", "enabled", "sortOrder", "updatedAt");
