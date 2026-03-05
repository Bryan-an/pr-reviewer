-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Finding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reviewRunId" TEXT NOT NULL,
    "findingKey" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "filePath" TEXT,
    "lineStart" INTEGER,
    "lineEnd" INTEGER,
    "recommendation" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Finding_reviewRunId_fkey" FOREIGN KEY ("reviewRunId") REFERENCES "ReviewRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Finding" ("category", "createdAt", "filePath", "findingKey", "id", "lineEnd", "lineStart", "message", "recommendation", "reviewRunId", "severity", "title") SELECT "category", "createdAt", "filePath", "findingKey", "id", "lineEnd", "lineStart", "message", "recommendation", "reviewRunId", "severity", "title" FROM "Finding";
DROP TABLE "Finding";
ALTER TABLE "new_Finding" RENAME TO "Finding";
CREATE UNIQUE INDEX "Finding_reviewRunId_findingKey_key" ON "Finding"("reviewRunId", "findingKey");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
