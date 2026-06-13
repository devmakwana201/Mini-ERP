import { Page } from "components/shared/Page";
import { Toast } from "primereact/toast";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { CompanyService } from "services/subscription-management/companies";
import { PlanService } from "services/subscription-management/plans";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { InputTextarea } from "primereact/inputtextarea";
import { InputNumber } from "primereact/inputnumber";
import { Button } from "primereact/button";
import { Skeleton } from "primereact/skeleton";
import { Divider } from "primereact/divider";
import { Chip } from "primereact/chip";
import PlanExplorer from "components/subscription-management/PlanExplorer";

// Custom styles for animations
const customStyles = `
  @keyframes float {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    50% { transform: translateY(-10px) rotate(5deg); }
  }

  @keyframes float-delayed {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    50% { transform: translateY(-15px) rotate(-5deg); }
  }

  @keyframes float-slow {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-8px); }
  }

  @keyframes bounce-slow {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-5px); }
  }

  @keyframes fade-in-up {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes slide-in-right {
    from {
      opacity: 0;
      transform: translateX(100px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes slide-in-up {
    from {
      opacity: 0;
      transform: translateY(50px) scale(0.9);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .animate-float { animation: float 6s ease-in-out infinite; }
  .animate-float-delayed { animation: float-delayed 8s ease-in-out infinite 1s; }
  .animate-float-slow { animation: float-slow 10s ease-in-out infinite 2s; }
  .animate-bounce-slow { animation: bounce-slow 3s ease-in-out infinite; }
  .animate-fade-in-up { animation: fade-in-up 0.8s ease-out forwards; }
  .animate-slide-in-right { animation: slide-in-right 0.6s ease-out forwards; }
  .animate-slide-in-up { animation: slide-in-up 0.6s ease-out forwards; }

  .delay-100 { animation-delay: 100ms; }
  .delay-200 { animation-delay: 200ms; }
  .delay-300 { animation-delay: 300ms; }

`;

