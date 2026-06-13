export const responseHandler = {
  handleSuccess: (response) => {
    if (response.data.success === 1) {
      return {
        success: true,
        data: response.data.data,
        message: response.data.message,
        ...(response.data.meta && { meta: response.data.meta }),
        timestamp: response.data.timestamp,
      };
    }

    // Handle success: 0 responses (validation errors, business logic errors, etc.)
    return {
      success: false,
      error: response.data.error || {
        message: response.data.message || "Request failed",
        statusCode: response.status,
      },
      message: response.data.message,
      timestamp: response.data.timestamp,
    };
  },

  handleError: (error) => {
    console.error("API Error:", error);

    // Handle direct backend response structure (when backend returns success: 0)
    if (error.success === 0 && error.error) {
      return {
        success: false,
        error: error.error,
        message: error.error.message || error.message,
        timestamp: error.timestamp || new Date().toISOString(),
      };
    }

    // Handle axios response errors
    if (error.response?.data) {
      const errorData = error.response.data;

      if (errorData.success === 0 && errorData.error) {
        return {
          success: false,
          error: errorData.error,
          message: errorData.error.message || errorData.message,
          timestamp: errorData.timestamp || new Date().toISOString(),
        };
      }
    }

    return {
      success: false,
      error: {
        message: error.message || "An unexpected error occurred",
        statusCode: error.response?.status || 500,
        ...(error.response?.data?.error?.details && {
          details: error.response.data.error.details,
        }),
        ...(error.error?.details && { details: error.error.details }),
      },
      timestamp: new Date().toISOString(),
    };
  },

  handleListResponse: (response, dataMapper) => {
    if (response.data.success === 1) {
      const dataArray = response.data.data;
      return {
        success: true,
        data: dataMapper ? dataArray.map(dataMapper) : dataArray,
        totalRecords:
          response.data.meta?.pagination?.total ||
          response.data.pagination?.total ||
          dataArray.length,
        message: response.data.message,
        ...(response.data.meta && { meta: response.data.meta }),
        timestamp: response.data.timestamp,
      };
    }

    // Handle success: 0 responses for list operations
    return {
      success: false,
      data: [],
      totalRecords: 0,
      error: response.data.error || {
        message: response.data.message || "Failed to fetch data",
        statusCode: response.status,
      },
      message: response.data.message,
      timestamp: response.data.timestamp,
    };
  },

  handleListError: (error) => {
    console.error("List API Error:", error);

    const errorResponse = responseHandler.handleError(error);
    return {
      ...errorResponse,
      data: [],
      totalRecords: 0,
    };
  },
};
