const partnerModel = require("../../models/masters/partner.model");
const auditService = require("../../services/audit.service");
const ResponseFormatter = require("../../utils/responseFormatter");
const winston = require("../../config/winston");

const partnerController = {
    // GET /partners
    async list(req, res) {
        try {
            const { page = 1, limit = 20, is_vendor, is_customer, is_active, search } = req.query;
            const result = await partnerModel.findAll({
                page: parseInt(page),
                limit: parseInt(limit),
                is_vendor: is_vendor !== undefined ? is_vendor === "true" : undefined,
                is_customer: is_customer !== undefined ? is_customer === "true" : undefined,
                is_active: is_active !== undefined ? is_active === "true" : undefined,
                search,
            });
            return res.status(200).json(ResponseFormatter.paginated(
                result.data, result.page, result.limit, result.total, "Partners fetched"
            ));
        } catch (err) {
            winston.error(`partnerController.list: ${err.message}`);
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    // GET /partners/vendors
    async listVendors(req, res) {
        try {
            const { page = 1, limit = 20, search } = req.query;
            const result = await partnerModel.findVendors({ page: parseInt(page), limit: parseInt(limit), search });
            return res.status(200).json(ResponseFormatter.paginated(
                result.data, result.page, result.limit, result.total, "Vendors fetched"
            ));
        } catch (err) {
            winston.error(`partnerController.listVendors: ${err.message}`);
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    // GET /partners/customers
    async listCustomers(req, res) {
        try {
            const { page = 1, limit = 20, search } = req.query;
            const result = await partnerModel.findCustomers({ page: parseInt(page), limit: parseInt(limit), search });
            return res.status(200).json(ResponseFormatter.paginated(
                result.data, result.page, result.limit, result.total, "Customers fetched"
            ));
        } catch (err) {
            winston.error(`partnerController.listCustomers: ${err.message}`);
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    // GET /partners/:id
    async getById(req, res) {
        try {
            const partner = await partnerModel.findById(parseInt(req.params.id));
            if (!partner) return res.status(404).json(ResponseFormatter.notFound("Partner"));
            return res.status(200).json(ResponseFormatter.success(partner, "Partner fetched"));
        } catch (err) {
            winston.error(`partnerController.getById: ${err.message}`);
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    // POST /partners
    async create(req, res) {
        try {
            const { is_vendor, is_customer } = req.body;
            if (!is_vendor && !is_customer) {
                return res.status(400).json(ResponseFormatter.error("Partner must be a vendor, customer, or both", 400));
            }

            const { partner_id } = await partnerModel.create({
                ...req.body,
                created_by: req.user?.userId,
            });

            await auditService.logAudit({
                user_id: req.user?.userId,
                table_name: "partners",
                record_id: partner_id,
                action: "INSERT",
                new_values: req.body,
                ip_address: req.ip,
            });

            return res.status(201).json(ResponseFormatter.created({ partner_id }, "Partner created"));
        } catch (err) {
            winston.error(`partnerController.create: ${err.message}`);
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    // PUT /partners/:id
    async update(req, res) {
        try {
            const partner_id = parseInt(req.params.id);
            const existing = await partnerModel.findById(partner_id);
            if (!existing) return res.status(404).json(ResponseFormatter.notFound("Partner"));

            const { is_vendor, is_customer } = { ...existing, ...req.body };
            if (!is_vendor && !is_customer) {
                return res.status(400).json(ResponseFormatter.error("Partner must be a vendor, customer, or both", 400));
            }

            await partnerModel.update(partner_id, req.body, req.user?.userId);

            await auditService.logAudit({
                user_id: req.user?.userId,
                table_name: "partners",
                record_id: partner_id,
                action: "UPDATE",
                old_values: existing,
                new_values: req.body,
                ip_address: req.ip,
            });

            return res.status(200).json(ResponseFormatter.updated({ partner_id }, "Partner updated"));
        } catch (err) {
            winston.error(`partnerController.update: ${err.message}`);
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    // DELETE /partners/:id
    async softDelete(req, res) {
        try {
            const partner_id = parseInt(req.params.id);
            await partnerModel.softDelete(partner_id, req.user?.userId);

            await auditService.logAudit({
                user_id: req.user?.userId,
                table_name: "partners",
                record_id: partner_id,
                action: "DELETE",
                ip_address: req.ip,
            });

            return res.status(200).json(ResponseFormatter.deleted("Partner deleted"));
        } catch (err) {
            if (err.message.includes("Cannot delete")) {
                return res.status(422).json(ResponseFormatter.error(err.message, 422));
            }
            winston.error(`partnerController.softDelete: ${err.message}`);
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    // GET /partners/:id/products
    async getPartnerProducts(req, res) {
        try {
            const partner_id = parseInt(req.params.id);
            const products = await partnerModel.getVendorProducts(partner_id);
            return res.status(200).json(ResponseFormatter.success(products, "Vendor products fetched"));
        } catch (err) {
            winston.error(`partnerController.getPartnerProducts: ${err.message}`);
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    // POST /partners/:id/products
    async addProductLink(req, res) {
        try {
            const partner_id = parseInt(req.params.id);
            const result = await partnerModel.addProductVendorLink(
                { partner_id, ...req.body },
                req.user?.userId
            );
            return res.status(201).json(ResponseFormatter.created(result, "Product linked to vendor"));
        } catch (err) {
            if (err.message.includes("must be a vendor")) {
                return res.status(422).json(ResponseFormatter.error(err.message, 422));
            }
            winston.error(`partnerController.addProductLink: ${err.message}`);
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },

    // DELETE /partners/:id/products/:productId
    async removeProductLink(req, res) {
        try {
            const partner_id = parseInt(req.params.id);
            const product_id = parseInt(req.params.productId);
            await partnerModel.removeProductVendorLink(partner_id, product_id);
            return res.status(200).json(ResponseFormatter.deleted("Vendor-product link removed"));
        } catch (err) {
            winston.error(`partnerController.removeProductLink: ${err.message}`);
            return res.status(500).json(ResponseFormatter.serverError(err.message));
        }
    },
};

module.exports = partnerController;
