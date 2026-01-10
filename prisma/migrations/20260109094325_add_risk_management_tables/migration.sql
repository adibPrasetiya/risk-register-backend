-- CreateTable
CREATE TABLE `password_reset_requests` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `identifier` VARCHAR(255) NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'COMPLETED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `requestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `validatedById` VARCHAR(191) NULL,
    `validatedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `note` TEXT NULL,

    INDEX `password_reset_requests_status_idx`(`status`),
    INDEX `password_reset_requests_requestedAt_idx`(`requestedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `risk_registers` (
    `id` VARCHAR(191) NOT NULL,
    `registerType` ENUM('MANAJEMEN_RISIKO', 'RISIKO_KEAMANAN') NOT NULL,
    `year` INTEGER NOT NULL,
    `period` ENUM('TAHUNAN', 'SEMESTER_1', 'SEMESTER_2') NOT NULL DEFAULT 'TAHUNAN',
    `unitKerja` VARCHAR(255) NOT NULL,
    `judul` VARCHAR(255) NOT NULL,
    `konteks` TEXT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `risk_registers_registerType_year_period_idx`(`registerType`, `year`, `period`),
    INDEX `risk_registers_unitKerja_idx`(`unitKerja`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `risks` (
    `id` VARCHAR(191) NOT NULL,
    `registerId` VARCHAR(191) NOT NULL,
    `kategori` ENUM('STRATEGIS', 'OPERASIONAL', 'KEUANGAN', 'KEPATUHAN', 'REPUTASI', 'LAINNYA') NOT NULL DEFAULT 'LAINNYA',
    `obyekPengamanan` ENUM('PERSONEL', 'TAMU', 'ASET_FISIK', 'INFORMASI') NULL,
    `jenisAncaman` ENUM('KRIMINALITAS', 'TERORISME', 'BENCANA_ALAM', 'PERANG', 'KONFLIK_SOSIAL', 'INSTABILITAS_POLITIK', 'PENYADAPAN', 'PENGGALANGAN', 'KEJAHATAN_SIBER', 'LAINNYA') NULL,
    `tujuan` TEXT NULL,
    `kegiatan` TEXT NULL,
    `pernyataanRisiko` TEXT NOT NULL,
    `penyebab` TEXT NULL,
    `dampak` TEXT NULL,
    `kontrolEksisting` TEXT NULL,
    `likelihood` INTEGER NOT NULL,
    `impact` INTEGER NOT NULL,
    `score` INTEGER NOT NULL,
    `level` ENUM('RENDAH', 'SEDANG', 'TINGGI', 'EKSTREM') NOT NULL,
    `ownerId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `risks_registerId_idx`(`registerId`),
    INDEX `risks_level_idx`(`level`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `risk_treatments` (
    `id` VARCHAR(191) NOT NULL,
    `riskId` VARCHAR(191) NOT NULL,
    `strategi` ENUM('HINDARI', 'KURANGI', 'PINDAHKAN', 'TERIMA') NOT NULL,
    `uraian` TEXT NOT NULL,
    `picId` VARCHAR(191) NULL,
    `targetMulai` DATETIME(3) NULL,
    `targetSelesai` DATETIME(3) NULL,
    `status` ENUM('DIRENCANAKAN', 'BERJALAN', 'SELESAI', 'DITUNDA', 'DIBATALKAN') NOT NULL DEFAULT 'DIRENCANAKAN',
    `sumberDaya` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `risk_treatments_riskId_idx`(`riskId`),
    INDEX `risk_treatments_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `risk_monitoring_logs` (
    `id` VARCHAR(191) NOT NULL,
    `riskId` VARCHAR(191) NOT NULL,
    `catatan` TEXT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'OPEN',
    `residualLikelihood` INTEGER NULL,
    `residualImpact` INTEGER NULL,
    `residualScore` INTEGER NULL,
    `residualLevel` ENUM('RENDAH', 'SEDANG', 'TINGGI', 'EKSTREM') NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `risk_monitoring_logs_riskId_idx`(`riskId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `risk_governance_assignments` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `role` ENUM('KOMITE_MANAJEMEN_RISIKO', 'PEMILIK_RISIKO', 'PENGAWAS_KEPATUHAN_MANAJEMEN_RISIKO', 'KOMITE_PENGAMANAN', 'TIM_PENGAMANAN') NOT NULL,
    `unitKerja` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `risk_governance_assignments_role_idx`(`role`),
    UNIQUE INDEX `risk_governance_assignments_userId_role_unitKerja_key`(`userId`, `role`, `unitKerja`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `password_reset_requests` ADD CONSTRAINT `password_reset_requests_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `password_reset_requests` ADD CONSTRAINT `password_reset_requests_validatedById_fkey` FOREIGN KEY (`validatedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `risk_registers` ADD CONSTRAINT `risk_registers_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `risks` ADD CONSTRAINT `risks_registerId_fkey` FOREIGN KEY (`registerId`) REFERENCES `risk_registers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `risks` ADD CONSTRAINT `risks_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `risk_treatments` ADD CONSTRAINT `risk_treatments_riskId_fkey` FOREIGN KEY (`riskId`) REFERENCES `risks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `risk_treatments` ADD CONSTRAINT `risk_treatments_picId_fkey` FOREIGN KEY (`picId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `risk_monitoring_logs` ADD CONSTRAINT `risk_monitoring_logs_riskId_fkey` FOREIGN KEY (`riskId`) REFERENCES `risks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `risk_governance_assignments` ADD CONSTRAINT `risk_governance_assignments_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
