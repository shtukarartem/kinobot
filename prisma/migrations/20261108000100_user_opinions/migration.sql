CREATE TYPE "RatingValue" AS ENUM ('trash', 'passable', 'commendable', 'excellent');

CREATE TABLE "WatchOpinion" (
  "id" UUID NOT NULL,
  "entryId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "rating" "RatingValue",
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "WatchOpinion_pkey" PRIMARY KEY ("id")
);

INSERT INTO "WatchOpinion" (
  "id",
  "entryId",
  "userId",
  "rating",
  "note",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid(),
  "id",
  "addedByUserId",
  CASE
    WHEN "rating" BETWEEN 1 AND 2 THEN 'trash'::"RatingValue"
    WHEN "rating" BETWEEN 3 AND 5 THEN 'passable'::"RatingValue"
    WHEN "rating" BETWEEN 6 AND 8 THEN 'commendable'::"RatingValue"
    WHEN "rating" BETWEEN 9 AND 10 THEN 'excellent'::"RatingValue"
    ELSE NULL
  END,
  "note",
  "createdAt",
  CURRENT_TIMESTAMP
FROM "WatchEntry"
WHERE "rating" IS NOT NULL OR "note" IS NOT NULL;

ALTER TABLE "WatchEntry"
  DROP CONSTRAINT IF EXISTS "WatchEntry_rating_check",
  DROP COLUMN "rating",
  DROP COLUMN "note";

CREATE UNIQUE INDEX "WatchOpinion_entryId_userId_key"
  ON "WatchOpinion"("entryId", "userId");

CREATE INDEX "WatchOpinion_userId_idx" ON "WatchOpinion"("userId");

ALTER TABLE "WatchOpinion"
  ADD CONSTRAINT "WatchOpinion_entryId_fkey"
  FOREIGN KEY ("entryId")
  REFERENCES "WatchEntry"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE "WatchOpinion"
  ADD CONSTRAINT "WatchOpinion_userId_fkey"
  FOREIGN KEY ("userId")
  REFERENCES "User"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;
