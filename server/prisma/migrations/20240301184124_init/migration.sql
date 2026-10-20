-- CreateTable
CREATE TABLE "events" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "start_event" TIMESTAMP(3) NOT NULL,
    "end_event" TIMESTAMP(3) NOT NULL,
    "calendar_n" TEXT NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "events_title_key" ON "events"("title");
