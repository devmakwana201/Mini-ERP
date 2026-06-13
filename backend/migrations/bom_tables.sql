-- ============================================================
-- BOM Module - Database Migration Script
-- AgriPOS Mini ERP
-- Created: 2026-06-13
-- ============================================================

-- -----------------------------------------------
-- Table: bom_master
-- Stores the Bill of Materials header information
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS `bom_master` (
    `bomid`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `bomname`         VARCHAR(255) NOT NULL COMMENT 'Name of the BOM',
    `bomcode`         VARCHAR(100) NULL UNIQUE COMMENT 'Unique BOM code / reference',
    `bomtype`         ENUM('manufacturing', 'kit', 'subcontracting', 'phantom') NOT NULL DEFAULT 'manufacturing' COMMENT 'Type of BOM',
    `finisheditemid`  INT UNSIGNED NOT NULL COMMENT 'FK → itemmaster.itemid (finished product)',
    `quantity`        DECIMAL(12,4) NOT NULL DEFAULT 1.0000 COMMENT 'Finished quantity produced by this BOM',
    `uomid`           INT UNSIGNED NULL COMMENT 'FK → uommaster.uomid for finished quantity',
    `status`          ENUM('active', 'draft', 'obsolete') NOT NULL DEFAULT 'active',
    `description`     TEXT NULL,
    `effectivedate`   DATE NULL COMMENT 'Date from which this BOM becomes effective',
    `expirydate`      DATE NULL COMMENT 'Date after which BOM is no longer valid',
    `createdby`       INT UNSIGNED NOT NULL DEFAULT 1,
    `createddate`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `modifiedby`      INT UNSIGNED NOT NULL DEFAULT 1,
    `modifieddate`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `ipaddress`       VARCHAR(45) NULL,
    `isdeleted`       TINYINT(1) NOT NULL DEFAULT 0,
    PRIMARY KEY (`bomid`),
    INDEX `idx_bom_finisheditem` (`finisheditemid`),
    INDEX `idx_bom_status`       (`status`),
    INDEX `idx_bom_isdeleted`    (`isdeleted`),
    CONSTRAINT `fk_bom_finisheditem` FOREIGN KEY (`finisheditemid`) REFERENCES `itemmaster` (`itemid`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Bill of Materials - header records';

-- -----------------------------------------------
-- Table: bom_components
-- Stores line items (raw materials / sub-assemblies) for each BOM
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS `bom_components` (
    `bomcomponentid`   INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `bomid`            INT UNSIGNED NOT NULL COMMENT 'FK → bom_master.bomid',
    `componentitemid`  INT UNSIGNED NOT NULL COMMENT 'FK → itemmaster.itemid (raw material / component)',
    `quantity`         DECIMAL(12,4) NOT NULL DEFAULT 1.0000 COMMENT 'Quantity required for this component',
    `uomid`            INT UNSIGNED NULL COMMENT 'FK → uommaster.uomid for component quantity',
    `scrap_percentage` DECIMAL(6,2) NOT NULL DEFAULT 0.00 COMMENT 'Expected scrap/waste % – used for effective qty calculation',
    `notes`            VARCHAR(500) NULL COMMENT 'Component-level notes',
    `isoptional`       TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = optional component',
    `sortorder`        INT NOT NULL DEFAULT 0,
    `createdby`        INT UNSIGNED NOT NULL DEFAULT 1,
    `createddate`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `modifiedby`       INT UNSIGNED NOT NULL DEFAULT 1,
    `modifieddate`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `isdeleted`        TINYINT(1) NOT NULL DEFAULT 0,
    PRIMARY KEY (`bomcomponentid`),
    INDEX `idx_bomcomp_bomid`     (`bomid`),
    INDEX `idx_bomcomp_item`      (`componentitemid`),
    INDEX `idx_bomcomp_isdeleted` (`isdeleted`),
    CONSTRAINT `fk_bomcomp_bom`  FOREIGN KEY (`bomid`)           REFERENCES `bom_master` (`bomid`) ON DELETE CASCADE,
    CONSTRAINT `fk_bomcomp_item` FOREIGN KEY (`componentitemid`) REFERENCES `itemmaster` (`itemid`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Bill of Materials - component line items';
