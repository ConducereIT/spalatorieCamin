/*
  Warnings:

  - Added the required column `camera` to the `events` table without a default value. This is not possible if the table is not empty.
  - Added the required column `email` to the `events` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phone` to the `events` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "events_title_key";

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "camera" TEXT NOT NULL,
ADD COLUMN     "email" TEXT NOT NULL,
ADD COLUMN     "phone" TEXT NOT NULL;
