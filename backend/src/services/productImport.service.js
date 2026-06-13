const ExcelJS = require("exceljs");
const winston = require("../config/winston");
const db = require("../config/db");
const moment = require("moment");
const path = require("path");
const {
  validateMasterCategoryExists,
  resolveCategoryHierarchy,
  checkProductExists,
  insertBrand,
  insertProduct,
  findUomIdByName,
  findTaxProfileIdByName,
  preloadLookupData,
  batchInsertBrands,
  batchInsertProducts
} = require("../utils/dbUtils");

// Supported Excel columns (matched by header name, order-independent)
// Base columns appear first in sheet; optional columns may follow after
const BASE_COLUMNS = [
  "productname",
  "mastercategory",
  "category",
  "subcategory",
  "brand",
  "packingqty",
  "packageuom",
  "baseunit",
  "taxrate",
  "hsncode"
];

const OPTIONAL_COLUMNS = [
  // Prices and costs
  "wholesaleprice",
  "netcost",
  // Inventory
  "safetyquantity",
  // Descriptive fields
  "displayname",
  "genericname",
  "itemcode",
  "ingredients",
  "description"
];

// New required price fields
const REQUIRED_PRICE_COLUMNS = [
  "sellingprice",
  "purchaseprice"
];

// Static values for all products
const STATIC_PRODUCT_VALUES = {
  sellingitemas: 1,      // 1 = Goods
  ignoretax: 0,          // Don't ignore tax
  ignorediscount: 0,     // Don't ignore discount
  isnegativesale: 0,     // Don't allow negative sale
  isactive: 1,           // Active
  pricetype: 2,          // 2 = Variable
  isglobal: 1,           // Global item
  isapproved: 1          // Approved
};

/**
 * TC-01 to TC-05: File Upload Validation
 * Validates file type, size, and structure
 */
const validateExcelFile = async (file) => {
  // TC-02: Check file type
  const ext = path.extname(file.originalname).toLowerCase();
  if (!['.xlsx', '.xls'].includes(ext)) {
    return { valid: false, error: 'Invalid file type. Only .xlsx and .xls files are allowed.' };
  }

  // TC-03: Check file size (max 10MB)
  const fileSizeInMB = file.size / (1024 * 1024);
  if (fileSizeInMB > 10) {
    return { valid: false, error: `File too large. Maximum size is 10MB, uploaded file is ${fileSizeInMB.toFixed(2)}MB.` };
  }

  return { valid: true };
};

/**
 * Parse Excel and extract rows with validation
 * TC-04: Missing mandatory columns
 * TC-05: Empty file
 */
const parseExcelFile = async (file) => {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer);
    const sheet = workbook.worksheets[0];

    if (!sheet) {
      return { success: false, error: 'No worksheet found in Excel file' };
    }

    // Get header row
    const headerRow = sheet.getRow(1);
    const headers = [];
    headerRow.eachCell((cell) => {
      headers.push(cell.value ? String(cell.value).toLowerCase().trim() : '');
    });

    // TC-04: Check for mandatory columns (subcategory is optional)
    const mandatoryColumns = [
      'productname',
      'mastercategory',
      'category',
      'brand',
      'packingqty',
      'packageuom',
      'baseunit',
      'taxrate',
      'hsncode',
      // New required pricing fields
      'sellingprice',
      'purchaseprice'
    ];
    const missingColumns = mandatoryColumns.filter(col => !headers.includes(col));

    if (missingColumns.length > 0) {
      return {
        success: false,
        error: `Missing mandatory columns: ${missingColumns.join(', ')}`
      };
    }

    const rows = [];
    let emptyRowCount = 0;

    // Build a map of header name -> column index for order-independent parsing
    const headerIndexMap = new Map();
    headers.forEach((name, idx) => {
      if (name) headerIndexMap.set(name, idx + 1); // Excel is 1-indexed
    });

    sheet.eachRow((row, rowIndex) => {
      if (rowIndex === 1) return; // Skip header

      // Check if row is completely empty
      let hasData = false;
      row.eachCell((cell) => {
        if (cell.value !== null && cell.value !== undefined && String(cell.value).trim() !== '') {
          hasData = true;
        }
      });

      if (!hasData) {
        emptyRowCount++;
        return;
      }

      const rowData = { rowNumber: rowIndex };

      const values = row.values;
      const allColumns = [...BASE_COLUMNS, ...REQUIRED_PRICE_COLUMNS, ...OPTIONAL_COLUMNS];
      allColumns.forEach((colName) => {
        const colIdx = headerIndexMap.get(colName);
        if (colIdx) {
          const cellValue = values[colIdx];
          rowData[colName] = cellValue !== null && cellValue !== undefined ? String(cellValue).trim() : '';
        }
      });

      rows.push(rowData);
    });

    // TC-05: Empty file check
    if (rows.length === 0) {
      return {
        success: false,
        error: 'No data to process. The Excel file is empty or contains only headers.'
      };
    }

    return { success: true, rows, totalRows: rows.length };
  } catch (error) {
    winston.error(`[PARSE_EXCEL] Error: ${error.message}`);
    return { success: false, error: `Failed to parse Excel file: ${error.message}` };
  }
};

/**
 * TC-06 to TC-20: Excel Data Validation and Preview
 * Step 1: Validate and return preview without inserting
 */
