import axios from "utils/axios";
import { responseHandler } from "utils/responseHandler";

export const ApprovalService = {
  // Brand Approvals
  getUnapprovedBrands: async ({
    filters,
    start = 0,
    length = 10,
    sortField,
    sortOrder,
    companyid,
  }) => {
    try {
      const response = await axios.get(`/brands/approvals/unapproved`, {
        params: {
          filters: JSON.stringify(filters),
          start,
          length,
          ...(sortField && sortOrder ? { sortField, sortOrder } : {}),
          ...(companyid ? { companyid } : {}),
        },
      });

      return responseHandler.handleListResponse(response, (brand) => ({
        brandid: brand.brandid,
        brandname: brand.brandname,
        branddesc: brand.branddesc,
        brandicon: brand.brandicon,
        brandcategory: brand.brandcategory,
        categorynames: brand.categorynames, // Category names joined from itemcategorymaster
        companyid: brand.companyid,
        isapproved: brand.isapproved,
        approvalremark: brand.approvalremark,
        createddate: brand.createddate,
        modifieddate: brand.modifieddate,
        createdby: brand.createdby,
        modifiedby: brand.modifiedby,
        ipaddress: brand.ipaddress,
        uniquekey: brand.uniquekey,
        issync: brand.issync,
        similar_brands: brand.similar_brands || [],
        similar_brands_count: brand.similar_brands_count || 0,
      }));
    } catch (error) {
      return responseHandler.handleListError(error);
    }
  },

  approveBrand: async (brandId, approvalremark = "") => {
    try {
      const response = await axios.put(
        `/brands/approvals/${brandId}/approve`,
        { approvalremark }
      );
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  getBrandRejectionReasons: async () => {
    try {
      const response = await axios.get(`/brands/approvals/rejection-reasons`);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  rejectBrand: async (brandId, rejectionreason, rejectionremark = "", replacewith = null) => {
    try {
      const response = await axios.put(
        `/brands/approvals/${brandId}/reject`,
        { rejectionreason, rejectionremark, replacewith }
      );
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  bulkApproveBrands: async (brandids, approvalremark = "") => {
    try {
      const response = await axios.post(`/brands/approvals/bulk-approve`, {
        brandids,
        approvalremark,
      });
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  bulkRejectBrands: async (brandids, rejectionreason, rejectionremark = "") => {
    try {
      const response = await axios.post(`/brands/approvals/bulk-reject`, {
        brandids,
        rejectionreason,
        rejectionremark,
      });
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  // Item Approvals
  getUnapprovedItems: async ({
    filters,
    start = 0,
    length = 10,
    sortField,
    sortOrder,
    companyid,
  }) => {
    try {
      const response = await axios.get(`/items/approvals/unapproved`, {
        params: {
          filters: JSON.stringify(filters),
          start,
          length,
          ...(sortField && sortOrder ? { sortField, sortOrder } : {}),
          ...(companyid ? { companyid } : {}),
        },
      });

      return responseHandler.handleListResponse(response, (item) => ({
        itemid: item.itemid,
        itemname: item.itemname,
        itemdisplayname: item.itemdisplayname,
        genericname: item.genericname,
        itemcode: item.itemcode,
        itembarcode: item.itembarcode,
        sellingprice: item.sellingprice,
        purchaseprice: item.purchaseprice,
        wholesaleprice: item.wholesaleprice,
        netcost: item.netcost,
        mastercategoryid: item.mastercategoryid,
        mastercatname: item.mastercatname,
        categoryid: item.categoryid,
        catname: item.catname,
        subcategoryid: item.subcategoryid,
        subcatname: item.subcatname,
        brandid: item.brandid,
        brandname: item.brandname,
        defaulttaxprofileid: item.defaulttaxprofileid,
        taxprofilename: item.taxprofilename,
        itemtypeid: item.itemtypeid,
        appearanceid: item.appearanceid,
        packingqty: item.packingqty,
        packageuom: item.packageuom,
        safetyquantity: item.safetyquantity,
        sellingitemas: item.sellingitemas,
        hsnseccode: item.hsnseccode,
        pricetype: item.pricetype,
        ingredients: item.ingredients,
        description: item.description,
        baseunit: item.baseunit,
        ismanufacturer: item.ismanufacturer,
        batchquantity: item.batchquantity,
        ispackingitem: item.ispackingitem,
        isnegativesale: item.isnegativesale,
        ignoretax: item.ignoretax,
        ignorediscount: item.ignorediscount,
        imgpath: item.imgpath,
        companyid: item.companyid,
        isapproved: item.isapproved,
        approvalremark: item.approvalremark,
        rejectionreason: item.rejectionreason,
        createddate: item.createddate,
        modifieddate: item.modifieddate,
        createdby: item.createdby,
        modifiedby: item.modifiedby,
        ipaddress: item.ipaddress,
        uniquekey: item.uniquekey,
        similar_items: item.similar_items || [],
        similar_items_count: item.similar_items_count || 0,
        companyname: item.companyname,
      }));
    } catch (error) {
      return responseHandler.handleListError(error);
    }
  },

  approveItem: async (itemId, approvalremark = "") => {
    try {
      const response = await axios.put(
        `/items/approvals/${itemId}/approve`,
        { approvalremark }
      );
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  rejectItem: async (itemId, rejectionreason = "", rejectionremark = "", replacewith = null) => {
    try {
      const response = await axios.put(
        `/items/approvals/${itemId}/reject`,
        { rejectionreason, rejectionremark, replacewith }
      );
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  bulkApproveItems: async (itemids, approvalremark = "") => {
    try {
      const response = await axios.post(`/items/approvals/bulk-approve`, {
        itemids,
        approvalremark,
      });
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  bulkRejectItems: async (itemids, rejectionreason = "", rejectionremark = "") => {
    try {
      const response = await axios.post(`/items/approvals/bulk-reject`, {
        itemids,
        rejectionreason,
        rejectionremark,
      });
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  // Get rejection reasons
  getItemRejectionReasons: async () => {
    try {
      const response = await axios.get(`/items/approvals/rejection-reasons`);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  // Get similar items for a specific item
  getSimilarItems: async (itemId) => {
    try {
      const response = await axios.get(`/items/approvals/${itemId}/similar`);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  // Supplier Approvals
  getUnapprovedSuppliers: async ({
    filters,
    start = 0,
    length = 10,
    sortField,
    sortOrder,
    companyid,
  }) => {
    try {
      const response = await axios.get(`/suppliers/approvals/unapproved`, {
        params: {
          filters: JSON.stringify(filters),
          start,
          length,
          ...(sortField && sortOrder ? { sortField, sortOrder } : {}),
          ...(companyid ? { companyid } : {}),
        },
      });

      return responseHandler.handleListResponse(response, (supplier) => ({
        id: supplier.id,
        suppliername: supplier.suppliername,
        address: supplier.address,
        gstno: supplier.gstno,
        panno: supplier.panno,
        vatno: supplier.vatno,
        phoneno: supplier.phoneno,
        email: supplier.email,
        pincode: supplier.pincode,
        contactperson: supplier.contactperson,
        countryid: supplier.countryid,
        countryname: supplier.countryname,
        stateid: supplier.stateid,
        statename: supplier.statename,
        cityid: supplier.cityid,
        cityname: supplier.cityname,
        supplierimage: supplier.supplierimage,
        outstandingamt: supplier.outstandingamt,
        seedslicensenumber: supplier.seedslicensenumber,
        seedslicensedate: supplier.seedslicensedate,
        fertilizerlicensenumber: supplier.fertilizerlicensenumber,
        fertilizerlicensedate: supplier.fertilizerlicensedate,
        pesticideslicensenumber: supplier.pesticideslicensenumber,
        pesticideslicensedate: supplier.pesticideslicensedate,
        licensetype: supplier.licensetype,
        companyid: supplier.companyid,
        isapproved: supplier.isapproved,
        approvalremark: supplier.approvalremark,
        createddate: supplier.createddate,
        modifieddate: supplier.modifieddate,
        createdby: supplier.createdby,
        modifiedby: supplier.modifiedby,
        ipaddress: supplier.ipaddress,
        uniquekey: supplier.uniquekey,
        issync: supplier.issync,
        similar_suppliers: supplier.similar_suppliers || [],
        similar_suppliers_count: supplier.similar_suppliers_count || 0,
      }));
    } catch (error) {
      return responseHandler.handleListError(error);
    }
  },

  approveSupplier: async (supplierId, approvalremark = "") => {
    try {
      const response = await axios.put(
        `/suppliers/approvals/${supplierId}/approve`,
        { approvalremark }
      );
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  getSupplierRejectionReasons: async () => {
    try {
      const response = await axios.get(`/suppliers/approvals/rejection-reasons`);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  rejectSupplier: async (supplierId, rejectionreason, rejectionremark = "", replacewith = null) => {
    try {
      const response = await axios.put(
        `/suppliers/approvals/${supplierId}/reject`,
        { rejectionreason, rejectionremark, replacewith }
      );
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  bulkApproveSuppliers: async (supplierids, approvalremark = "") => {
    try {
      const response = await axios.post(`/suppliers/approvals/bulk-approve`, {
        supplierids,
        approvalremark,
      });
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  bulkRejectSuppliers: async (supplierids, rejectionreason, rejectionremark = "") => {
    try {
      const response = await axios.post(`/suppliers/approvals/bulk-reject`, {
        supplierids,
        rejectionreason,
        rejectionremark,
      });
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },
};
