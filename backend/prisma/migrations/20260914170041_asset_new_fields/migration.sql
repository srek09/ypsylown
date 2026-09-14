-- AlterTable
ALTER TABLE `AssetInstance` ADD COLUMN `description` VARCHAR(191) NULL,
    ADD COLUMN `name` VARCHAR(191) NOT NULL DEFAULT 'Ismeretlen eszköz';
