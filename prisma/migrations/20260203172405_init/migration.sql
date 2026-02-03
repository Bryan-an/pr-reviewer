-- CreateTable
CREATE TABLE "ReviewRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "prUrl" TEXT NOT NULL,
    "org" TEXT NOT NULL,
    "project" TEXT NOT NULL,
    "repoId" TEXT NOT NULL,
    "repoName" TEXT NOT NULL,
    "prId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "sourceRefName" TEXT NOT NULL,
    "targetRefName" TEXT NOT NULL,
    "baseSha" TEXT NOT NULL,
    "headSha" TEXT NOT NULL,
    "engineName" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Finding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reviewRunId" TEXT NOT NULL,
    "findingKey" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "filePath" TEXT,
    "recommendation" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Finding_reviewRunId_fkey" FOREIGN KEY ("reviewRunId") REFERENCES "ReviewRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ReviewRun_prUrl_createdAt_idx" ON "ReviewRun"("prUrl", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Finding_reviewRunId_findingKey_key" ON "Finding"("reviewRunId", "findingKey");