const validateProductImport = async (file) => {
  try {
    // TC-01 to TC-03: File validation
    const fileValidation = await validateExcelFile(file);
    if (!fileValidation.valid) {
      return {
        success: false,
        error: fileValidation.error
      };
    }

    // Parse Excel file
    const parseResult = await parseExcelFile(file);
    if (!parseResult.success) {
      return {
        success: false,
        error: parseResult.error
      };
    }

    const { rows, totalRows } = parseResult;

    const errors = [];
    const warnings = [];
    const newProducts = [];
    const existingProducts = [];
    const duplicateProducts = [];

    // Track new entities with proper hierarchy context
    const newMasterCategories = new Set();
    const newCategories = new Map(); // key: "categoryname_mastercategoryid" -> value: {name, parent}
    const newSubCategories = new Map(); // key: "subcategoryname_categoryid" -> value: {name, parent}
    const newBrands = new Map(); // key: lowercase brandname -> value: original brand name (for case-insensitive tracking)

    // TC-15: Track duplicates within Excel
    const productInExcelMap = new Map();

    // Get existing brands for quick lookup
    const existingBrands = await db.getResults(
      `SELECT LOWER(brandname) as brandname FROM brandmaster WHERE isdeleted = 0`
    );
    const brandSet = new Set(existingBrands.map(b => b.brandname));

    for (const row of rows) { 
      const rowErrors = [];
      const rowWarnings = [];

      // Normalize data
      const productName = (row.productname || '').trim();
      const productNameLower = productName.toLowerCase();
      const masterCategory = (row.mastercategory || '').trim();
      const category = (row.category || '').trim();
      const subcategory = (row.subcategory || '').trim();
      const brand = (row.brand || '').trim();
      const sellingprice = row.sellingprice;
      const purchaseprice = row.purchaseprice;
      const wholesaleprice = row.wholesaleprice;
      const netcost = row.netcost;
      const safetyquantity = row.safetyquantity;
      const displayname = (row.displayname || '').trim();
      const genericname = (row.genericname || '').trim();
      const itemcode = (row.itemcode || '').trim();
      const ingredients = (row.ingredients || '').trim();
      const description = (row.description || '').trim();
      const packingqty = row.packingqty;
      const packageuom = row.packageuom;
      const baseunit = row.baseunit;
      const taxrate = row.taxrate;

      // TC-13: Validate product name (required)
      if (!productName) {
        rowErrors.push('Product name is required');
      }

      // TC-08: Validate master category (required)
      if (!masterCategory) {
        rowErrors.push('Master category is required');
      } else {
        // TC-07: Validate master category exists (HARD ERROR)
        const masterValidation = await validateMasterCategoryExists(masterCategory);
        if (!masterValidation.valid) {
          rowErrors.push(masterValidation.error);
        }
      }

      // Validate category (required)
      if (!category) {
        rowErrors.push('Category is required');
      }

      // Validate brand (required)
      if (!brand) {
        rowErrors.push('Brand is required');
      }

      // Validate packingqty (required)
      if (!packingqty || packingqty === '') {
        rowErrors.push('Packing quantity is required');
      }

      // Validate packageuom (required)
      if (!packageuom || packageuom.trim() === '') {
        rowErrors.push('Package UOM is required');
      }

      // Validate baseunit (required)
      if (!baseunit || baseunit.trim() === '') {
        rowErrors.push('Base unit is required');
      }

      // Validate taxrate (required)
      if (!taxrate || taxrate.trim() === '') {
        rowErrors.push('Tax rate is required');
      }

      // Validate hsncode (required)
      if (!row.hsncode || row.hsncode.trim() === '') {
        rowErrors.push('HSN code is required');
      }

      // Validate pricing (sellingprice and purchaseprice required)
      if (!sellingprice || sellingprice === '') {
        rowErrors.push('Selling price is required');
      }
      if (!purchaseprice || purchaseprice === '') {
        rowErrors.push('Purchase price is required');
      }

      // TC-14: Validate numeric fields
      if (sellingprice && (isNaN(sellingprice) || Number(sellingprice) < 0)) {
        rowErrors.push('Selling price must be a valid non-negative number');
      }
      if (purchaseprice && (isNaN(purchaseprice) || Number(purchaseprice) < 0)) {
        rowErrors.push('Purchase price must be a valid non-negative number');
      }
      if (wholesaleprice && wholesaleprice !== '' && (isNaN(wholesaleprice) || Number(wholesaleprice) < 0)) {
        rowErrors.push('Wholesale price must be a valid non-negative number');
      }
      if (netcost && netcost !== '' && (isNaN(netcost) || Number(netcost) < 0)) {
        rowErrors.push('Net Cost (MRP) must be a valid non-negative number');
      }
      if (packingqty && (isNaN(packingqty) || Number(packingqty) <= 0)) {
        rowErrors.push('Packing quantity must be a valid positive number');
      }
      if (safetyquantity && safetyquantity !== '' && (!Number.isInteger(Number(safetyquantity)) || Number(safetyquantity) < 0)) {
        rowErrors.push('Safety quantity must be a valid non-negative integer');
      }

      // Validate UOM names (packageuom and baseunit)
      if (packageuom && packageuom.trim()) {
        const packageUomId = await findUomIdByName(packageuom);
        if (!packageUomId) {
          rowErrors.push(`Invalid package UOM: "${packageuom}" does not exist in UOM master`);
        }
      }
      if (baseunit && baseunit.trim()) {
        const baseunitId = await findUomIdByName(baseunit);
        if (!baseunitId) {
          rowErrors.push(`Invalid base unit: "${baseunit}" does not exist in UOM master`);
        }
      }

      // Validate tax profile name
      if (taxrate && taxrate.trim()) {
        const taxProfileId = await findTaxProfileIdByName(taxrate);
        if (!taxProfileId) {
          rowErrors.push(`Invalid tax rate: "${taxrate}" does not exist in tax profile master`);
        }
      }

      // TC-15: Check for duplicates within Excel
      const excelKey = `${productNameLower}_${masterCategory.toLowerCase()}_${category.toLowerCase()}_${subcategory.toLowerCase()}`;
      if (productInExcelMap.has(excelKey)) {
        rowWarnings.push(`Duplicate product in Excel at row ${productInExcelMap.get(excelKey)}`);
        duplicateProducts.push({
          row: row.rowNumber,
          productName,
          masterCategory,
          category,
          subcategory,
          reason: `Duplicate of row ${productInExcelMap.get(excelKey)}`
        });
        continue; // Skip further processing for this duplicate
      } else {
        productInExcelMap.set(excelKey, row.rowNumber);
      }

      // Check if categories/brands are new
      // TC-09, TC-10, TC-12: Auto-create logic preview
      if (masterCategory) {
        const masterExists = await validateMasterCategoryExists(masterCategory);
        if (masterExists.valid) {
          const mastercategoryid = masterExists.categoryId;

          // Master category exists, check if category is new
          if (category) {
            const hierarchy = await resolveCategoryHierarchy(masterCategory, category, null, false);
            const isCategoryNew = !hierarchy.categoryid;

            // Track with unique key: "categoryname_mastercategoryid"
            const categoryKey = `${category.toLowerCase()}_${mastercategoryid}`;
            if (isCategoryNew && !newCategories.has(categoryKey)) {
              newCategories.set(categoryKey, {
                name: category,
                displayName: category,
                parentId: mastercategoryid
              });
            }

            // TC-11: Subcategory can be blank (allowed)
            // Check subcategory regardless of whether category is new or existing
            if (subcategory) {
              // If category is new, subcategory will definitely be new too
              if (isCategoryNew) {
                // Track with temporary key since categoryid doesn't exist yet
                const subcategoryKey = `${subcategory.toLowerCase()}_new_${categoryKey}`;
                if (!newSubCategories.has(subcategoryKey)) {
                  newSubCategories.set(subcategoryKey, {
                    name: subcategory,
                    displayName: subcategory,
                    parentCategory: category,
                    parentMastercategory: masterCategory
                  });
                }
              } else {
                // Category exists, check if subcategory exists under it
                const fullHierarchy = await resolveCategoryHierarchy(masterCategory, category, subcategory, false);
                if (!fullHierarchy.subcategoryid) {
                  // Track with key: "subcategoryname_categoryid"
                  const subcategoryKey = `${subcategory.toLowerCase()}_${hierarchy.categoryid}`;
                  if (!newSubCategories.has(subcategoryKey)) {
                    newSubCategories.set(subcategoryKey, {
                      name: subcategory,
                      displayName: subcategory,
                      parentId: hierarchy.categoryid,
                      parentCategory: category,
                      parentMastercategory: masterCategory
                    });
                  }
                }
              }
            }
          }
        }
      }

      // TC-12: Check if brand is new (case-insensitive, preserves first occurrence casing)
      if (brand && !brandSet.has(brand.toLowerCase())) {
        const brandKey = brand.toLowerCase();
        if (!newBrands.has(brandKey)) {
          newBrands.set(brandKey, brand);
        }
      }

      // TC-16 to TC-20: Check if product exists in database
      if (productName && masterCategory && rowErrors.length === 0) {
        const hierarchy = await resolveCategoryHierarchy(masterCategory, category, subcategory, false);
        const existingProduct = await checkProductExists(
          productName,
          hierarchy.mastercategoryid,
          hierarchy.categoryid,
          hierarchy.subcategoryid
        );

        if (existingProduct) {
          existingProducts.push({
            row: row.rowNumber,
            productName,
            masterCategory,
            category,
            subcategory,
            brand,
            existingItemId: existingProduct.itemid
          });
        } else {
          newProducts.push({
            row: row.rowNumber,
            productName,
            masterCategory,
            category,
            subcategory,
            brand
          });
        }
      }

      // Collect errors and warnings
      if (rowErrors.length > 0) {
        errors.push({
          row: row.rowNumber,
          productName: productName || '(blank)',
          masterCategory: masterCategory || '(blank)',
          category,
          subcategory,
          brand,
          errors: rowErrors
        });
      }

      if (rowWarnings.length > 0) {
        warnings.push({
          row: row.rowNumber,
          productName,
          warnings: rowWarnings
        });
      }
    }

    // TC-26 to TC-30: Summary validation
    const summary = {
      success: true,
      totalRows,
      validRows: newProducts.length,
      newProductsCount: newProducts.length,
      existingProductsCount: existingProducts.length,
      duplicatesInExcel: duplicateProducts.length,
      errorsCount: errors.length,
      warningsCount: warnings.length,
      newMasterCategoriesCount: newMasterCategories.size,
      newCategoriesCount: newCategories.size,
      newSubCategoriesCount: newSubCategories.size,
      newBrandsCount: newBrands.size,

      // Details
      errors,
      warnings,
      newMasterCategories: Array.from(newMasterCategories),
      newCategories: Array.from(newCategories.values()).map(c => c.displayName),
      newSubCategories: Array.from(newSubCategories.values()).map(s => s.displayName),
      newBrands: Array.from(newBrands.values()), // Get original brand names from Map values
      newProducts: newProducts, // Show all new products
      existingProducts: existingProducts, // Show all existing products
      duplicateProducts: duplicateProducts, // Show all duplicate products

      // Indicate if import can proceed
      canProceed: errors.length === 0,
      message: errors.length === 0
        ? 'Validation successful. Ready to import.'
        : 'Validation failed. Please fix errors before importing.'
    };

    return summary;
  } catch (error) {
    winston.error(`[VALIDATE_IMPORT] Error: ${error.message}`, { stack: error.stack });
    return {
      success: false,
      error: `Validation error: ${error.message}`
    };
  }
};

