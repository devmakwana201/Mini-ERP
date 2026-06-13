const brandModel = require('../models/masters/inventory/brand.model');
const itemModel = require('../models/masters/inventory/item.model');
const itemCategoryModel = require('../models/masters/inventory/itemcategory.model');
const db = require('../config/db');
const winston = require('../config/winston');

/**
 * Get all master data maps for product import
 * Returns maps for quick lookup by lowercase name
 */
async function getMasterDataMaps() {
  const masterCategories = (await itemCategoryModel.getMasterCategoriesDropdown?.()) || [];
  const categories = (await itemCategoryModel.getCategory?.()) || [];
  const subcategories = (await itemCategoryModel.getSubCategory?.()) || [];
  const brands = (await brandModel.getBrand?.()) || [];

  const masterMap = {}, categoryMap = {}, subcategoryMap = {}, brandMap = {};

  for (const m of masterCategories) {
    masterMap[(m.name || "").trim().toLowerCase()] = m.id;
  }

  for (const c of categories) {
    categoryMap[(c.name || "").trim().toLowerCase()] = {
      id: c.id,
      parentcategoryid: c.parentcategoryid
    };
  }

  for (const s of subcategories) {
    subcategoryMap[(s.itemcategoryname || "").trim().toLowerCase()] = {
      id: s.itemcategoryid,
      parentcategoryid: s.parentcategoryid
    };
  }

  for (const b of brands) {
    brandMap[(b.name || "").trim().toLowerCase()] = b.id;
  }

  return { masterMap, categoryMap, subcategoryMap, brandMap };
}

/**
 * Insert a new brand
 * @param {String} brandName - Brand name
 * @param {Number} mastercategoryid - Master category ID to associate with brand
 * @param {Object} additionalData - Additional data like createdby, modifiedby, ipaddress
 */
async function insertBrand(brandName, mastercategoryid = null, additionalData = {}) {
  try {
    const result = await brandModel.create({
      brandname: brandName,
      brandcategory: mastercategoryid,
      ...additionalData
    });
    return result?.data?.brandid || null;
  } catch (error) {
    winston.error(`[INSERT_BRAND] Error: ${error.message}`);
    throw error;
  }
}

/**
 * Insert a new category (master, category, or subcategory)
 */
async function insertCategory(categoryName, parentCategoryId = null, additionalData = {}) {
  try {
    const result = await itemCategoryModel.createCategoryWithHierarchy(
      categoryName,
      parentCategoryId,
      additionalData
    );

    if (!result.success) {
      throw new Error(result.msg || 'Failed to create category');
    }

    return result?.data?.itemcategoryid || null;
  } catch (error) {
    winston.error(`[INSERT_CATEGORY] Error creating ${categoryName}: ${error.message}`);
    throw error;
  }
}

/**
 * Find or create master category
 */
async function findOrCreateMasterCategory(masterCategoryName, additionalData = {}) {
  if (!masterCategoryName || !masterCategoryName.trim()) {
    return null;
  }

  const existing = await itemCategoryModel.findCategoryByName(masterCategoryName, null);
  if (existing) {
    return existing.itemcategoryid;
  }

  return await insertCategory(masterCategoryName, null, additionalData);
}

/**
 * Find or create category (child of master category)
 */
async function findOrCreateCategory(categoryName, masterCategoryId, additionalData = {}) {
  if (!categoryName || !categoryName.trim()) {
    return null;
  }

  if (!masterCategoryId) {
    throw new Error('Master category ID is required to create a category');
  }

  const existing = await itemCategoryModel.findCategoryByName(categoryName, masterCategoryId);
  if (existing) {
    return existing.itemcategoryid;
  }

  return await insertCategory(categoryName, masterCategoryId, additionalData);
}

/**
 * Find or create subcategory (child of category)
 */
async function findOrCreateSubcategory(subcategoryName, categoryId, additionalData = {}) {
  if (!subcategoryName || !subcategoryName.trim()) {
    return null;
  }

  if (!categoryId) {
    throw new Error('Category ID is required to create a subcategory');
  }

  const existing = await itemCategoryModel.findCategoryByName(subcategoryName, categoryId);
  if (existing) {
    return existing.itemcategoryid;
  }

  return await insertCategory(subcategoryName, categoryId, additionalData);
}

