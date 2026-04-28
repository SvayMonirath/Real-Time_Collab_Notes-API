-- CreateTable
CREATE TABLE "NoteHistory" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NoteHistory_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "NoteHistory" ADD CONSTRAINT "NoteHistory_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;
