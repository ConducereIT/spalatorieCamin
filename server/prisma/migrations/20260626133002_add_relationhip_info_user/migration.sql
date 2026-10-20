-- AddForeignKey
ALTER TABLE "infoUser" ADD CONSTRAINT "infoUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
