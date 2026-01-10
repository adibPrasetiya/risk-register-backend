/*
  Warnings:

  - A unique constraint covering the columns `[accessToken]` on the table `sessions` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `profiles` ADD COLUMN `jabatan` VARCHAR(255) NULL,
    ADD COLUMN `unitKerjaId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `sessions` ADD COLUMN `accessToken` VARCHAR(500) NULL,
    ADD COLUMN `accessTokenExpiresAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `full_name` VARCHAR(255) NULL;

-- CreateTable
CREATE TABLE `unit_kerja` (
    `id` VARCHAR(191) NOT NULL,
    `kode` VARCHAR(50) NULL,
    `nama` VARCHAR(255) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `unit_kerja_kode_key`(`kode`),
    INDEX `unit_kerja_nama_idx`(`nama`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `profiles_unitKerjaId_idx` ON `profiles`(`unitKerjaId`);

-- CreateIndex
CREATE UNIQUE INDEX `sessions_accessToken_key` ON `sessions`(`accessToken`);

-- AddForeignKey
ALTER TABLE `profiles` ADD CONSTRAINT `profiles_unitKerjaId_fkey` FOREIGN KEY (`unitKerjaId`) REFERENCES `unit_kerja`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
