const productModel = require("../../models/masters/product.model");
const auditService = require("../../services/audit.service");
const ResponseFormatter = require("../../utils/responseFormatter");
const winston = require("../../config/winston");
const db = require("../../config/db");

const productController = {
    // GET /products
    async list(req, res) {
        try {
            const { page = 1, limit = 20, product_type, procurement_strategy, is_active, search } = req.query;
            const result = await productModel.findAll({
                page: parseInt(page), limit: parseInt(limit),
                product_type, procurement_strategy,
                is_active: is_active !== undefined ? is_active === "true" : undefined,
                search,
            });
            return res.status(200).json(ResponseFormatter.paginated(
                result.data, result.page, result.limit, result.total, "Products fetched"
            ));
        } catch (err) {
            winston.error(`productController.list: ${err.message}`);
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    // GET /products/low-stock
    async getLowStock(req, res) {
        try {
            const { page = 1, limit = 20 } = req.query;
            const result = await productModel.getLowStock({ page: parseInt(page), limit: parseInt(limit) });
            return res.status(200).json(ResponseFormatter.paginated(
                result.data, result.page, result.limit, result.total, "Low stock products fetched"
            ));
        } catch (err) {
            winston.error(`productController.getLowStock: ${err.message}`);
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    // GET /products/:id
    async getById(req, res) {
        try {
            const product = await productModel.findById(parseInt(req.params.id));
            if (!product) return res.status(404).json(ResponseFormatter.notFound("Product"));
            return res.status(200).json(ResponseFormatter.success(product, "Product fetched"));
        } catch (err) {
            winston.error(`productController.getById: ${err.message}`);
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    // POST /products
    async create(req, res) {
        try {
            const { product_id } = await productModel.create({ ...req.body, created_by: req.user?.userId });
            await auditService.logAudit({
                user_id: req.user?.userId, table_name: "products",
                record_id: product_id, action: "INSERT",
                new_values: req.body, ip_address: req.ip,
            });
            return res.status(201).json(ResponseFormatter.created({ product_id }, "Product created"));
        } catch (err) {
            if (err.message?.includes("Duplicate") || err.code === "ER_DUP_ENTRY") {
                return res.status(409).json(ResponseFormatter.conflict("Product code already exists"));
            }
            winston.error(`productController.create: ${err.message}`);
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    // PUT /products/:id
    async update(req, res) {
        try {
            const product_id = parseInt(req.params.id);
            const existing = await productModel.findById(product_id);
            if (!existing) return res.status(404).json(ResponseFormatter.notFound("Product"));

            await productModel.update(product_id, req.body, req.user?.userId);
            await auditService.logAudit({
                user_id: req.user?.userId, table_name: "products",
                record_id: product_id, action: "UPDATE",
                old_values: existing, new_values: req.body, ip_address: req.ip,
            });
            return res.status(200).json(ResponseFormatter.updated({ product_id }, "Product updated"));
        } catch (err) {
            winston.error(`productController.update: ${err.message}`);
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    // DELETE /products/:id
    async softDelete(req, res) {
        try {
            const product_id = parseInt(req.params.id);
            await productModel.softDelete(product_id, req.user?.userId);
            await auditService.logAudit({
                user_id: req.user?.userId, table_name: "products",
                record_id: product_id, action: "DELETE", ip_address: req.ip,
            });
            return res.status(200).json(ResponseFormatter.deleted("Product deleted"));
        } catch (err) {
            if (err.message.includes("Cannot delete")) {
                return res.status(422).json(ResponseFormatter.error(err.message, 422));
            }
            winston.error(`productController.softDelete: ${err.message}`);
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    // PUT /products/:id/stock — manual stock adjustment
    async adjustStock(req, res) {
        try {
            const product_id = parseInt(req.params.id);
            const { adjustment, reason } = req.body;

            if (adjustment === undefined || adjustment === 0) {
                return res.status(400).json(ResponseFormatter.error("Adjustment qty is required and cannot be 0", 400));
            }

            const result = await db.runInTransaction(async (connection) => {
                const adjustResult = await productModel.adjustStock(
                    product_id, adjustment, reason, req.user?.userId, connection
                );
                await auditService.logAudit({
                    user_id: req.user?.userId, table_name: "products",
                    record_id: product_id, action: "UPDATE",
                    old_values: { on_hand_qty: adjustResult.qty_before },
                    new_values: { on_hand_qty: adjustResult.qty_after, adjustment, reason },
                    ip_address: req.ip,
                });
                return adjustResult;
            });

            return res.status(200).json(ResponseFormatter.success(result, "Stock adjusted successfully"));
        } catch (err) {
            if (err.message.includes("negative")) {
                return res.status(422).json(ResponseFormatter.error(err.message, 422));
            }
            winston.error(`productController.adjustStock: ${err.message}`);
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    // GET /products/:id/vendors
    async getVendors(req, res) {
        try {
            const vendors = await productModel.getVendors(parseInt(req.params.id));
            return res.status(200).json(ResponseFormatter.success(vendors, "Product vendors fetched"));
        } catch (err) {
            winston.error(`productController.getVendors: ${err.message}`);
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    // POST /products/:id/vendors
    async addVendor(req, res) {
        try {
            const product_id = parseInt(req.params.id);
            const result = await productModel.addVendor({ product_id, ...req.body }, req.user?.userId);
            return res.status(201).json(ResponseFormatter.created(result, "Vendor added to product"));
        } catch (err) {
            winston.error(`productController.addVendor: ${err.message}`);
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    // PUT /products/:id/vendors/:pvId
    async updateVendor(req, res) {
        try {
            const pv_id = parseInt(req.params.pvId);
            const result = await productModel.updateVendor(pv_id, req.body, req.user?.userId);
            return res.status(200).json(ResponseFormatter.updated(result, "Vendor link updated"));
        } catch (err) {
            winston.error(`productController.updateVendor: ${err.message}`);
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    // DELETE /products/:id/vendors/:pvId
    async deactivateVendor(req, res) {
        try {
            const pv_id = parseInt(req.params.pvId);
            await productModel.deactivateVendor(pv_id, req.user?.userId);
            return res.status(200).json(ResponseFormatter.deleted("Vendor link deactivated"));
        } catch (err) {
            winston.error(`productController.deactivateVendor: ${err.message}`);
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },
};

module.exports = productController;
