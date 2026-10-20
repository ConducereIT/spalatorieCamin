/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `infoUser` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "infoUser_userId_key" ON "infoUser"("userId");