/**
 * TC-21 to TC-25: Revalidation and Final Import with Batch Processing
 * OPTIMIZED: Batch insert validated products with pre-loaded lookup data
 * This version uses bulk inserts for significantly faster performance
 */
const insertValidatedProducts = async (file, userId = null, ipAddress = null) => {
  try {
    // Parse Excel file
    const parseResult = await parseExcelFile(file);
    if (!parseResult.success) {
      return {
        success: false,
        error: parseResult.error
      };
    }

    const { rows } = parseResult;

    winston.info(`[BATCH_IMPORT] Starting optimized batch import for ${rows.length} rows`);

    // Step 1: Pre-load all lookup data into memory (single query per lookup type)
    winston.info('[BATCH_IMPORT] Pre-loading lookup data...');
    const lookupData = await preloadLookupData();
    winston.info('[BATCH_IMPORT] Lookup data loaded successfully');

    // Begin transaction
    await db.beginTransaction();

    let addedCount = 0;
    let skippedCount = 0;
    let newBrandsCount = 0;
    let newCategoriesCount = 0;
    let newSubCategoriesCount = 0;

    const errors = [];
    const skippedRows = [];
    const productsToInsert = [];
    const additionalData = {
      createdby: userId,
      modifiedby: userId,
      ipaddress: ipAddress
    };

    // Step 2: Identify new brands and categories that need to be created
    const newBrands = new Map(); // brandName -> mastercategoryid
    const newCategories = new Map(); // categoryName -> mastercategoryid
    const newSubCategories = new Map(); // subcategoryName -> categoryid

    // Track duplicates within Excel to prevent duplicate insertions
    const productInExcelMap = new Map();

    winston.info('[BATCH_IMPORT] Processing rows and collecting new entities...');

    for (const row of rows) {
      const productName = (row.productname || '').trim();
      const productNameLower = productName.toLowerCase();
      const masterCategory = (row.mastercategory || '').trim();
      const category = (row.category || '').trim();
      const subcategory = (row.subcategory || '').trim();
      const brand = (row.brand || '').trim();

      // Skip if missing required fields
      if (!productName || !masterCategory || !category || !brand ||
          !row.packingqty || !row.packageuom || !row.baseunit ||
          !row.taxrate || !row.hsncode || !row.sellingprice || !row.purchaseprice) {
        skippedCount++;
        skippedRows.push({
          row: row.rowNumber,
          productName: productName || '(blank)',
          reason: 'Missing required fields'
        });
        continue;
      }

      // Check for duplicates within Excel
      const excelKey = `${productNameLower}_${masterCategory.toLowerCase()}_${category.toLowerCase()}_${subcategory.toLowerCase()}`;
      if (productInExcelMap.has(excelKey)) {
        skippedCount++;
        skippedRows.push({
          row: row.rowNumber,
          productName,
          reason: `Duplicate product in Excel (first occurrence at row ${productInExcelMap.get(excelKey)})`
        });
        continue; // Skip this duplicate row
      } else {
        productInExcelMap.set(excelKey, row.rowNumber);
      }

      // Check master category exists
      const masterCategoryId = lookupData.masterCategoryMap.get(masterCategory.toLowerCase());
      if (!masterCategoryId) {
        skippedCount++;
        skippedRows.push({
          row: row.rowNumber,
          productName,
          reason: `Master category "${masterCategory}" does not exist`
        });
        continue;
      }

      // Track new brands with their master category
      // Use lowercase as key but store original brand name with mastercategoryid
      if (brand && !lookupData.brandMap.has(brand.toLowerCase())) {
        const brandKey = brand.toLowerCase();
        if (!newBrands.has(brandKey)) {
          newBrands.set(brandKey, { name: brand, mastercategoryid: masterCategoryId });
        }
      }

      // Track new categories (simplified - may need hierarchy resolution)
      const categoryKey = `${category.toLowerCase()}_${masterCategoryId}`;
      const categoryArray = lookupData.categoryMap.get(category.toLowerCase()) || [];
      const categoryExists = categoryArray.some(c => c.parentid === masterCategoryId);
      if (!categoryExists && !newCategories.has(categoryKey)) {
        newCategories.set(categoryKey, { name: category, parentId: masterCategoryId });
      }

      // Similar for subcategories if needed
      if (subcategory) {
        // We'll handle subcategories during the main loop after categories are created
      }
    }

    // Step 3: Batch insert new brands with their master categories
    if (newBrands.size > 0) {
      winston.info(`[BATCH_IMPORT] Creating ${newBrands.size} new brands...`);
      // Convert Map to array of objects with {name, mastercategoryid}
      // The map values already contain {name, mastercategoryid}
      const brandNamesWithCategories = Array.from(newBrands.values());
      const newBrandMap = await batchInsertBrands(brandNamesWithCategories, additionalData);

      // Merge new brands into lookup data
      newBrandMap.forEach((id, name) => {
        lookupData.brandMap.set(name, id);
      });

      newBrandsCount = newBrands.size;
      winston.info(`[BATCH_IMPORT] Created ${newBrandsCount} brands`);
    }

    // Step 4: Create new categories (one by one due to hierarchy dependencies)
    if (newCategories.size > 0) {
      winston.info(`[BATCH_IMPORT] Creating ${newCategories.size} new categories...`);
      for (const [key, catInfo] of newCategories) {
        const categoryId = await resolveCategoryHierarchy(
          '', // We already have master category ID
          catInfo.name,
          null,
          true,
          additionalData
        );

        if (categoryId.categoryid) {
          const categoryKey = catInfo.name.toLowerCase();
          if (!lookupData.categoryMap.has(categoryKey)) {
            lookupData.categoryMap.set(categoryKey, []);
          }
          lookupData.categoryMap.get(categoryKey).push({
            id: categoryId.categoryid,
            parentid: catInfo.parentId
          });
        }
        newCategoriesCount++;
      }
      winston.info(`[BATCH_IMPORT] Created ${newCategoriesCount} categories`);
    }

    // Step 5: Process all rows and prepare batch insert data
    winston.info('[BATCH_IMPORT] Preparing products for batch insert...');

    // Track products being inserted in this batch to prevent duplicates
    const insertingProductsSet = new Set();

    for (const row of rows) {
      try {
        const productName = (row.productname || '').trim();
        const masterCategory = (row.mastercategory || '').trim();
        const category = (row.category || '').trim();
        const subcategory = (row.subcategory || '').trim();
        const brand = (row.brand || '').trim();

        // Skip if already marked as skipped
        if (skippedRows.some(s => s.row === row.rowNumber)) {
          continue;
        }

        // Get IDs from pre-loaded lookup data
        const mastercategoryid = lookupData.masterCategoryMap.get(masterCategory.toLowerCase());

        // Resolve category hierarchy
        const hierarchy = await resolveCategoryHierarchy(
          masterCategory,
          category,
          subcategory,
          true,
          additionalData
        );

        const categoryid = hierarchy.categoryid;
        const subcategoryid = hierarchy.subcategoryid;

        // Check if product already exists in database
        const existingKey = `${productName.toLowerCase()}_${mastercategoryid || ''}_${categoryid || ''}_${subcategoryid || ''}`;
        if (lookupData.existingProductsSet.has(existingKey)) {
          skippedCount++;
          skippedRows.push({
            row: row.rowNumber,
            productName,
            reason: 'Product already exists in database'
          });
          continue;
        }

        // Check if product is already being inserted in this batch (duplicate in Excel)
        if (insertingProductsSet.has(existingKey)) {
          skippedCount++;
          skippedRows.push({
            row: row.rowNumber,
            productName,
            reason: `Duplicate product in Excel batch`
          });
          continue;
        }

        // Mark this product as being inserted
        insertingProductsSet.add(existingKey);

        // Get brand ID
        const brandId = lookupData.brandMap.get(brand.toLowerCase());

        // Get UOM and tax profile IDs
        const packageUomId = lookupData.uomMap.get((row.packageuom || '').trim().toLowerCase());
        const baseunitId = lookupData.uomMap.get((row.baseunit || '').trim().toLowerCase());
        const taxProfileId = lookupData.taxProfileMap.get((row.taxrate || '').trim().toLowerCase());

        if (!packageUomId || !baseunitId || !taxProfileId) {
          skippedCount++;
          skippedRows.push({
            row: row.rowNumber,
            productName,
            reason: 'Invalid UOM or tax profile'
          });
          continue;
        }

        // Prepare product data
        const timestamp = Math.floor(Date.now() / 1000);
        const random = Math.floor(10000 + Math.random() * 90000);
        const uniquekey = parseInt(`${timestamp}${random}`);
        const now = moment().format('YYYY-MM-DD HH:mm:ss');

        const productData = {
          itemname: productName.toLowerCase(),
          itemdisplayname: (row.displayname || '').trim() || productName,
          genericname: (row.genericname || '').trim() || null,
          itemcode: (row.itemcode || '').trim() || null,
          mastercategoryid: mastercategoryid,
          categoryid: categoryid || null,
          subcategoryid: subcategoryid || null,
          brandid: brandId,
          packingqty: row.packingqty ? parseFloat(row.packingqty) : null,
          packageuom: packageUomId,
          baseunit: baseunitId,
          defaulttaxprofileid: taxProfileId,
          hsnseccode: row.hsncode || null,
          sellingprice: row.sellingprice ? parseFloat(row.sellingprice) : null,
          purchaseprice: row.purchaseprice ? parseFloat(row.purchaseprice) : null,
          netcost: row.netcost ? parseFloat(row.netcost) : 0,
          wholesaleprice: row.wholesaleprice ? parseFloat(row.wholesaleprice) : 0,
          price: null,
          safetyquantity: row.safetyquantity && row.safetyquantity !== '' ? parseInt(row.safetyquantity, 10) : null,
          ingredients: (row.ingredients || '').trim() || null,
          description: (row.description || '').trim() || null,
          ...STATIC_PRODUCT_VALUES,
          uniquekey: uniquekey,
          createdby: userId,
          modifiedby: userId,
          createddate: now,
          modifieddate: now,
          ipaddress: ipAddress,
          isdeleted: 0
        };

        productsToInsert.push(productData);

      } catch (rowError) {
        winston.error(`[BATCH_IMPORT] Error at row ${row.rowNumber}: ${rowError.message}`);
        skippedCount++;
        errors.push({
          row: row.rowNumber,
          productName: row.productname || '(blank)',
          error: rowError.message
        });
      }
    }

    // Step 6: Batch insert all products
    if (productsToInsert.length > 0) {
      winston.info(`[BATCH_IMPORT] Inserting ${productsToInsert.length} products in batches...`);
      await batchInsertProducts(productsToInsert, 100);
      addedCount = productsToInsert.length;
      winston.info(`[BATCH_IMPORT] Successfully inserted ${addedCount} products`);
    }

    // Commit transaction
    await db.commit();

    winston.info(`[BATCH_IMPORT] Import completed: Added: ${addedCount}, Skipped: ${skippedCount}`);

    return {
      success: true,
      summary: {
        totalRows: rows.length,
        addedProducts: addedCount,
        skippedProducts: skippedCount,
        newBrands: newBrandsCount,
        newCategories: newCategoriesCount,
        newSubCategories: newSubCategoriesCount,
        errorsCount: errors.length
      },
      details: {
        errors,
        skippedRows: skippedRows.slice(0, 20),
        processedProducts: [] // Not tracked in batch mode for performance
      },
      message: `Batch import completed: ${addedCount} added, ${skippedCount} skipped`
    };

  } catch (error) {
    // Rollback on error
    try {
      await db.rollback();
      winston.info('[BATCH_IMPORT] Transaction rolled back due to error');
    } catch (rollbackError) {
      winston.error(`[BATCH_IMPORT] Error during rollback: ${rollbackError.message}`);
    }

    winston.error(`[BATCH_IMPORT] Error: ${error.message}`, { stack: error.stack });
    return {
      success: false,
      error: `Batch import failed: ${error.message}. All changes have been rolled back.`
    };
  }
};

