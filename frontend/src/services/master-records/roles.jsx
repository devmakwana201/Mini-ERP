import axios from "utils/axios";
import { responseHandler } from "utils/responseHandler";

export const RoleService = {
  getFormattedRoles: async ({
    filters,
    start = 0,
    length = 10,
    sortField,
    sortOrder,
  }) => {
    try {
      const response = await axios.get(`/roles`, {
        params: {
          filters: JSON.stringify(filters),
          start,
          length,
          ...(sortField && sortOrder ? { sortField, sortOrder } : {}),
        },
      });

      return responseHandler.handleListResponse(response, (role) => ({
        roleid: role.roleid,
        rolename: role.rolename,
        type: role.type,
        createdby: role.createdby,
        createddate: role.createddate,
        modifedby: role.modifedby,
        modifeddate: role.modifeddate,
        ipaddress: role.ipaddress,
        isdeleted: role.isdeleted,
      }));
    } catch (error) {
      return responseHandler.handleListError(error);
    }
  },

  createRole: async (roleData) => {
    try {
      const response = await axios.post(`/roles`, {
        rolename: roleData.roleName,
      });

      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  getRoleById: async (roleId) => {
    try {
      const response = await axios.get(`/roles/${roleId}`);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  updateRole: async (roleId, roleData) => {
    try {
      const response = await axios.put(`/roles/${roleId}`, {
        rolename: roleData.roleName,
      });

      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  deleteRole: async (roleId) => {
    try {
      const response = await axios.delete(`/roles/${roleId}`);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },
};