/**
 * Check if product exists based on name and category hierarchy
 * TC-16 to TC-20: Product existence logic
 */
async function checkProductExists(productName, mastercategoryid, categoryid, subcategoryid) {
  try {
    let sql = `
      SELECT itemid, itemname, mastercategoryid, categoryid, subcategoryid
      FROM itemmaster
      WHERE LOWER(itemname) = LOWER(?)
      AND isdeleted = 0
    `;
    const params = [productName];

    // Add category filters
    if (mastercategoryid) {
      sql += ` AND mastercategoryid = ?`;
      params.push(mastercategoryid);
    } else {
      sql += ` AND mastercategoryid IS NULL`;
    }

    if (categoryid) {
      sql += ` AND categoryid = ?`;
      params.push(categoryid);
    } else {
      sql += ` AND categoryid IS NULL`;
    }

    if (subcategoryid) {
      sql += ` AND subcategoryid = ?`;
      params.push(subcategoryid);
    } else {
      sql += ` AND subcategoryid IS NULL`;
    }

    const results = await db.getResults(sql, params);
    return results && results.length > 0 ? results[0] : null;
  } catch (error) {
    winston.error(`[CHECK_PRODUCT_EXISTS] Error: ${error.message}`);
    throw error;
  }
}

/**
 * Insert a new product
 */
async function insertProduct(productData) {
  try {
    const result = await itemModel.create(productData);
    if (!result.success) {
      throw new Error(result.msg || 'Failed to create product');
    }
    return result?.data?.itemid || null;
  } catch (error) {
    winston.error(`[INSERT_PRODUCT] Error: ${error.message}`);
    throw error;
  }
}

/**
 * Update an existing product
 */
async function updateProduct(itemid, productData) {
  try {
    const result = await itemModel.update(itemid, productData);
    if (!result.success) {
      throw new Error(result.msg || 'Failed to update product');
    }
    return result;
  } catch (error) {
    winston.error(`[UPDATE_PRODUCT] Error: ${error.message}`);
    throw error;
  }
}

/**
 * Validate that master category exists in database
 * TC-07: Invalid master category should be a hard error
 */
async function validateMasterCategoryExists(masterCategoryName) {
  if (!masterCategoryName || !masterCategoryName.trim()) {
    return { valid: false, error: 'Master category is required' };
  }

  const existing = await itemCategoryModel.findCategoryByName(masterCategoryName, null);
  if (!existing) {
    return {
      valid: false,
      error: `Invalid master category: "${masterCategoryName}" does not exist in the system`
    };
  }

  return { valid: true, categoryId: existing.itemcategoryid };
}

/**
 * Build category hierarchy for a product row
 * Returns IDs for master, category, and subcategory
 */
async function resolveCategoryHierarchy(masterCategoryName, categoryName, subcategoryName, autoCreate = false, additionalData = {}) {
  let mastercategoryid = null;
  let categoryid = null;
  let subcategoryid = null;

  // Step 1: Resolve master category
  if (masterCategoryName && masterCategoryName.trim()) {
    if (autoCreate) {
      mastercategoryid = await findOrCreateMasterCategory(masterCategoryName, additionalData);
    } else {
      const existing = await itemCategoryModel.findCategoryByName(masterCategoryName, null);
      if (existing) {
        mastercategoryid = existing.itemcategoryid;
      }
    }
  }

  // Step 2: Resolve category (only if master category exists)
  if (mastercategoryid && categoryName && categoryName.trim()) {
    if (autoCreate) {
      categoryid = await findOrCreateCategory(categoryName, mastercategoryid, additionalData);
    } else {
      const existing = await itemCategoryModel.findCategoryByName(categoryName, mastercategoryid);
      if (existing) {
        categoryid = existing.itemcategoryid;
      }
    }
  }

  // Step 3: Resolve subcategory (only if category exists)
  if (categoryid && subcategoryName && subcategoryName.trim()) {
    if (autoCreate) {
      subcategoryid = await findOrCreateSubcategory(subcategoryName, categoryid, additionalData);
    } else {
      const existing = await itemCategoryModel.findCategoryByName(subcategoryName, categoryid);
      if (existing) {
        subcategoryid = existing.itemcategoryid;
      }
    }
  }

  return { mastercategoryid, categoryid, subcategoryid };
}

