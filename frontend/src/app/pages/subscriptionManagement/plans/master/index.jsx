import { Page } from "components/shared/Page";
import { Toast } from "primereact/toast";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { PlanService } from "services/subscription-management/plans";
import { ParticularService } from "services/subscription-management/particulars";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { InputNumber } from "primereact/inputnumber";
import { Button } from "primereact/button";
import { Skeleton } from "primereact/skeleton";
import { Divider } from "primereact/divider";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { MultiSelect } from "primereact/multiselect";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { Calendar } from "primereact/calendar";
import { InputSwitch } from "primereact/inputswitch";

export default function PlanMaster() {
  const toast = useRef(null);
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [particulars, setParticulars] = useState([]);

  // Form data
  const [formData, setFormData] = useState({
    planname: "",
    description: "",
    price: null,
    amc_charges: null,
    duration: null,
    frequency: "",
    is_trial: 0,
    startdate: null,
    enddate: null,
    isactive: 1,
  });

  const [planDetails, setPlanDetails] = useState([]);

  const frequencyOptions = [
    { label: 'Yearly', value: 'Yearly' },
    { label: 'Half-yearly', value: 'Half-yearly' },
    { label: 'Monthly', value: 'Monthly' },
    { label: 'Bi-weekly', value: 'Bi-weekly' },
    { label: 'Weekly', value: 'Weekly' }
  ];
  const [formErrors, setFormErrors] = useState({});

  // Plan Details Dialog
  const [planDetailDialog, setPlanDetailDialog] = useState(false);
  const [editingDetail, setEditingDetail] = useState(null);
  const [detailFormData, setDetailFormData] = useState({
    particularid: null,
    limitation: "",
    description: "",
  });
  const [detailFormErrors, setDetailFormErrors] = useState({});

  // Load particulars for dropdown
  useEffect(() => {
    const loadParticulars = async () => {
      try {
        const response = await ParticularService.getActiveParticulars();
        if (response.success) {
          setParticulars(response.data || []);
        }
      } catch (error) {
        console.error("Error loading particulars:", error);
      }
    };

    loadParticulars();
  }, []);

  // Load plan data if editing
  useEffect(() => {
    const loadPlanData = async () => {
      if (!isEdit) return;

      try {
        setFormLoading(true);
        const response = await PlanService.getPlanById(id);

        if (response.success) {
          const plan = response.data;
          setFormData({
            planname: plan.planname || "",
            description: plan.description || "",
            price: plan.price || null,
            amc_charges: plan.amc_charges || null,
            duration: plan.duration || null,
            frequency: plan.frequency || "",
            is_trial: plan.is_trial || 0,
            startdate: plan.startdate ? new Date(plan.startdate) : null,
            enddate: plan.enddate ? new Date(plan.enddate) : null,
            isactive: plan.isactive ?? 1,
          });
          setPlanDetails((plan.details || []).map(detail => ({
            ...detail,
            description: detail.description || ""
          })));
        } else {
          toast.current?.show({
            severity: "error",
            summary: "Error",
            detail: response.message || "Failed to load plan data",
            life: 3000,
          });
          navigate("/subscription-management/plans");
        }
      } catch (error) {
        console.error("Error loading plan:", error);
        toast.current?.show({
          severity: "error",
          summary: "Error",
          detail: "Failed to load plan data",
          life: 3000,
        });
        navigate("/subscription-management/plans");
      } finally {
        setFormLoading(false);
      }
    };

    loadPlanData();
  }, [id, isEdit, navigate]);

  // Form validation
  const validateForm = () => {
    const errors = {};

    if (!formData.planname?.trim()) {
      errors.planname = "Plan name is required";
    }

    if (!formData.price || formData.price <= 0) {
      errors.price = "Price must be greater than 0";
    }

    if (!formData.amc_charges || formData.amc_charges < 0) {
      errors.amc_charges = "AMC charges cannot be negative";
    }

    if (!formData.duration || formData.duration <= 0) {
      errors.duration = "Duration must be greater than 0";
    }

    if (!formData.frequency?.trim()) {
      errors.frequency = "Frequency is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Detail form validation
  const validateDetailForm = () => {
    const errors = {};

    if (!detailFormData.particularid) {
      errors.particularid = "Particular is required";
    } else {
      // Check if particular already exists (except when editing)
      const existingDetail = planDetails.find(detail =>
        detail.particularid === detailFormData.particularid &&
        (!editingDetail || detail.particularid !== editingDetail.particularid)
      );
      if (existingDetail) {
        errors.particularid = "This particular is already added";
      }
    }

    if (!detailFormData.limitation?.trim()) {
      errors.limitation = "Limitation is required";
    }

    // Description is optional - no validation needed

    setDetailFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    // Prepare data for API
    const planData = {
      ...formData,
      details: planDetails.map(detail => ({
        particularid: detail.particularid,
        limitation: detail.limitation,
        description: detail.description && detail.description.trim() ? detail.description.trim() : ""
      }))
    };

    try {
      setLoading(true);

      let response;
      if (isEdit) {
        response = await PlanService.updatePlan(id, planData);
      } else {
        response = await PlanService.createPlan(planData);
      }

      if (response.success) {
        toast.current?.show({
          severity: "success",
          summary: "Success",
          detail: response?.message || `Plan ${isEdit ? "updated" : "created"} successfully`,
          life: 3000,
        });

        setTimeout(() => {
          navigate("/subscription-management/plans");
        }, 1000);
      } else {
        toast.current?.show({
          severity: "error",
          summary: "Error",
          detail:
            response.error?.details?.[0]?.message ||
            response.message ||
            `Failed to ${isEdit ? "update" : "create"} plan`,
          life: 3000,
        });
      }
    } catch (error) {
      console.error(`Error ${isEdit ? "updating" : "creating"} plan:`, error);
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail:
          error.error?.message ||
          error.message ||
          `Failed to ${isEdit ? "update" : "create"} plan`,
        life: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  // Auto-calculate duration based on frequency
  const getDurationByFrequency = useCallback((frequency) => {
    if (!frequency) return null;

    switch (frequency.toLowerCase()) {
      case 'yearly':
        return 365;
      case 'half-yearly':
        return 183; // Approximately 6 months
      case 'monthly':
        return 30;
      case 'bi-weekly':
        return 14;
      case 'weekly':
        return 7;
      default:
        return null;
    }
  }, []);

  // Handle input changes
  const handleInputChange = (field, value) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        [field]: value
      };

      // Auto-fill duration when frequency changes
      if (field === 'frequency') {
        const autoDuration = getDurationByFrequency(value);
        if (autoDuration) {
          newData.duration = autoDuration;
        }
      }

      return newData;
    });

    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  // Plan Details functions
  const openAddDetailDialog = () => {
    setEditingDetail(null);
    setDetailFormData({
      particularid: null,
      limitation: "",
      description: "",
    });
    setDetailFormErrors({});
    setPlanDetailDialog(true);
  };

  const openEditDetailDialog = (detail) => {
    setEditingDetail(detail);
    setDetailFormData({
      particularid: detail.particularid,
      limitation: detail.limitation,
      description: detail.description,
    });
    setDetailFormErrors({});
    setPlanDetailDialog(true);
  };

  const hideDetailDialog = () => {
    setPlanDetailDialog(false);
    setEditingDetail(null);
    setDetailFormData({
      particularid: null,
      limitation: "",
      description: "",
    });
    setDetailFormErrors({});
  };

  const saveDetail = () => {
    if (!validateDetailForm()) return;

    const particular = particulars.find(p => p.particularid === detailFormData.particularid);

    if (editingDetail) {
      // Update existing detail
      setPlanDetails(prev =>
        prev.map(detail =>
          detail.particularid === editingDetail.particularid
            ? {
                ...detail,
                particularid: detailFormData.particularid,
                limitation: detailFormData.limitation,
                description: detailFormData.description && detailFormData.description.trim() ? detailFormData.description.trim() : "",
                particularname: particular?.name
              }
            : detail
        )
      );
    } else {
      // Add new detail
      const newDetail = {
        particularid: detailFormData.particularid,
        limitation: detailFormData.limitation,
        description: detailFormData.description && detailFormData.description.trim() ? detailFormData.description.trim() : "",
        particularname: particular?.name
      };
      setPlanDetails(prev => [...prev, newDetail]);
    }

    hideDetailDialog();
  };

  const deleteDetail = (particularid) => {
    setPlanDetails(prev => prev.filter(detail => detail.particularid !== particularid));
  };

  const detailDialogFooter = (
    <div className="flex justify-end gap-2">
      <Button
        label="Cancel"
        icon="pi pi-times"
        outlined
        onClick={hideDetailDialog}
      />
      <Button
        label={editingDetail ? "Update" : "Add"}
        icon="pi pi-check"
        onClick={saveDetail}
      />
    </div>
  );

  const particularBodyTemplate = (rowData) => (
    <span>{rowData.particularname}</span>
  );

  const limitationBodyTemplate = (rowData) => (
    <span>{rowData.limitation}</span>
  );

  const descriptionBodyTemplate = (rowData) => (
    <span>{rowData.description}</span>
  );

  const actionsBodyTemplate = (rowData) => (
    <div className="flex gap-2">
      <Button
        icon="pi pi-pencil"
        rounded
        outlined
        size="small"
        type="button"
        onClick={() => openEditDetailDialog(rowData)}
      />
      <Button
        icon="pi pi-trash"
        rounded
        outlined
        severity="danger"
        size="small"
        type="button"
        onClick={() => deleteDetail(rowData.particularid)}
      />
    </div>
  );

  return (
    <Page title={isEdit ? "Edit Plan" : "Add Plan"}>
      <Toast ref={toast} />
      <div className="w-full px-(--margin-x) pt-5 lg:pt-6">
        <div className="grid grid-cols-12 gap-4 sm:gap-5 lg:gap-6">
          <div className="col-span-12">
            <div className="prime-card">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  {isEdit ? "Edit Plan" : "Create New Plan"}
                </h3>
                <Button
                  label="Back"
                  icon="pi pi-arrow-left"
                  className="p-button-sm"
                  severity="secondary"
                  onClick={() => navigate("/subscription-management/plans")}
                  disabled={loading}
                />
              </div>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Plan Basic Information */}
                <div>
                  <h4 className="text-base font-semibold mb-4 text-gray-700">
                    Plan Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Plan Name */}
                    <div className="input-root">
                      {formLoading ? (
                        <>
                          <Skeleton width="40%" height="1.25rem" className="mb-2" />
                          <Skeleton width="100%" height="2.5rem" />
                        </>
                      ) : (
                        <>
                          <label htmlFor="planname" className="label-default text-base font-semibold">
                            Plan Name <span className="text-red-600">*</span>
                          </label>
                          <InputText
                            id="planname"
                            value={formData.planname}
                            onChange={(e) => handleInputChange('planname', e.target.value)}
                            placeholder="Enter Plan Name"
                            className={formErrors.planname ? "p-invalid" : ""}
                            disabled={loading}
                          />
                          {formErrors.planname && (
                            <small className="p-error">{formErrors.planname}</small>
                          )}
                        </>
                      )}
                    </div>

                    {/* Description */}
                    <div className="input-root">
                      {formLoading ? (
                        <>
                          <Skeleton width="40%" height="1.25rem" className="mb-2" />
                          <Skeleton width="100%" height="2.5rem" />
                        </>
                      ) : (
                        <>
                          <label htmlFor="description" className="label-default text-base font-semibold">
                            Description
                          </label>
                          <InputTextarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => handleInputChange('description', e.target.value)}
                            placeholder="Enter Plan Description"
                            rows={2}
                            disabled={loading}
                          />
                        </>
                      )}
                    </div>

                    {/* Price */}
                    <div className="input-root">
                      {formLoading ? (
                        <>
                          <Skeleton width="40%" height="1.25rem" className="mb-2" />
                          <Skeleton width="100%" height="2.5rem" />
                        </>
                      ) : (
                        <>
                          <label htmlFor="price" className="label-default text-base font-semibold">
                            Price (₹) <span className="text-red-600">*</span>
                          </label>
                          <InputNumber
                            id="price"
                            value={formData.price}
                            onValueChange={(e) => handleInputChange('price', e.value)}
                            placeholder="Enter Price in Rupees"
                            className={formErrors.price ? "p-invalid" : ""}
                            disabled={loading}
                            mode="decimal"
                            minFractionDigits={2}
                            maxFractionDigits={2}
                            min={0}
                          />
                          {formErrors.price && (
                            <small className="p-error">{formErrors.price}</small>
                          )}
                        </>
                      )}
                    </div>

                    {/* AMC Charges */}
                    <div className="input-root">
                      {formLoading ? (
                        <>
                          <Skeleton width="40%" height="1.25rem" className="mb-2" />
                          <Skeleton width="100%" height="2.5rem" />
                        </>
                      ) : (
                        <>
                          <label htmlFor="amc_charges" className="label-default text-base font-semibold">
                            AMC Charges (₹) <span className="text-red-600">*</span>
                          </label>
                          <InputNumber
                            id="amc_charges"
                            value={formData.amc_charges}
                            onValueChange={(e) => handleInputChange('amc_charges', e.value)}
                            placeholder="Enter AMC Charges in Rupees"
                            className={formErrors.amc_charges ? "p-invalid" : ""}
                            disabled={loading}
                            mode="decimal"
                            minFractionDigits={2}
                            maxFractionDigits={2}
                            min={0}
                          />
                          {formErrors.amc_charges && (
                            <small className="p-error">{formErrors.amc_charges}</small>
                          )}
                        </>
                      )}
                    </div>

                    {/* Frequency */}
                    <div className="input-root">
                      {formLoading ? (
                        <>
                          <Skeleton width="40%" height="1.25rem" className="mb-2" />
                          <Skeleton width="100%" height="2.5rem" />
                        </>
                      ) : (
                        <>
                          <label htmlFor="frequency" className="label-default text-base font-semibold">
                            Frequency <span className="text-red-600">*</span>
                          </label>
                          <Dropdown
                            id="frequency"
                            value={formData.frequency}
                            onChange={(e) => handleInputChange('frequency', e.value)}
                            options={frequencyOptions}
                            optionLabel="label"
                            optionValue="value"
                            placeholder="Select Frequency"
                            className={formErrors.frequency ? "p-invalid" : ""}
                            disabled={loading}
                          />
                          {formErrors.frequency && (
                            <small className="p-error">{formErrors.frequency}</small>
                          )}
                        </>
                      )}
                    </div>

                    {/* Duration */}
                    <div className="input-root">
                      {formLoading ? (
                        <>
                          <Skeleton width="40%" height="1.25rem" className="mb-2" />
                          <Skeleton width="100%" height="2.5rem" />
                        </>
                      ) : (
                        <>
                          <label htmlFor="duration" className="label-default text-base font-semibold">
                            Duration (Days) <span className="text-red-600">*</span>
                          </label>
                          <InputNumber
                            id="duration"
                            value={formData.duration}
                            onValueChange={(e) => handleInputChange('duration', e.value)}
                            placeholder="Auto-filled based on frequency"
                            className={formErrors.duration ? "p-invalid" : ""}
                            disabled={loading}
                            min={1}
                          />
                          {formErrors.duration && (
                            <small className="p-error">{formErrors.duration}</small>
                          )}
                        </>
                      )}
                    </div>

                    {/* Start Date */}
                    <div className="input-root">
                      {formLoading ? (
                        <>
                          <Skeleton width="40%" height="1.25rem" className="mb-2" />
                          <Skeleton width="100%" height="2.5rem" />
                        </>
                      ) : (
                        <>
                          <label htmlFor="startdate" className="label-default text-base font-semibold">
                            Start Date
                          </label>
                          <Calendar
                            id="startdate"
                            value={formData.startdate}
                            onChange={(e) => handleInputChange('startdate', e.value)}
                            placeholder="Select Start Date"
                            dateFormat="dd/mm/yy"
                            disabled={loading}
                            showIcon
                          />
                        </>
                      )}
                    </div>

                    {/* End Date */}
                    <div className="input-root">
                      {formLoading ? (
                        <>
                          <Skeleton width="40%" height="1.25rem" className="mb-2" />
                          <Skeleton width="100%" height="2.5rem" />
                        </>
                      ) : (
                        <>
                          <label htmlFor="enddate" className="label-default text-base font-semibold">
                            End Date
                          </label>
                          <Calendar
                            id="enddate"
                            value={formData.enddate}
                            onChange={(e) => handleInputChange('enddate', e.value)}
                            placeholder="Select End Date"
                            dateFormat="dd/mm/yy"
                            disabled={loading}
                            showIcon
                            minDate={formData.startdate}
                          />
                        </>
                      )}
                    </div>
                  </div>

                  {/* Second row for Trial Plan Switch and Active/Inactive Switch */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {/* Is Trial */}
                    <div className="input-root">
                      {formLoading ? (
                        <>
                          <Skeleton width="40%" height="1.25rem" className="mb-2" />
                          <Skeleton width="100%" height="2.5rem" />
                        </>
                      ) : (
                        <>
                          <label htmlFor="is_trial" className="label-default text-base font-semibold">
                            Is Trial Plan
                          </label>
                          <InputSwitch
                            id="is_trial"
                            checked={formData.is_trial === 1}
                            onChange={(e) => handleInputChange('is_trial', e.value ? 1 : 0)}
                            disabled={loading}
                          />
                        </>
                      )}
                    </div>

                    {/* Is Active */}
                    <div className="input-root">
                      {formLoading ? (
                        <>
                          <Skeleton width="40%" height="1.25rem" className="mb-2" />
                          <Skeleton width="100%" height="2.5rem" />
                        </>
                      ) : (
                        <>
                          <label htmlFor="isactive" className="label-default text-base font-semibold">
                            Status
                          </label>
                          <InputSwitch
                            id="isactive"
                            checked={formData.isactive === 1}
                            onChange={(e) => handleInputChange('isactive', e.value ? 1 : 0)}
                            disabled={loading}
                          />
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <Divider />

                {/* Plan Features */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-base font-semibold text-gray-700">
                      Plan Features
                    </h4>
                    <Button
                      label="Add Feature"
                      icon="pi pi-plus"
                      size="small"
                      type="button"
                      onClick={openAddDetailDialog}
                      disabled={loading || formLoading}
                    />
                  </div>

                  <DataTable
                    value={planDetails}
                    emptyMessage="No features added yet. Click 'Add Feature' to get started."
                    className="overflow-hidden rounded-lg border border-gray-300"
                    paginator
                    rows={5}
                    paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport"
                    currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries"
                    rowsPerPageOptions={[5, 10, 15]}
                  >
                    <Column
                      header="Sr No."
                      body={(rowData, options) => options.rowIndex + 1}
                      style={{ width: "5rem" }}
                    />
                    <Column
                      field="particularname"
                      header="Feature"
                      body={particularBodyTemplate}
                      style={{ minWidth: "15rem" }}
                    />
                    <Column
                      field="limitation"
                      header="Limitation"
                      body={limitationBodyTemplate}
                      style={{ minWidth: "10rem" }}
                    />
                    <Column
                      field="description"
                      header="Description"
                      body={descriptionBodyTemplate}
                      style={{ minWidth: "15rem" }}
                    />
                    <Column
                      header="Actions"
                      body={actionsBodyTemplate}
                      style={{ width: "8rem" }}
                    />
                  </DataTable>
                </div>

                <Divider />

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    label="Cancel"
                    icon="pi pi-times"
                    outlined
                    onClick={() => navigate("/subscription-management/plans")}
                    disabled={loading}
                  />
                  <Button
                    label={
                      loading
                        ? isEdit
                          ? "Updating..."
                          : "Creating..."
                        : isEdit
                          ? "Update Plan"
                          : "Create Plan"
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

      {/* Plan Detail Dialog */}
      <Dialog
        visible={planDetailDialog}
        style={{ width: "32rem" }}
        breakpoints={{ "960px": "75vw", "641px": "90vw" }}
        header={editingDetail ? "Edit Feature" : "Add Feature"}
        modal
        footer={detailDialogFooter}
        onHide={hideDetailDialog}
        blockScroll={true}
        draggable={false}
        resizable={false}
        dismissableMask
      >
        <div className="space-y-4">
          {/* Particular Selection */}
          <div className="input-root">
            <label htmlFor="particularid" className="label-default text-base font-semibold">
              Feature <span className="text-red-600">*</span>
            </label>
            <Dropdown
              id="particularid"
              value={detailFormData.particularid}
              onChange={(e) => setDetailFormData(prev => ({ ...prev, particularid: e.value }))}
              options={particulars}
              optionLabel="name"
              optionValue="particularid"
              placeholder="Select a Feature"
              className={detailFormErrors.particularid ? "p-invalid" : ""}
              filter
            />
            {detailFormErrors.particularid && (
              <small className="p-error">{detailFormErrors.particularid}</small>
            )}
          </div>

          {/* Limitation */}
          <div className="input-root">
            <label htmlFor="limitation" className="label-default text-base font-semibold">
              Limitation <span className="text-red-600">*</span>
            </label>
            <InputText
              id="limitation"
              value={detailFormData.limitation}
              onChange={(e) => setDetailFormData(prev => ({ ...prev, limitation: e.target.value }))}
              placeholder="Enter limitation (e.g., 100 users, 5GB storage)"
              className={detailFormErrors.limitation ? "p-invalid" : ""}
            />
            {detailFormErrors.limitation && (
              <small className="p-error">{detailFormErrors.limitation}</small>
            )}
          </div>

          {/* Description */}
          <div className="input-root">
            <label htmlFor="description" className="label-default text-base font-semibold">
              Description
            </label>
            <InputTextarea
              id="description"
              value={detailFormData.description}
              onChange={(e) => setDetailFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter detailed description of this feature"
              className={detailFormErrors.description ? "p-invalid" : ""}
              rows={3}
            />
            {detailFormErrors.description && (
              <small className="p-error">{detailFormErrors.description}</small>
            )}
          </div>
        </div>
      </Dialog>
    </Page>
  );
}