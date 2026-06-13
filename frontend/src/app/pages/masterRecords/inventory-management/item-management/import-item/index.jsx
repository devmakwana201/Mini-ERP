import React, { useState, useRef } from "react";
import { Button } from "primereact/button";
import { FileUpload } from "primereact/fileupload";
import { Toast } from "primereact/toast";
import { useNavigate } from "react-router-dom";
import { Page } from "components/shared/Page";
import { Steps } from "primereact/steps";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Badge } from "primereact/badge";
import { Card } from "primereact/card";
import { InputText } from "primereact/inputtext";
import { ItemService } from "services/master-records/items";

const ProductExcelUpload = () => {
  const toast = useRef(null);
  const navigate = useNavigate();
  const fileUploadRef = useRef(null);

  const [excelFile, setExcelFile] = useState(null);
  const [excelPreview, setExcelPreview] = useState(null);
  const [fileError, setFileError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [validationResponse, setValidationResponse] = useState(null);
  const [categorySearch, setCategorySearch] = useState('');
  const [subCategorySearch, setSubCategorySearch] = useState('');
  const [brandSearch, setBrandSearch] = useState('');

  const steps = [
    { label: "Upload Excel" },
    { label: "Validation Summary" },
  ];

  // Handle file selection
  const handleFileSelect = (e) => {
    const file = e?.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = [
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];

    if (!validTypes.includes(file.type)) {
      setFileError("Please upload a valid Excel file (.xls or .xlsx)");
      setExcelFile(null);
      setExcelPreview(null);
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5000000) {
      setFileError("File size should be less than 5MB");
      setExcelFile(null);
      setExcelPreview(null);
      return;
    }

    setFileError(null);
    setExcelFile(file);
    setExcelPreview({
      name: file.name,
      size: (file.size / 1024).toFixed(2) + " KB",
    });
  };

  // Clear selected file
  const handleClearFile = () => {
    setExcelFile(null);
    setExcelPreview(null);
    setFileError(null);
    if (fileUploadRef.current) {
      fileUploadRef.current.clear();
    }
  };

  // Handle Next button - Validate Excel
  const handleNext = async () => {
    if (!excelFile) {
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "Please select an Excel file to upload",
        life: 3000,
      });
      return;
    }

    setLoading(true);

    try {
      const result = await ItemService.validateImport(excelFile);

      if (!result.success) {
        // Get the detailed error message - prioritize message over statusCode
        const errorDetail = result.message || result.error?.message || (result.error?.statusCode ? `Error ${result.error.statusCode}` : null) || "Failed to validate Excel file";

        toast.current.show({
          severity: "error",
          summary: "Validation Check",
          detail: errorDetail,
          life: 5000,
        });
        setLoading(false);
        return;
      }

      const validationData = result.data;

      // Check if validation succeeded
      if (!validationData.success) {
        const errorDetail = validationData.message || validationData.error?.message || (typeof validationData.error === 'string' ? validationData.error : validationData.error?.statusCode ? `Error ${validationData.error.statusCode}` : null) || "Invalid file format";

        toast.current.show({
          severity: "error",
          summary: "Validation Error",
          detail: errorDetail,
          life: 5000,
        });
        setLoading(false);
        return;
      }

      // Set validation response and move to next step
      setValidationResponse(validationData);
      setActiveStep(1);
      setLoading(false);

      // Show validation message
      toast.current.show({
        severity: validationData.errorsCount > 0 ? "warn" : "success",
        summary: "Validation Complete",
        detail: validationData.message || `Found ${validationData.validRows} valid rows`,
        life: 3000,
      });
    } catch (error) {
      const errorDetail = error.message || error.error?.message || (error.error?.statusCode ? `Error ${error.error.statusCode}` : null) || "Failed to validate Excel file";

      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: errorDetail,
        life: 5000,
      });
      setLoading(false);
    }
  };

  // Handle Back button
  const handleBack = () => {
    setActiveStep(0);
    setValidationResponse(null);
  };

  // Handle download sample Excel
  const handleDownloadSample = async () => {
    try {
      setLoading(true);
      const result = await ItemService.downloadSampleExcel();

      if (result.success) {
        toast.current.show({
          severity: "success",
          summary: "Success",
          detail: result.message,
          life: 3000,
        });
      }
    } catch (error) {
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "Failed to download sample template",
        life: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    setLoading(true);

    try {
      const result = await ItemService.confirmImport(excelFile);

      if (!result.success) {
        const errorDetail = result.message || result.error?.message || (result.error?.statusCode ? `Error ${result.error.statusCode}` : null) || "Failed to import products";
        
        toast.current.show({
          severity: "error",
          summary: "Import Failed",
          detail: errorDetail,
          life: 3000,
        });
        setLoading(false);
        return;
      }

      const importData = result.data;

      // Check if import succeeded
      if (!importData.success) {
        const errorDetail = importData.message || (typeof importData.error === 'string' ? importData.error : importData.error?.message) || (importData.error?.statusCode ? `Error ${importData.error.statusCode}` : null) || "Import operation failed";
        
        toast.current.show({
          severity: "error",
          summary: "Import Error",
          detail: errorDetail,
          life: 3000,
        });
        setLoading(false);
        return;
      }

      // Show success message with summary
      const summary = importData.summary;
      const successMessage = importData.message ||
        `Successfully added ${summary.addedProducts} products. ${summary.skippedProducts} products were skipped (duplicates or existing products).`;

      toast.current.show({
        severity: "success",
        summary: "Import Successful",
        detail: successMessage,
        life: 5000,
      });

      setLoading(false);

      // Navigate back to list after short delay
      setTimeout(() => {
        navigate("/master-records/inventory/item/item-list");
      }, 2000);
    } catch (error) {
      const errorDetail = error.message || error.error?.message || (error.error?.statusCode ? `Error ${error.error.statusCode}` : null) || "Failed to import products";
      
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: errorDetail,
        life: 3000,
      });
      setLoading(false);
    }
  };

  return (
    <Page title="Import Items">
      <Toast ref={toast} />
      <div className="w-full px-(--margin-x) pt-5 lg:pt-6">
        <div className="grid grid-cols-12 gap-4 sm:gap-5 lg:gap-6">
          <div className="col-span-12">
            <div className="prime-card">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Import Items via Excel</h3>
                <div className="flex gap-2">
                  {activeStep === 1 && (
                    <Button
                      label="Back"
                      icon="pi pi-arrow-left"
                      className="p-button-sm"
                      severity="secondary"
                      onClick={handleBack}
                      disabled={loading}
                    />
                  )}
                  <Button
                    label="Back to Item List"
                    icon="pi pi-arrow-left"
                    className="p-button-sm"
                    severity="secondary"
                    onClick={() => navigate("/master-records/inventory/item/item-list")}
                  />
                </div>
              </div>

              {/* Stepper */}
              <div className="mb-6">
                <Steps model={steps} activeIndex={activeStep} readOnly />
              </div>

              {/* Step 1: Upload Excel */}
              {activeStep === 0 && (
                <div className="mt-6">
                  {/* Instructions Banner */}
                  <div className="mb-6 rounded-lg bg-blue-50 p-4 border-l-4 border-blue-500">
                    <div className="flex items-start gap-3">
                      <i className="pi pi-info-circle text-xl text-blue-600 mt-0.5"></i>
                      <div>
                        <h5 className="font-semibold text-blue-900 mb-1">How to Import Items</h5>
                        <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                          <li>Download the sample Excel template with pre-defined columns</li>
                          <li>Fill in your item data following the format</li>
                          <li>Upload the completed Excel file for validation</li>
                        </ol>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Download Sample Section - Moved to Left */}
                    <div className="rounded-lg border-2 border-solid border-green-200 bg-gradient-to-br from-green-50 to-white p-5 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="rounded-full bg-green-100 p-4">
                          <i className="pi pi-download text-3xl text-green-600"></i>
                        </div>
                        <h4 className="text-base font-semibold text-gray-800">Step 1: Download Template</h4>
                        <p className="text-center text-sm text-gray-600">
                          Get the sample Excel template with all required columns
                        </p>

                        <Button
                          label="Download Sample Template"
                          icon="pi pi-download"
                          className="p-button-sm border-none bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400 shadow-sm"
                          onClick={handleDownloadSample}
                          disabled={loading}
                        />

                        <div className="mt-2 w-full rounded-lg bg-white border border-green-200 p-3">
                          <div className="flex items-start gap-2">
                            <i className="pi pi-check-circle mt-0.5 text-green-600 text-sm"></i>
                            <p className="text-sm text-gray-700">
                              Template includes all required columns with proper format. Fill in your data and proceed to upload.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Upload Excel Section - Moved to Right */}
                    <div className="rounded-lg border-2 border-dashed border-blue-300 bg-gradient-to-br from-blue-50 to-white p-5 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="rounded-full bg-blue-100 p-4">
                          <i className="pi pi-cloud-upload text-3xl text-blue-600"></i>
                        </div>
                        <h4 className="text-base font-semibold text-gray-800">Step 2: Upload Your File</h4>
                        <p className="text-center text-sm text-gray-600">
                          Select the Excel file (.xls or .xlsx) with your item data
                        </p>

                        <div className="flex justify-center w-full">
                          <FileUpload
                            ref={fileUploadRef}
                            mode="basic"
                            accept=".xls,.xlsx"
                            maxFileSize={5000000}
                            onSelect={handleFileSelect}
                            chooseLabel="Choose Excel File"
                            className={fileError ? "p-invalid" : ""}
                            customUpload
                          />
                        </div>

                        {fileError && (
                          <div className="w-full rounded-lg bg-red-50 border border-red-200 p-3">
                            <div className="flex items-center gap-2">
                              <i className="pi pi-exclamation-triangle text-red-600"></i>
                              <small className="text-red-600 font-medium">{fileError}</small>
                            </div>
                          </div>
                        )}

                        {excelPreview && (
                          <div className="mt-4 w-full rounded-lg bg-white border-2 border-green-200 p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="rounded-lg bg-green-100 p-2">
                                  <i className="pi pi-file-excel text-3xl text-green-600"></i>
                                </div>
                                <div className="flex flex-col">
                                  <span
                                    className="max-w-[200px] truncate font-semibold text-gray-800"
                                    title={excelPreview.name}
                                  >
                                    {excelPreview.name}
                                  </span>
                                  <span className="text-sm text-gray-500">
                                    {excelPreview.size}
                                  </span>
                                </div>
                              </div>
                              <Button
                                icon="pi pi-times"
                                className="p-button-rounded p-button-text p-button-danger"
                                onClick={handleClearFile}
                                tooltip="Remove file"
                                tooltipOptions={{ position: 'top' }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Next Button */}
                  <div className="mt-8 flex justify-end">
                    <Button
                      label={loading ? "Validating..." : "Validate & Continue"}
                      onClick={handleNext}
                      disabled={loading || !excelFile}
                      icon={loading ? "pi pi-spin pi-spinner" : "pi pi-arrow-right"}
                      iconPos="right"
                      className="border-none bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400 shadow-md"
                    />
                  </div>
                </div>
              )}  

              {/* Step 2: Validation Summary */}
              {activeStep === 1 && validationResponse && (
                <div className="mt-6">
                  {/* Validation Status Banner */}
                  <div className={`mb-6 rounded-lg p-4 border-l-4 ${
                    validationResponse.errorsCount > 0
                      ? 'bg-red-50 border-red-500'
                      : 'bg-green-50 border-green-500'
                  }`}>
                    <div className="flex items-center gap-3">
                      <i className={`text-2xl ${
                        validationResponse.errorsCount > 0
                          ? 'pi pi-exclamation-circle text-red-600'
                          : 'pi pi-check-circle text-green-600'
                      }`}></i>
                      <div className="flex-1">
                        <h5 className={`font-semibold ${
                          validationResponse.errorsCount > 0
                            ? 'text-red-900'
                            : 'text-green-900'
                        }`}>
                          {validationResponse.errorsCount > 0
                            ? 'Validation Completed with Errors'
                            : 'Validation Successful'}
                        </h5>
                        <p className={`text-sm ${
                          validationResponse.errorsCount > 0
                            ? 'text-red-700'
                            : 'text-green-700'
                        }`}>
                          {validationResponse.errorsCount > 0
                            ? `Please fix ${validationResponse.errorsCount} error(s) before proceeding with the import.`
                            : `Ready to import ${validationResponse.newProductsCount} new item(s).`}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Summary Cards */}
                  <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card className="border-l-4 border-blue-500 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Total Rows</p>
                          <p className="text-3xl font-bold text-blue-600">{validationResponse.totalRows}</p>
                        </div>
                        <div className="rounded-full bg-blue-100 p-3">
                          <i className="pi pi-file text-2xl text-blue-600"></i>
                        </div>
                      </div>
                    </Card>

                    <Card className="border-l-4 border-green-500 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">New Items</p>
                          <p className="text-3xl font-bold text-green-600">
                            {validationResponse.newProductsCount}
                          </p>
                        </div>
                        <div className="rounded-full bg-green-100 p-3">
                          <i className="pi pi-plus-circle text-2xl text-green-600"></i>
                        </div>
                      </div>
                    </Card>

                    <Card className="border-l-4 border-orange-500 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Existing Items (Will Skip)</p>
                          {/* <p className="text-sm text-gray-500 mt-0.5">(Will Skip)</p> */}
                          <p className="text-3xl font-bold text-orange-600">
                            {validationResponse.existingProductsCount}
                          </p>
                        </div>
                        <div className="rounded-full bg-orange-100 p-3">
                          <i className="pi pi-ban text-2xl text-orange-600"></i>
                        </div>
                      </div>
                    </Card>

                    <Card className={`border-l-4 shadow-sm hover:shadow-md transition-shadow ${
                      validationResponse.errorsCount > 0 ? 'border-red-500 bg-red-50' : 'border-gray-300'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Errors</p>
                          <p className={`text-3xl font-bold ${
                            validationResponse.errorsCount > 0 ? 'text-red-600' : 'text-gray-400'
                          }`}>
                            {validationResponse.errorsCount}
                          </p>
                        </div>
                        <div className={`rounded-full p-3 ${
                          validationResponse.errorsCount > 0 ? 'bg-red-100' : 'bg-gray-100'
                        }`}>
                          <i className={`text-2xl ${
                            validationResponse.errorsCount > 0
                              ? 'pi pi-exclamation-triangle text-red-600'
                              : 'pi pi-check text-gray-400'
                          }`}></i>
                        </div>
                      </div>
                    </Card>
                  </div>

                  {/* New Master Data Section */}
                  <div className="mb-6">
                    <h4 className="mb-4 text-lg font-semibold text-gray-800 flex items-center gap-2">
                      <i className="pi pi-database text-blue-600"></i>
                      New Master Data to be Created
                    </h4>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <Card className="shadow-sm hover:shadow-md transition-shadow border border-gray-200">
                        <h5 className="mb-3 font-semibold flex items-center gap-2">
                          <i className="pi pi-tag text-green-600"></i>
                          New Categories
                          <Badge value={validationResponse.newCategoriesCount} severity="success" />
                        </h5>
                      {validationResponse.newCategoriesCount > 0 && (
                        <>
                          <div className="mb-3">
                            <span className="p-input-icon-left w-full">
                              <i className="pi pi-search" style={{ left: '0.75rem' }} />
                              <InputText
                                value={categorySearch}
                                onChange={(e) => setCategorySearch(e.target.value)}
                                placeholder="Search categories..."
                                className="w-full pl-10"
                              />
                            </span>
                          </div>
                          <div className="max-h-60 overflow-y-auto border rounded-lg bg-gray-50 p-3">
                            <ul className="space-y-2">
                              {validationResponse.newCategories
                                .filter((cat) =>
                                  cat.toLowerCase().includes(categorySearch.toLowerCase())
                                )
                                .map((cat, idx) => (
                                  <li
                                    key={idx}
                                    className="flex items-center gap-2 rounded bg-white px-3 py-2 shadow-sm"
                                  >
                                    <i className="pi pi-tag text-green-600"></i>
                                    <span className="text-sm">{cat}</span>
                                  </li>
                                ))}
                              {validationResponse.newCategories.filter((cat) =>
                                cat.toLowerCase().includes(categorySearch.toLowerCase())
                              ).length === 0 && (
                                <li className="text-center text-sm text-gray-500 py-4">
                                  No categories found
                                </li>
                              )}
                            </ul>
                          </div>
                          {categorySearch && (
                            <p className="mt-2 text-xs text-gray-500">
                              Showing {validationResponse.newCategories.filter((cat) =>
                                cat.toLowerCase().includes(categorySearch.toLowerCase())
                              ).length} of {validationResponse.newCategoriesCount} categories
                            </p>
                          )}
                        </>
                      )}
                      {validationResponse.newCategoriesCount === 0 && (
                        <p className="text-sm text-gray-500 text-center py-4">No new categories to create</p>
                      )}
                    </Card>

                    <Card className="shadow-sm hover:shadow-md transition-shadow border border-gray-200">
                      <h5 className="mb-3 font-semibold flex items-center gap-2">
                        <i className="pi pi-tags text-green-600"></i>
                        New SubCategories
                        <Badge value={validationResponse.newSubCategoriesCount} severity="success" />
                      </h5>
                      {validationResponse.newSubCategoriesCount > 0 && (
                        <>
                          <div className="mb-3">
                            <span className="p-input-icon-left w-full">
                              <i className="pi pi-search" style={{ left: '0.75rem' }} />
                              <InputText
                                value={subCategorySearch}
                                onChange={(e) => setSubCategorySearch(e.target.value)}
                                placeholder="Search subcategories..."
                                className="w-full pl-10"
                              />
                            </span>
                          </div>
                          <div className="max-h-60 overflow-y-auto border rounded-lg bg-gray-50 p-3">
                            <ul className="space-y-2">
                              {validationResponse.newSubCategories
                                .filter((subcat) =>
                                  subcat.toLowerCase().includes(subCategorySearch.toLowerCase())
                                )
                                .map((subcat, idx) => (
                                  <li
                                    key={idx}
                                    className="flex items-center gap-2 rounded bg-white px-3 py-2 shadow-sm"
                                  >
                                    <i className="pi pi-tags text-green-600"></i>
                                    <span className="text-sm">{subcat}</span>
                                  </li>
                                ))}
                              {validationResponse.newSubCategories.filter((subcat) =>
                                subcat.toLowerCase().includes(subCategorySearch.toLowerCase())
                              ).length === 0 && (
                                <li className="text-center text-sm text-gray-500 py-4">
                                  No subcategories found
                                </li>
                              )}
                            </ul>
                          </div>
                          {subCategorySearch && (
                            <p className="mt-2 text-xs text-gray-500">
                              Showing {validationResponse.newSubCategories.filter((subcat) =>
                                subcat.toLowerCase().includes(subCategorySearch.toLowerCase())
                              ).length} of {validationResponse.newSubCategoriesCount} subcategories
                            </p>
                          )}
                        </>
                      )}
                      {validationResponse.newSubCategoriesCount === 0 && (
                        <p className="text-sm text-gray-500 text-center py-4">No new subcategories to create</p>
                      )}
                    </Card>

                    <Card className="shadow-sm hover:shadow-md transition-shadow border border-gray-200">
                      <h5 className="mb-3 font-semibold flex items-center gap-2">
                        <i className="pi pi-bookmark text-green-600"></i>
                        New Brands
                        <Badge value={validationResponse.newBrandsCount} severity="success" />
                      </h5>
                      {validationResponse.newBrandsCount > 0 && (
                        <>
                          <div className="mb-3">
                            <span className="p-input-icon-left w-full">
                              <i className="pi pi-search" style={{ left: '0.75rem' }} />
                              <InputText
                                value={brandSearch}
                                onChange={(e) => setBrandSearch(e.target.value)}
                                placeholder="Search brands..."
                                className="w-full pl-10"
                              />
                            </span>
                          </div>
                          <div className="max-h-60 overflow-y-auto border rounded-lg bg-gray-50 p-3">
                            <ul className="space-y-2">
                              {validationResponse.newBrands
                                .filter((brand) =>
                                  brand.toLowerCase().includes(brandSearch.toLowerCase())
                                )
                                .map((brand, idx) => (
                                  <li
                                    key={idx}
                                    className="flex items-center gap-2 rounded bg-white px-3 py-2 shadow-sm"
                                  >
                                    <i className="pi pi-bookmark text-green-600"></i>
                                    <span className="text-sm">{brand}</span>
                                  </li>
                                ))}
                              {validationResponse.newBrands.filter((brand) =>
                                brand.toLowerCase().includes(brandSearch.toLowerCase())
                              ).length === 0 && (
                                <li className="text-center text-sm text-gray-500 py-4">
                                  No brands found
                                </li>
                              )}
                            </ul>
                          </div>
                          {brandSearch && (
                            <p className="mt-2 text-xs text-gray-500">
                              Showing {validationResponse.newBrands.filter((brand) =>
                                brand.toLowerCase().includes(brandSearch.toLowerCase())
                              ).length} of {validationResponse.newBrandsCount} brands
                            </p>
                          )}
                        </>
                      )}
                      {validationResponse.newBrandsCount === 0 && (
                        <p className="text-sm text-gray-500 text-center py-4">No new brands to create</p>
                      )}
                    </Card>
                    </div>
                  </div>

                  {/* Errors Section */}
                  {validationResponse.errorsCount > 0 && validationResponse.errors && (
                    <Card className="mb-6 border-l-4 border-red-500 shadow-md">
                      <div className="flex items-center gap-2 mb-3">
                        <i className="pi pi-times-circle text-red-600 text-xl"></i>
                        <h5 className="font-semibold text-red-700 text-lg">
                          Validation Errors
                        </h5>
                        <Badge value={validationResponse.errorsCount} severity="danger" />
                      </div>
                      <p className="text-sm text-red-600 mb-4">
                        The following rows contain errors that must be fixed in your Excel file before importing.
                      </p>
                      <DataTable
                        value={validationResponse.errors}
                        size="small"
                        stripedRows
                        className="border border-red-200 rounded-lg overflow-hidden"
                      >
                        <Column field="row" header="Row" style={{ width: '100px' }} className="font-semibold" />
                        <Column field="productName" header="Product Name" />
                        <Column
                          field="errors"
                          header="Error Messages"
                          body={(rowData) => (
                            <ul className="list-inside list-disc space-y-1">
                              {rowData.errors && rowData.errors.map((err, idx) => (
                                <li key={idx} className="text-sm text-red-700">{err}</li>
                              ))}
                            </ul>
                          )}
                        />
                      </DataTable>
                    </Card>
                  )}

                  {/* Warnings Section */}
                  {validationResponse.warningsCount > 0 && validationResponse.warnings && (
                    <Card className="mb-6 border-l-4 border-orange-500 shadow-md">
                      <div className="flex items-center gap-2 mb-3">
                        <i className="pi pi-exclamation-triangle text-orange-600 text-xl"></i>
                        <h5 className="font-semibold text-orange-700 text-lg">
                          Warnings
                        </h5>
                        <Badge value={validationResponse.warningsCount} severity="warning" />
                      </div>
                      <p className="text-sm text-orange-600 mb-4">
                        The following rows have warnings. Review carefully but you can still proceed with import.
                      </p>
                      <DataTable
                        value={validationResponse.warnings}
                        size="small"
                        stripedRows
                        className="border border-orange-200 rounded-lg overflow-hidden"
                      >
                        <Column field="row" header="Row" style={{ width: '100px' }} className="font-semibold" />
                        <Column field="productName" header="Product Name" />
                        <Column
                          field="warnings"
                          header="Warning Messages"
                          body={(rowData) => (
                            <ul className="list-inside list-disc space-y-1">
                              {rowData.warnings && rowData.warnings.map((warn, idx) => (
                                <li key={idx} className="text-sm text-orange-700">{warn}</li>
                              ))}
                            </ul>
                          )}
                        />
                      </DataTable>
                    </Card>
                  )}

                  {/* Duplicate Items Section */}
                  {validationResponse.duplicatesInExcel > 0 && validationResponse.duplicateProducts && (
                    <Card className="mb-6 border-l-4 border-yellow-500 shadow-md">
                      <div className="flex items-center gap-2 mb-3">
                        <i className="pi pi-copy text-yellow-600 text-xl"></i>
                        <h5 className="font-semibold text-yellow-700 text-lg">
                          Duplicate Items in Excel
                        </h5>
                        <Badge value={validationResponse.duplicatesInExcel} severity="warning" />
                      </div>
                      <p className="text-sm text-yellow-700 mb-4">
                        These items appear multiple times in your Excel file. Only the first occurrence will be processed.
                      </p>
                      <DataTable
                        value={validationResponse.duplicateProducts}
                        size="small"
                        stripedRows
                        paginator
                        rows={10}
                        className="border border-yellow-200 rounded-lg overflow-hidden"
                      >
                        <Column field="row" header="Row" style={{ width: '100px' }} className="font-semibold" />
                        <Column field="productName" header="Item Name" />
                        <Column field="masterCategory" header="Master Category" />
                        <Column field="category" header="Category" />
                        <Column field="reason" header="Reason" />
                      </DataTable>
                    </Card>
                  )}

                  {/* New Items Preview */}
                  {validationResponse.newProducts && validationResponse.newProducts.length > 0 && (
                    <Card className="mb-6 border-l-4 border-green-500 shadow-md">
                      <div className="flex items-center gap-2 mb-3">
                        <i className="pi pi-plus-circle text-green-600 text-xl"></i>
                        <h5 className="font-semibold text-green-700 text-lg">
                          New Items to be Added
                        </h5>
                        <Badge value={validationResponse.newProducts.length} severity="success" />
                      </div>
                      <p className="text-sm text-green-700 mb-4">
                        Preview of items that will be imported into your system.
                      </p>
                      <DataTable
                        value={validationResponse.newProducts}
                        size="small"
                        stripedRows
                        paginator
                        rows={10}
                        className="border border-green-200 rounded-lg overflow-hidden"
                      >
                        <Column field="row" header="Row" style={{ width: '80px' }} className="font-semibold" />
                        <Column field="productName" header="Item Name" />
                        <Column field="masterCategory" header="Master Category" />
                        <Column field="category" header="Category" />
                        <Column field="subcategory" header="Subcategory" />
                        <Column field="brand" header="Brand" />
                      </DataTable>
                    </Card>
                  )}

                  {/* Existing Items Preview */}
                  {validationResponse.existingProducts && validationResponse.existingProducts.length > 0 && (
                    <Card className="mb-6 border-l-4 border-orange-500 shadow-md bg-orange-50">
                      <div className="flex items-center gap-2 mb-3">
                        <i className="pi pi-ban text-orange-600 text-xl"></i>
                        <h5 className="font-semibold text-orange-700 text-lg">
                          Existing Items (Will be Skipped)
                        </h5>
                        <Badge value={validationResponse.existingProducts.length} severity="warning" />
                      </div>
                      <p className="mb-4 text-sm text-orange-700">
                        These items already exist in the system and will be skipped during import to prevent duplicates.
                      </p>
                      <DataTable
                        value={validationResponse.existingProducts}
                        size="small"
                        stripedRows
                        paginator
                        rows={10}
                        className="border border-orange-200 rounded-lg overflow-hidden"
                      >
                        <Column field="row" header="Row" style={{ width: '80px' }} className="font-semibold" />
                        <Column field="productName" header="Item Name" />
                        <Column field="masterCategory" header="Master Category" />
                        <Column field="category" header="Category" />
                        <Column field="subcategory" header="Subcategory" />
                        <Column field="brand" header="Brand" />
                        <Column field="existingItemId" header="Item ID" style={{ width: '100px' }} />
                      </DataTable>
                    </Card>
                  )}

                  {/* Back and Submit Buttons */}
                  <div className="mt-6 flex justify-between">
                    <Button
                      label="Back"
                      onClick={handleBack}
                      icon="pi pi-arrow-left"
                      severity="secondary"
                      disabled={loading}
                    />
                    <Button
                      label={loading ? "Importing..." : "Submit & Import"}
                      onClick={handleSubmit}
                      disabled={
                        loading ||
                        !validationResponse.canProceed ||
                        (
                          (validationResponse.newProductsCount ?? 0) === 0 &&
                          (validationResponse.newCategoriesCount ?? 0) === 0 &&
                          (validationResponse.newSubCategoriesCount ?? 0) === 0 &&
                          (validationResponse.newBrandsCount ?? 0) === 0 &&
                          (validationResponse.newMasterCategoriesCount ?? 0) === 0
                        )
                      }
                      icon="pi pi-check"
                      className="border-none bg-green-500 text-white hover:bg-green-600 disabled:bg-gray-400"
                      tooltip={
                        !validationResponse.canProceed
                          ? "Fix validation errors before importing"
                          : (
                              (validationResponse.newProductsCount ?? 0) === 0 &&
                              (validationResponse.newCategoriesCount ?? 0) === 0 &&
                              (validationResponse.newSubCategoriesCount ?? 0) === 0 &&
                              (validationResponse.newBrandsCount ?? 0) === 0 &&
                              (validationResponse.newMasterCategoriesCount ?? 0) === 0
                            )
                          ? "Nothing to import (all rows will be skipped)"
                          : ""
                      }
                      tooltipOptions={{ position: 'top' }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
};

export default ProductExcelUpload;