export default function CompanyMaster() {
  const toast = useRef(null);
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [plans, setPlans] = useState([]);

  // Form data
  const [formData, setFormData] = useState({
    companyname: "",
    companyemailid: "",
    companycontactnumber: "",
    planid: null,
    offeredPrice: null,
    offeredAmcCharges: null,
    remarks: "",
  });

  const [formErrors, setFormErrors] = useState({});

  // Plan Explorer Modal
  const [planExplorerVisible, setPlanExplorerVisible] = useState(false);
  const [selectedPlanForPreview, setSelectedPlanForPreview] = useState(null);

  // Load plans for dropdown
  useEffect(() => {
    const loadPlans = async () => {
      try {
        const response = await PlanService.getActivePlans();
        if (response.success) {
          // Load detailed plan information with features for each plan
          const plansWithDetails = await Promise.all(
            response.data.map(async (plan) => {
              try {
                const detailResponse = await PlanService.getPlanById(
                  plan.planid,
                );
                if (detailResponse.success && detailResponse.data) {
                  return {
                    ...plan,
                    ...detailResponse.data, // Merge all fields from detail response
                    details: detailResponse.data.details || [],
                  };
                }
                return plan;
              } catch (error) {
                console.error(
                  `Error loading details for plan ${plan.planid}:`,
                  error,
                );
                return plan;
              }
            }),
          );
          setPlans(plansWithDetails || []);
        }
      } catch (error) {
        console.error("Error loading plans:", error);
      }
    };

    loadPlans();
  }, []);

  // Load company data if editing
  useEffect(() => {
    const loadCompanyData = async () => {
      if (!isEdit) return;

      try {
        setFormLoading(true);
        const response = await CompanyService.getCompanyById(id);

        if (response.success) {
          const company = response.data;
          setFormData({
            companyname: company.companyname || "",
            companyemailid: company.companyemailid || "",
            companycontactnumber: company.companycontactnumber || "",
            planid: company.planid || null,
            offeredPrice: company.planprice || null,
            offeredAmcCharges: company.amc_charges || null,
            remarks: company.remarks || "",
          });
        } else {
          toast.current?.show({
            severity: "error",
            summary: "Error",
            detail: response.message || "Failed to load company data",
            life: 3000,
          });
          navigate("/subscription-management/companies");
        }
      } catch (error) {
        console.error("Error loading company:", error);
        toast.current?.show({
          severity: "error",
          summary: "Error",
          detail: "Failed to load company data",
          life: 3000,
        });
        navigate("/subscription-management/companies");
      } finally {
        setFormLoading(false);
      }
    };

    loadCompanyData();
  }, [id, isEdit, navigate]);

  // Form validation
  const validateForm = () => {
    const errors = {};

    if (!formData.companyname?.trim()) {
      errors.companyname = "Company name is required";
    }

    if (!formData.companyemailid?.trim()) {
      errors.companyemailid = "Email is required";
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.companyemailid)) {
        errors.companyemailid = "Invalid email format";
      }
    }

    if (!formData.companycontactnumber?.trim()) {
      errors.companycontactnumber = "Phone number is required";
    } else {
      const phoneRegex = /^[0-9]{10}$/;
      if (!phoneRegex.test(formData.companycontactnumber)) {
        errors.companycontactnumber =
          "Phone number must be 10 digits and contain only numbers";
      }
    }

    if (!formData.planid) {
      errors.planid = "Plan selection is required";
    }

    if (formData.offeredPrice !== null && formData.offeredPrice < 0) {
      errors.offeredPrice = "Offered price cannot be negative";
    }

    if (formData.offeredAmcCharges !== null && formData.offeredAmcCharges < 0) {
      errors.offeredAmcCharges = "Offered AMC charges cannot be negative";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Plan Explorer Functions
  const openPlanExplorer = () => {
    setPlanExplorerVisible(true);
  };

  const closePlanExplorer = () => {
    setPlanExplorerVisible(false);
    setSelectedPlanForPreview(null);
  };

  const selectPlanFromExplorer = (plan) => {
    handleInputChange("planid", plan.planid);
    closePlanExplorer();
    toast.current?.show({
      severity: "success",
      summary: "Plan Selected",
      detail: `${plan.planname} has been selected`,
      life: 2000,
    });
  };

  const previewPlan = (plan) => {
    setSelectedPlanForPreview(plan);
  };

  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setLoading(true);

      let response;
      if (isEdit) {
        // Update existing company
        response = await CompanyService.updateCompany(id, formData);
      } else {
        // Register new company
        response = await CompanyService.registerCompany(formData);
      }

      if (response.success) {
        toast.current?.show({
          severity: "success",
          summary: "Success",
          detail:
            response?.message ||
            `Company ${isEdit ? "updated" : "registered"} successfully`,
          life: 3000,
        });

        // Navigate back to list after a short delay
        setTimeout(() => {
          navigate("/subscription-management/companies");
        }, 1000);
      } else {
        toast.current?.show({
          severity: "error",
          summary: "Error",
          detail:
            response.error?.details?.[0]?.message ||
            response.message ||
            `Failed to ${isEdit ? "update" : "register"} company`,
          life: 3000,
        });
      }
    } catch (error) {
      console.error(
        `Error ${isEdit ? "updating" : "registering"} company:`,
        error,
      );
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail:
          error.error?.message ||
          error.message ||
          `Failed to ${isEdit ? "update" : "register"} company`,
        life: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle input changes
  const handleInputChange = (field, value) => {
    // Auto-fill price when plan is selected
    if (field === "planid" && value) {
      const selectedPlan = plans.find((plan) => plan.planid === value);

      if (selectedPlan) {
        setFormData((prev) => ({
          ...prev,
          [field]: value,
          offeredPrice: selectedPlan.price,
          offeredAmcCharges: selectedPlan.amc_charges || 0,
        }));
      } else {
        // If no plan found, just update the field
        setFormData((prev) => ({
          ...prev,
          [field]: value,
        }));
      }
    } else {
      // For all other fields, just update normally
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
    }

    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors((prev) => ({
        ...prev,
        [field]: null,
      }));
    }
  };

  return (
    <Page title={isEdit ? "Edit Company" : "Add Company"}>
      <style>{customStyles}</style>
      <Toast ref={toast} />
      <div className="w-full px-(--margin-x) pt-5 lg:pt-6">
        <div className="grid grid-cols-12 gap-4 sm:gap-5 lg:gap-6">
          <div className="col-span-12">
            <div className="prime-card">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  {isEdit ? "Edit Company" : "Company Registration"}
                </h3>
                <Button
                  label="Back"
                  icon="pi pi-arrow-left"
                  className="p-button-sm"
                  severity="secondary"
                  onClick={() => navigate("/subscription-management/companies")}
                  disabled={loading}
                />
              </div>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Company Basic Information */}
                <div>
                  <h4 className="mb-4 text-base font-semibold text-gray-700">
                    Company Information
                  </h4>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {/* Company Name */}
                    <div className="input-root">
                      {formLoading ? (
                        <>
                          <Skeleton
                            width="40%"
                            height="1.25rem"
                            className="mb-2"
                          />
                          <Skeleton width="100%" height="2.5rem" />
                        </>
                      ) : (
                        <>
                          <label
                            htmlFor="companyname"
                            className="label-default text-base font-semibold"
                          >
                            Company Name <span className="text-red-600">*</span>
                          </label>
                          <InputText
                            id="companyname"
                            value={formData.companyname}
                            onChange={(e) =>
                              handleInputChange("companyname", e.target.value)
                            }
                            placeholder="Enter Company Name"
                            className={
                              formErrors.companyname ? "p-invalid" : ""
                            }
                            disabled={loading}
                          />
                          {formErrors.companyname && (
                            <small className="p-error">
                              {formErrors.companyname}
                            </small>
                          )}
                        </>
                      )}
                    </div>

                    {/* Email */}
                    <div className="input-root">
                      {formLoading ? (
                        <>
                          <Skeleton
                            width="40%"
                            height="1.25rem"
                            className="mb-2"
                          />
                          <Skeleton width="100%" height="2.5rem" />
                        </>
                      ) : (
                        <>
                          <label
                            htmlFor="companyemailid"
                            className="label-default text-base font-semibold"
                          >
                            Email Address{" "}
                            <span className="text-red-600">*</span>
                          </label>
                          <InputText
                            id="companyemailid"
                            value={formData.companyemailid}
                            onChange={(e) =>
                              handleInputChange(
                                "companyemailid",
                                e.target.value,
                              )
                            }
                            placeholder="Enter Email Address"
                            className={
                              formErrors.companyemailid ? "p-invalid" : ""
                            }
                            disabled={loading}
                          />
                          {formErrors.companyemailid && (
                            <small className="p-error">
                              {formErrors.companyemailid}
                            </small>
                          )}
                        </>
                      )}
                    </div>

                    {/* Phone Number */}
                    <div className="input-root">
                      {formLoading ? (
                        <>
                          <Skeleton
                            width="40%"
                            height="1.25rem"
                            className="mb-2"
                          />
                          <Skeleton width="100%" height="2.5rem" />
                        </>
                      ) : (
                        <>
                          <label
                            htmlFor="companycontactnumber"
                            className="label-default text-base font-semibold"
                          >
                            Phone Number <span className="text-red-600">*</span>
                          </label>
                          <InputText
                            id="companycontactnumber"
                            value={formData.companycontactnumber}
                            onChange={(e) =>
                              handleInputChange(
                                "companycontactnumber",
                                e.target.value,
                              )
                            }
                            placeholder="Enter Phone Number"
                            className={
                              formErrors.companycontactnumber ? "p-invalid" : ""
                            }
                            disabled={loading}
                          />
                          {formErrors.companycontactnumber && (
                            <small className="p-error">
                              {formErrors.companycontactnumber}
                            </small>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <Divider />

                {/* Plan Information */}
                <div>
                  <h4 className="mb-4 text-base font-semibold text-gray-700">
                    Plan Information
                  </h4>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {/* Plan Selection */}
                    <div className="input-root">
                      {formLoading ? (
                        <>
                          <Skeleton
                            width="40%"
                            height="1.25rem"
                            className="mb-2"
                          />
                          <Skeleton width="100%" height="2.5rem" />
                        </>
                      ) : (
                        <>
                          <label
                            htmlFor="planid"
                            className="label-default text-base font-semibold"
                          >
                            Select Plan <span className="text-red-600">*</span>
                          </label>
                          <div className="flex gap-2">
                            <Dropdown
                              id="planid"
                              value={formData.planid}
                              onChange={(e) =>
                                handleInputChange("planid", e.value)
                              }
                              options={plans}
                              optionLabel="planname"
                              optionValue="planid"
                              placeholder="Select a Plan"
                              className={`flex-1 ${formErrors.planid ? "p-invalid" : ""}`}
                              disabled={loading}
                              filter
                              showClear
                            />
                            <Button
                              type="button"
                              icon="pi pi-search-plus"
                              label="Explore Plans"
                              className="transform rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-2 font-medium text-white shadow-lg transition-all duration-200 hover:scale-105 hover:from-green-600 hover:to-emerald-700 hover:shadow-xl"
                              onClick={openPlanExplorer}
                              disabled={loading}
                              size="small"
                            />
                          </div>
                          {formErrors.planid && (
                            <small className="p-error">
                              {formErrors.planid}
                            </small>
                          )}
                        </>
                      )}
                    </div>

                    {/* Offered Price */}
                    <div className="input-root">
                      {formLoading ? (
                        <>
                          <Skeleton
                            width="40%"
                            height="1.25rem"
                            className="mb-2"
                          />
                          <Skeleton width="100%" height="2.5rem" />
                        </>
                      ) : (
                        <>
                          <label
                            htmlFor="offeredPrice"
                            className="label-default text-base font-semibold"
                          >
                            Offered Price (₹)
                          </label>
                          <InputNumber
                            id="offeredPrice"
                            value={formData.offeredPrice}
                            onValueChange={(e) =>
                              handleInputChange("offeredPrice", e.value)
                            }
                            placeholder="Enter Offered Price in Rupees"
                            className={
                              formErrors.offeredPrice ? "p-invalid" : ""
                            }
                            disabled={loading}
                            mode="decimal"
                            minFractionDigits={2}
                            maxFractionDigits={2}
                            min={0}
                          />
                          {formErrors.offeredPrice && (
                            <small className="p-error">
                              {formErrors.offeredPrice}
                            </small>
                          )}
                        </>
                      )}
                    </div>

                    {/* Offered AMC Charges */}
                    <div className="input-root">
                      {formLoading ? (
                        <>
                          <Skeleton
                            width="40%"
                            height="1.25rem"
                            className="mb-2"
                          />
                          <Skeleton width="100%" height="2.5rem" />
                        </>
                      ) : (
                        <>
                          <label
                            htmlFor="offeredAmcCharges"
                            className="label-default text-base font-semibold"
                          >
                            Offered AMC Charges (₹)
                          </label>
                          <InputNumber
                            id="offeredAmcCharges"
                            value={formData.offeredAmcCharges}
                            onValueChange={(e) =>
                              handleInputChange("offeredAmcCharges", e.value)
                            }
                            placeholder="Enter AMC Charges in Rupees"
                            className={
                              formErrors.offeredAmcCharges ? "p-invalid" : ""
                            }
                            disabled={loading}
                            mode="decimal"
                            minFractionDigits={2}
                            maxFractionDigits={2}
                            min={0}
                          />
                          {formErrors.offeredAmcCharges && (
                            <small className="p-error">
                              {formErrors.offeredAmcCharges}
                            </small>
                          )}
                        </>
                      )}
                    </div>

                    {/* Remarks */}
                    <div className="input-root">
                      {formLoading ? (
                        <>
                          <Skeleton
                            width="40%"
                            height="1.25rem"
                            className="mb-2"
                          />
                          <Skeleton width="100%" height="2.5rem" />
                        </>
                      ) : (
                        <>
                          <label
                            htmlFor="remarks"
                            className="label-default text-base font-semibold"
                          >
                            Remarks
                          </label>
                          <InputTextarea
                            id="remarks"
                            value={formData.remarks}
                            onChange={(e) =>
                              handleInputChange("remarks", e.target.value)
                            }
                            placeholder="Enter Remarks"
                            rows={2}
                            disabled={loading}
                          />
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <Divider />

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    label="Cancel"
                    icon="pi pi-times"
                    outlined
                    onClick={() =>
                      navigate("/subscription-management/companies")
                    }
                    disabled={loading}
                  />
                  <Button
                    label={
                      loading
                        ? isEdit
                          ? "Updating..."
                          : "Registering..."
                        : isEdit
                          ? "Update Company"
                          : "Register Company"
                    }
                    icon={loading ? "pi pi-spin pi-spinner" : "pi pi-check"}
                    type="submit"
                    disabled={loading || formLoading}
                  />
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Plan Explorer Modal */}
      <PlanExplorer
        visible={planExplorerVisible}
        onHide={closePlanExplorer}
        plans={plans}
        selectedPlan={selectedPlanForPreview}
        onSelectPlan={selectPlanFromExplorer}
        onPreviewPlan={setSelectedPlanForPreview}
        toast={toast}
      />
    </Page>
  );
}