/**
 * Find UOM ID by name
 * Looks up uomid from uommaster table based on uomname
 */
async function findUomIdByName(uomName) {
  if (!uomName || !uomName.trim()) {
    return null;
  }

  try {
    const sql = `
      SELECT uomid
      FROM uommaster
      WHERE LOWER(uomname) = LOWER(?)
      AND isdeleted = 0
    `;
    const results = await db.getResults(sql, [uomName.trim()]);
    return results && results.length > 0 ? results[0].uomid : null;
  } catch (error) {
    winston.error(`[FIND_UOM_BY_NAME] Error: ${error.message}`);
    throw error;
  }
}

/**
 * Find tax profile ID by name
 * Looks up taxprofileid from taxprofilemaster table based on taxprofilename
 */
async function findTaxProfileIdByName(taxProfileName) {
  if (!taxProfileName || !taxProfileName.trim()) {
    return null;
  }

  try {
    const sql = `
      SELECT taxprofileid
      FROM taxprofilemaster
      WHERE LOWER(taxprofilename) = LOWER(?)
      AND isdeleted = 0
    `;
    const results = await db.getResults(sql, [taxProfileName.trim()]);
    return results && results.length > 0 ? results[0].taxprofileid : null;
  } catch (error) {
    winston.error(`[FIND_TAX_PROFILE_BY_NAME] Error: ${error.message}`);
    throw error;
  }
}

/**
 * Pre-load all lookup data into memory for fast access
 * Returns maps for UOMs, Tax Profiles, Brands, Categories
 */
async function preloadLookupData() {
  try {
    const [uoms, taxProfiles, brands, categories, existingProducts] = await Promise.all([
      db.getResults(`SELECT uomid, LOWER(uomname) as uomname FROM uommaster WHERE isdeleted = 0`),
      db.getResults(`SELECT taxprofileid, LOWER(taxprofilename) as taxprofilename FROM taxprofilemaster WHERE isdeleted = 0`),
      db.getResults(`SELECT brandid, LOWER(brandname) as brandname FROM brandmaster WHERE isdeleted = 0`),
      db.getResults(`SELECT itemcategoryid, LOWER(itemcategoryname) as itemcategoryname, parentcategoryid FROM itemcategorymaster WHERE isdeleted = 0`),
      db.getResults(`SELECT LOWER(itemname) as itemname, mastercategoryid, categoryid, subcategoryid FROM itemmaster WHERE isdeleted = 0`)
    ]);

    const uomMap = new Map();
    const taxProfileMap = new Map();
    const brandMap = new Map();
    const categoryMap = new Map();
    const masterCategoryMap = new Map();
    const subcategoryMap = new Map();
    const existingProductsSet = new Set();

    uoms.forEach(u => uomMap.set(u.uomname, u.uomid));
    taxProfiles.forEach(t => taxProfileMap.set(t.taxprofilename, t.taxprofileid));
    brands.forEach(b => brandMap.set(b.brandname, b.brandid));

    categories.forEach(c => {
      const key = c.itemcategoryname;
      if (!c.parentcategoryid || c.parentcategoryid === 0) {
        // Master category
        masterCategoryMap.set(key, c.itemcategoryid);
      } else {
        // Category or subcategory - store with parent info
        if (!categoryMap.has(key)) {
          categoryMap.set(key, []);
        }
        categoryMap.get(key).push({
          id: c.itemcategoryid,
          parentid: c.parentcategoryid
        });
      }
    });

    existingProducts.forEach(p => {
      const key = `${p.itemname}_${p.mastercategoryid || ''}_${p.categoryid || ''}_${p.subcategoryid || ''}`;
      existingProductsSet.add(key);
    });

    return {
      uomMap,
      taxProfileMap,
      brandMap,
      categoryMap,
      masterCategoryMap,
      subcategoryMap,
      existingProductsSet
    };
  } catch (error) {
    winston.error(`[PRELOAD_LOOKUP_DATA] Error: ${error.message}`);
    throw error;
  }
}

