-- CreateTable
CREATE TABLE "infoUser" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "camera" TEXT NOT NULL,

    CONSTRAINT "infoUser_pkey" PRIMARY KEY ("id")
);
