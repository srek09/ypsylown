/*
  Warnings:

  - You are about to drop the column `productId` on the `AssetInstance` table. All the data in the column will be lost.
  - You are about to drop the `ProductCatalog` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `AssetInstance` DROP FOREIGN KEY `AssetInstance_productId_fkey`;

-- DropIndex
DROP INDEX `AssetInstance_productId_fkey` ON `AssetInstance`;

-- AlterTable
ALTER TABLE `AssetInstance` DROP COLUMN `productId`;

-- DropTable
DROP TABLE `ProductCatalog`;