/**
 * Direct import without validation step
 * Uses the optimized batch insert function
 */
const handleProductImport = async (file, userId = null, ipAddress = null) => {
  return await insertValidatedProducts(file, userId, ipAddress);
};

/**
 * Generate sample Excel template for product import
 * Returns Excel workbook buffer
 */
const generateSampleExcel = async () => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Product Import Template');

  // Fetch dropdown data from database
  // 1. Master categories (parentcategoryid IS NULL)
  const masterCategoriesResult = await db.getResults(`
    SELECT DISTINCT displayname as name
    FROM itemcategorymaster
    WHERE (parentcategoryid IS NULL OR parentcategoryid = 0)
    AND isdeleted = 0
    ORDER BY displayname ASC
  `);
  const masterCategories = masterCategoriesResult.map(m => m.name);

  // 2. UOM names
  const uomsResult = await db.getResults(`
    SELECT DISTINCT uomname as name
    FROM uommaster
    WHERE isdeleted = 0
    ORDER BY uomname ASC
  `);
  const uomNames = uomsResult.map(u => u.name);

  // 3. Tax profile names
  const taxProfilesResult = await db.getResults(`
    SELECT DISTINCT taxprofilename as name
    FROM taxprofilemaster
    WHERE isdeleted = 0
    ORDER BY taxprofilename ASC
  `);
  const taxProfileNames = taxProfilesResult.map(t => t.name);

  // Define columns with headers (MRP removed; new fields added)
  worksheet.columns = [
    { header: 'productname', key: 'productname', width: 30 },
    { header: 'mastercategory', key: 'mastercategory', width: 20 },
    { header: 'category', key: 'category', width: 20 },
    { header: 'subcategory', key: 'subcategory', width: 20 },
    { header: 'brand', key: 'brand', width: 20 },
    { header: 'packingqty', key: 'packingqty', width: 15 },
    { header: 'packageuom', key: 'packageuom', width: 15 },
    { header: 'baseunit', key: 'baseunit', width: 15 },
    { header: 'taxrate', key: 'taxrate', width: 15 },
    { header: 'hsncode', key: 'hsncode', width: 15 },
    // Required new price fields
    { header: 'sellingprice', key: 'sellingprice', width: 15 },
    { header: 'purchaseprice', key: 'purchaseprice', width: 15 },
    // Optional fields
    { header: 'wholesaleprice', key: 'wholesaleprice', width: 15 },
    { header: 'netcost', key: 'netcost', width: 15 },
    { header: 'safetyquantity', key: 'safetyquantity', width: 15 },
    { header: 'displayname', key: 'displayname', width: 25 },
    { header: 'genericname', key: 'genericname', width: 25 },
    { header: 'itemcode', key: 'itemcode', width: 20 },
    { header: 'ingredients', key: 'ingredients', width: 30 },
    { header: 'description', key: 'description', width: 40 }
  ];

  // Style header row (only columns A-T, which are columns 1-20)
  const headerRow = worksheet.getRow(1);
  headerRow.height = 25;  // Set row height

  // Apply default blue background to all required columns (A-T, excluding optional ones)
  const totalColumns = 20; // A to T
  const optionalHeaderIndexes = [4, 13, 14, 15, 16, 17, 18, 19, 20]; // D, M, N, O, P, Q, R, S, T

  for (let colIdx = 1; colIdx <= totalColumns; colIdx++) {
    const cell = headerRow.getCell(colIdx);

    // Set base styling for all columns A-T
    cell.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: false
    };

    cell.border = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'medium', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } }
    };

    // Apply color based on whether column is optional or required
    if (optionalHeaderIndexes.includes(colIdx)) {
      // Optional columns: yellow background with black text
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF9E79F' }
      };
      cell.font = {
        bold: true,
        color: { argb: 'FF000000' },
        size: 12,
        name: 'Calibri'
      };
    } else {
      // Required columns: blue background with white text
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
      };
      cell.font = {
        bold: true,
        color: { argb: 'FFFFFFFF' },
        size: 12,
        name: 'Calibri'
      };
    }
  }
  // Add data validation dropdowns for rows 2-1000
  const maxRows = 10000;

  // Column B: mastercategory dropdown
  if (masterCategories.length > 0) {
    for (let row = 2; row <= maxRows; row++) {
      worksheet.getCell(`B${row}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`"${masterCategories.join(',')}"`],
        showErrorMessage: true,
        errorStyle: 'error',
        errorTitle: 'Invalid Master Category',
        error: 'Please select a master category from the dropdown list'
      };
    }
  }

  // Column G: packageuom dropdown
  if (uomNames.length > 0) {
    for (let row = 2; row <= maxRows; row++) {
      worksheet.getCell(`G${row}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`"${uomNames.join(',')}"`],
        showErrorMessage: true,
        errorStyle: 'error',
        errorTitle: 'Invalid Package UOM',
        error: 'Please select a UOM from the dropdown list'
      };
    }
  }

  // Column H: baseunit dropdown
  if (uomNames.length > 0) {
    for (let row = 2; row <= maxRows; row++) {
      worksheet.getCell(`H${row}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`"${uomNames.join(',')}"`],
        showErrorMessage: true,
        errorStyle: 'error',
        errorTitle: 'Invalid Base Unit',
        error: 'Please select a UOM from the dropdown list'
      };
    }
  }

  // Column I: taxrate dropdown
  if (taxProfileNames.length > 0) {
    for (let row = 2; row <= maxRows; row++) {
      worksheet.getCell(`I${row}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`"${taxProfileNames.join(',')}"`],
        showErrorMessage: true,
        errorStyle: 'error',
        errorTitle: 'Invalid Tax Rate',
        error: 'Please select a tax profile from the dropdown list'
      };
    }
  }

  // Add input validation rules for specific columns

  // Column A: productname - alphanumeric only (letters, numbers, spaces, hyphens, underscores)
  for (let row = 2; row <= maxRows; row++) {
    worksheet.getCell(`A${row}`).dataValidation = {
      type: 'textLength',
      allowBlank: true,
      operator: 'greaterThan',
      formulae: [0],
      showErrorMessage: true,
      errorStyle: 'warning',
      errorTitle: 'Product Name Format',
      error: 'Product name should contain only letters, numbers, spaces, and basic punctuation'
    };
  }

  // Column C: category - alphanumeric only
  for (let row = 2; row <= maxRows; row++) {
    worksheet.getCell(`C${row}`).dataValidation = {
      type: 'textLength',
      allowBlank: true,
      operator: 'greaterThan',
      formulae: [0],
      showErrorMessage: true,
      errorStyle: 'warning',
      errorTitle: 'Category Format',
      error: 'Category should contain only letters, numbers, and spaces'
    };
  }

  // Column D: subcategory - alphanumeric only
  for (let row = 2; row <= maxRows; row++) {
    worksheet.getCell(`D${row}`).dataValidation = {
      type: 'textLength',
      allowBlank: true,
      operator: 'greaterThan',
      formulae: [0],
      showErrorMessage: true,
      errorStyle: 'warning',
      errorTitle: 'Subcategory Format',
      error: 'Subcategory should contain only letters, numbers, and spaces'
    };
  }

  // Column E: brand - alphanumeric only
  for (let row = 2; row <= maxRows; row++) {
    worksheet.getCell(`E${row}`).dataValidation = {
      type: 'textLength',
      allowBlank: true,
      operator: 'greaterThan',
      formulae: [0],
      showErrorMessage: true,
      errorStyle: 'warning',
      errorTitle: 'Brand Format',
      error: 'Brand should contain only letters, numbers, and spaces'
    };
  }

  // Column F: packingqty - numeric only (decimal allowed)
  for (let row = 2; row <= maxRows; row++) {
    worksheet.getCell(`F${row}`).dataValidation = {
      type: 'decimal',
      allowBlank: true,
      operator: 'greaterThan',
      formulae: [0],
      showErrorMessage: true,
      errorStyle: 'error',
      errorTitle: 'Invalid Packing Quantity',
      error: 'Packing quantity must be a positive number'
    };
  }

  // Column J: hsncode - numeric only (can be text but numbers only)
  for (let row = 2; row <= maxRows; row++) {
    worksheet.getCell(`J${row}`).dataValidation = {
      type: 'textLength',
      allowBlank: true,
      operator: 'between',
      formulae: [4, 12],
      showErrorMessage: true,
      errorStyle: 'warning',
      errorTitle: 'HSN Code Format',
      error: 'HSN code should be 4-12 digits (numbers only)'
    };
  }

  // Column K: sellingprice - numeric only (decimal allowed, required in guidance)
  for (let row = 2; row <= maxRows; row++) {
    worksheet.getCell(`K${row}`).dataValidation = {
      type: 'decimal',
      allowBlank: true,
      operator: 'greaterThanOrEqual',
      formulae: [0],
      showErrorMessage: true,
      errorStyle: 'error',
      errorTitle: 'Invalid Selling Price',
      error: 'Selling price must be a non-negative number (0 or greater)'
    };
  }

  // Column L: purchaseprice - numeric only (decimal allowed, required in guidance)
  for (let row = 2; row <= maxRows; row++) {
    worksheet.getCell(`L${row}`).dataValidation = {
      type: 'decimal',
      allowBlank: true,
      operator: 'greaterThanOrEqual',
      formulae: [0],
      showErrorMessage: true,
      errorStyle: 'error',
      errorTitle: 'Invalid Purchase Price',
      error: 'Purchase price must be a non-negative number (0 or greater)'
    };
  }

  // Column M: wholesaleprice - numeric only (decimal allowed, optional)
  for (let row = 2; row <= maxRows; row++) {
    worksheet.getCell(`M${row}`).dataValidation = {
      type: 'decimal',
      allowBlank: true,
      operator: 'greaterThanOrEqual',
      formulae: [0],
      showErrorMessage: true,
      errorStyle: 'warning',
      errorTitle: 'Invalid Wholesale Price',
      error: 'Wholesale price must be a non-negative number (0 or greater)'
    };
  }

  // Column N: netcost - numeric only (decimal allowed, optional)
  for (let row = 2; row <= maxRows; row++) {
    worksheet.getCell(`N${row}`).dataValidation = {
      type: 'decimal',
      allowBlank: true,
      operator: 'greaterThanOrEqual',
      formulae: [0],
      showErrorMessage: true,
      errorStyle: 'warning',
      errorTitle: 'Invalid Net Cost',
      error: 'Net Cost must be a non-negative number (0 or greater)'
    };
  }

  // Column O: safetyquantity - whole number only (optional)
  for (let row = 2; row <= maxRows; row++) {
    worksheet.getCell(`O${row}`).dataValidation = {
      type: 'whole',
      allowBlank: true,
      operator: 'greaterThanOrEqual',
      formulae: [0],
      showErrorMessage: true,
      errorStyle: 'warning',
      errorTitle: 'Invalid Safety Quantity',
      error: 'Safety quantity must be a non-negative whole number'
    };
  }

  // Note: Sheet protection removed to allow copy-paste operations
  // Data validation on cells provides sufficient control without blocking copy-paste
  // If you need protection, users can manually protect the sheet after filling data

  // No sample data - only headers

  // Add data validation notes in a separate sheet
  const guidelinesSheet = workbook.addWorksheet('Guidelines');
  guidelinesSheet.columns = [
    { header: 'Field', key: 'field', width: 20 },
    { header: 'Description', key: 'description', width: 60 },
    { header: 'Required', key: 'required', width: 12 }
  ];

  const notes = [
    { field: 'productname', description: 'Product name (unique per category hierarchy)', required: 'Yes' },
    { field: 'mastercategory', description: 'Master category - MUST exist in system before import', required: 'Yes' },
    { field: 'category', description: 'Category - will be auto-created if doesn\'t exist', required: 'Yes' },
    { field: 'subcategory', description: 'Subcategory - will be auto-created if doesn\'t exist (OPTIONAL)', required: 'No' },
    { field: 'brand', description: 'Brand name - will be auto-created if doesn\'t exist', required: 'Yes' },
    { field: 'packingqty', description: 'Packing quantity (numeric)', required: 'Yes' },
    { field: 'packageuom', description: 'Package UOM name (e.g., NOS, Liter, Kg) - must exist in UOM master', required: 'Yes' },
    { field: 'baseunit', description: 'Base unit UOM name (e.g., NOS, Liter, Kg) - must exist in UOM master', required: 'Yes' },
    { field: 'taxrate', description: 'Tax profile name (e.g., GST 5%, GST 18%) - must exist in tax profile master', required: 'Yes' },
    { field: 'hsncode', description: 'HSN/SAC code', required: 'Yes' },
    { field: 'sellingprice', description: 'Selling price (numeric)', required: 'Yes' },
    { field: 'purchaseprice', description: 'Purchase price (numeric)', required: 'Yes' },
    { field: 'wholesaleprice', description: 'Wholesale price (numeric, optional)', required: 'No' },
    { field: 'netcost', description: 'Net Cost (MRP) (numeric, optional)', required: 'No' },
    { field: 'safetyquantity', description: 'Safety stock quantity (whole number, optional)', required: 'No' },
    { field: 'displayname', description: 'Display name (optional)', required: 'No' },
    { field: 'genericname', description: 'Generic name (optional)', required: 'No' },
    { field: 'itemcode', description: 'Item code (optional)', required: 'No' },
    { field: 'ingredients', description: 'Ingredients (optional)', required: 'No' },
    { field: 'description', description: 'Description (optional)', required: 'No' }
  ];

  // Style header row
  const guidelinesHeaderRow = guidelinesSheet.getRow(1);
  guidelinesHeaderRow.font = { bold: true };
  guidelinesHeaderRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE7E6E6' }
  };

  // Add data rows with color coding
  let currentRow = 2;
  notes.forEach(note => {
    const row = guidelinesSheet.addRow(note);

    // Apply background color based on "Required" value
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      // Apply background color only to columns A, B, C based on Required value
      if (colNumber <= 3) {
        if (note.required === 'Yes') {
          // Light blue for required fields
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFC5D9F1' }
          };
        } else if (note.required === 'No') {
          // Light yellow for optional fields
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFEDEDB7' }
          };
        }
      }
    });
    currentRow++;
  });

  // Add static values info with green background
  guidelinesSheet.addRow({});
  currentRow++;

  const staticHeaderRow = guidelinesSheet.addRow({
    field: 'STATIC VALUES',
    description: 'These values are automatically set for ALL products:',
    required: ''
  });
  staticHeaderRow.font = { bold: true };
  currentRow++;

  const staticValues = [
    { field: 'sellingitemas', description: '1(Goods)', required: 'Auto' },
    { field: 'ignoretax', description: '0 (Do not ignore tax)', required: 'Auto' },
    { field: 'ignorediscount', description: '0 (Do not ignore discount)', required: 'Auto' },
    { field: 'isnegativesale', description: '0 (Do not allow negative sale)', required: 'Auto' },
    { field: 'isactive', description: '1 (Active)', required: 'Auto' },
    { field: 'pricetype', description: '2 (Variable)', required: 'Auto' },
    { field: 'isglobal', description: '1 (Global item)', required: 'Auto' }
  ];

  staticValues.forEach(staticVal => {
    const row = guidelinesSheet.addRow(staticVal);

    // Apply green background to Auto fields
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      // Apply green background only to columns A, B, C for Auto fields
      if (colNumber <= 3) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD8E4BC' }
        };
      }
    });
  });

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
};

module.exports = {
  validateProductImport,
  insertValidatedProducts,
  handleProductImport,
  generateSampleExcel
};
