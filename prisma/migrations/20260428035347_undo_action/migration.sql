/*
  Warnings:

  - You are about to drop the `NoteHistory` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "NoteHistory" DROP CONSTRAINT "NoteHistory_noteId_fkey";

-- DropTable
DROP TABLE "NoteHistory";