/**
 * Batch insert brands
 * Returns map of brand names to their IDs
 * @param {Array} brandNamesWithCategories - Array of objects with {name, mastercategoryid}
 * @param {Object} additionalData - Additional data like createdby, modifiedby, ipaddress
 */
async function batchInsertBrands(brandNamesWithCategories, additionalData = {}) {
  if (!brandNamesWithCategories || brandNamesWithCategories.length === 0) {
    return new Map();
  }

  const timestamp = require('moment')().format('YYYY-MM-DD HH:mm:ss');
  const brandMap = new Map();

  try {
    // Build bulk insert query with brandcategory
    const values = brandNamesWithCategories.map(item =>
      `(${db.connection.escape(item.name)}, ${db.connection.escape(item.mastercategoryid || null)}, ${db.connection.escape(additionalData.createdby || null)}, ${db.connection.escape(additionalData.modifiedby || null)}, ${db.connection.escape(timestamp)}, ${db.connection.escape(timestamp)}, ${db.connection.escape(additionalData.ipaddress || null)}, 0)`
    ).join(',');

    const sql = `
      INSERT INTO brandmaster (brandname, brandcategory, createdby, modifiedby, createddate, modifieddate, ipaddress, isdeleted)
      VALUES ${values}
    `;

    await db.getResults(sql);

    // Fetch the inserted brand IDs
    const brandNames = brandNamesWithCategories.map(item => item.name.toLowerCase());
    const placeholders = brandNames.map(() => '?').join(',');
    const result = await db.getResults(
      `SELECT brandid, LOWER(brandname) as brandname FROM brandmaster WHERE LOWER(brandname) IN (${placeholders}) AND isdeleted = 0`,
      brandNames
    );

    result.forEach(b => brandMap.set(b.brandname, b.brandid));

    return brandMap;
  } catch (error) {
    winston.error(`[BATCH_INSERT_BRANDS] Error: ${error.message}`);
    throw error;
  }
}

/**
 * Batch insert products - the main optimization function
 * Inserts multiple products in a single query
 */
async function batchInsertProducts(productsData, batchSize = 100) {
  if (!productsData || productsData.length === 0) {
    return [];
  }

  const insertedIds = [];

  try {
    // Process in batches to avoid query size limits
    for (let i = 0; i < productsData.length; i += batchSize) {
      const batch = productsData.slice(i, i + batchSize);

      // Build bulk insert query
      const columns = Object.keys(batch[0]);
      const values = batch.map(product => {
        const vals = columns.map(col => {
          const val = product[col];
          if (val === null || val === undefined) {
            return 'NULL';
          }
          return db.connection.escape(val);
        });
        return `(${vals.join(',')})`;
      }).join(',');

      const sql = `
        INSERT INTO itemmaster (${columns.join(',')})
        VALUES ${values}
      `;

      const result = await db.getResults(sql);

      // Track inserted IDs
      if (result.insertId) {
        for (let j = 0; j < batch.length; j++) {
          insertedIds.push(result.insertId + j);
        }
      }
    }

    return insertedIds;
  } catch (error) {
    winston.error(`[BATCH_INSERT_PRODUCTS] Error: ${error.message}`);
    throw error;
  }
}

module.exports = {
  getMasterDataMaps,
  insertBrand,
  insertCategory,
  findOrCreateMasterCategory,
  findOrCreateCategory,
  findOrCreateSubcategory,
  checkProductExists,
  insertProduct,
  updateProduct,
  validateMasterCategoryExists,
  resolveCategoryHierarchy,
  findUomIdByName,
  findTaxProfileIdByName,
  preloadLookupData,
  batchInsertBrands,
  batchInsertProducts
};
