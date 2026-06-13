import axios from "utils/axios";
import { responseHandler } from "utils/responseHandler";
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const UserService = {
  getFormattedUsers: async ({
    filters,
    start = 0,
    length = 10,
    sortField,
    sortOrder,
  }) => {
    try {
      const response = await axios.get(`/users`, {
        params: {
          filters: JSON.stringify(filters),
          start,
          length,
          ...(sortField && sortOrder ? { sortField, sortOrder } : {}),
        },
      });

      return responseHandler.handleListResponse(response, (user) => ({
        userid: user.userid,
        username: user.username,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
      }));
    } catch (error) {
      return responseHandler.handleListError(error);
    }
  },

  saveUser: async (data) => {
    try {
      let formData = new FormData();

      formData.append("username", data.username);
      formData.append("firstname", data.firstname);
      formData.append("lastname", data.lastname);
      formData.append("email", data.email);
      if (data.password) {
        formData.append("password", data.password);
      }

      // if (data.profilepicFile) {
      //   formData.append("profilepic", data.profilepicFile);
      // }

      if (data.userid) {
        const response = await axios.post(
          `${BASE_URL}/users/update/${data.userid}`,
          formData,
          { headers: { "Content-Type": "application/json" } },
        );
        return responseHandler.handleSuccess(response);
      } else {
        const response = await axios.post(
          `${BASE_URL}/users/create`,
          formData,
          {
            headers: { "Content-Type": "application/json" },
          },
        );
        return responseHandler.handleSuccess(response);
      }
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  getUserById: async (id) => {
    try {
      const response = await axios.get(`/users/${id}`);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },

  deleteUser: async (userid) => {
    try {
      const response = await axios.delete(`/users/${userid}`);
      return responseHandler.handleSuccess(response);
    } catch (error) {
      return responseHandler.handleError(error);
    }
  },
};
