CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "WatchStatus" AS ENUM ('watched', 'watching', 'planned', 'dropped');

CREATE TABLE "User" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "telegramUserId" TEXT NOT NULL,
  "username" TEXT,
  "firstName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Title" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "poiskkinoId" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "alternativeName" TEXT,
  "type" TEXT NOT NULL,
  "year" INTEGER,
  "description" TEXT,
  "shortDescription" TEXT,
  "posterUrl" TEXT,
  "ratingKp" DOUBLE PRECISION,
  "ratingImdb" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Title_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WatchEntry" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "titleId" UUID NOT NULL,
  "addedByUserId" UUID NOT NULL,
  "status" "WatchStatus" NOT NULL DEFAULT 'watched',
  "rating" INTEGER,
  "note" TEXT,
  "watchedAt" TIMESTAMP(3),
  "watchedTogether" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "WatchEntry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WatchEntry_rating_check" CHECK ("rating" IS NULL OR ("rating" >= 1 AND "rating" <= 10))
);

CREATE UNIQUE INDEX "User_telegramUserId_key" ON "User"("telegramUserId");
CREATE UNIQUE INDEX "Title_poiskkinoId_key" ON "Title"("poiskkinoId");
CREATE UNIQUE INDEX "WatchEntry_titleId_key" ON "WatchEntry"("titleId");
CREATE INDEX "WatchEntry_status_idx" ON "WatchEntry"("status");
CREATE INDEX "WatchEntry_watchedAt_idx" ON "WatchEntry"("watchedAt");
CREATE INDEX "WatchEntry_createdAt_idx" ON "WatchEntry"("createdAt");

ALTER TABLE "WatchEntry"
  ADD CONSTRAINT "WatchEntry_titleId_fkey"
  FOREIGN KEY ("titleId")
  REFERENCES "Title"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE "WatchEntry"
  ADD CONSTRAINT "WatchEntry_addedByUserId_fkey"
  FOREIGN KEY ("addedByUserId")
  REFERENCES "User"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;
