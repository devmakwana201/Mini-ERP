import { Dialog } from "primereact/dialog";
import { Badge } from "primereact/badge";
import { Button } from "primereact/button";
import Logo from "assets/appLogo2.svg?react";

// Plan Explorer Dialog Styles
const planExplorerStyles = `
  /* Dialog close button styling */
  .plan-explorer-dialog .p-dialog-header { border-radius: 20px 20px 0 0 !important; padding: 0 !important; }
  .plan-explorer-dialog .p-dialog-content { border-radius: 0 0 20px 20px !important; padding: 0 !important; }

  /* Realistic ribbon corner badge */
  .ribbon-wrapper {
    position: absolute;
    top: -2px;
    right: -2px;
    width: 80px;
    height: 80px;
    overflow: hidden;
    z-index: 20;
  }

  .ribbon {
    position: absolute;
    top: 16px;
    right: -24px;
    width: 120px;
    padding: 4px 0;
    background: linear-gradient(135deg, #dc2626 0%, #b91c1c 50%, #991b1b 100%);
    color: white;
    text-align: center;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    transform: rotate(45deg);
    box-shadow:
      0 2px 4px rgba(0,0,0,0.15),
      0 4px 8px rgba(0,0,0,0.1),
      inset 0 1px 0 rgba(255,255,255,0.2),
      inset 0 -1px 0 rgba(0,0,0,0.2);
    border: 1px solid rgba(0,0,0,0.1);
  }

  .ribbon:before,
  .ribbon:after {
    content: '';
    position: absolute;
    top: 100%;
    width: 0;
    height: 0;
    border-style: solid;
  }

  .ribbon:before {
    left: 0;
    border-width: 0 0 8px 8px;
    border-color: transparent transparent #991b1b transparent;
  }

  .ribbon:after {
    right: 0;
    border-width: 0 8px 8px 0;
    border-color: transparent transparent #991b1b transparent;
  }

  .plan-explorer-dialog .p-dialog-header-close {
    background: transparent !important;
    border: none !important;
    color: white !important;
    border-radius: 50% !important;
    width: 28px !important;
    height: 28px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    transition: all 0.2s ease !important;
    margin-top: 6px !important;
    margin-right: 8px !important;
    opacity: 0.8 !important;
  }

  .plan-explorer-dialog .p-dialog-header-close:hover {
    background: rgba(255, 255, 255, 0.15) !important;
    opacity: 1 !important;
    transform: scale(1.1) !important;
  }

  .plan-explorer-dialog .p-dialog-header-close .p-dialog-header-close-icon {
    width: 14px !important;
    height: 14px !important;
  }

  .custom-scrollbar::-webkit-scrollbar { width: 6px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 10px; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: linear-gradient(to bottom, #10b981, #059669); border-radius: 10px; }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: linear-gradient(to bottom, #059669, #047857); }
`;

const PlanExplorer = ({
  visible,
  onHide,
  plans,
  selectedPlan,
  onSelectPlan,
  onPreviewPlan,
  toast
}) => {
  return (
    <>
      <style>{planExplorerStyles}</style>
      <Dialog
        header={
          <div className="flex items-center gap-3 px-6 py-4">
            <div className="p-2 bg-white bg-opacity-20 rounded-lg">
              <Logo className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-1 text-white">Explore Plans</h3>
              <p className="text-emerald-100 text-sm">Choose the perfect plan for your business</p>
            </div>
          </div>
        }
        visible={visible}
        style={{ width: '85vw', maxWidth: '800px' }}
        breakpoints={{ "960px": "90vw", "641px": "95vw" }}
        onHide={onHide}
        modal
        blockScroll={true}
        draggable={false}
        resizable={false}
        dismissableMask
        className="plan-explorer-dialog"
        headerStyle={{
          background: 'linear-gradient(to right, #059669, #16a34a, #0d9488)',
          border: 'none',
          borderRadius: '8px 8px 0 0',
          padding: '0'
        }}
      >
        <div className="bg-gray-50 min-h-[50vh] p-4">
          {selectedPlan ? (
            /* Plan Details View */
            <div className="space-y-4">
              {/* Navigation Bar */}
              <div className="flex items-center justify-between bg-white rounded-lg p-2 shadow-sm border border-gray-200">
                <Button
                  type="button"
                  icon="pi pi-arrow-left"
                  label="Back to Plans"
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium shadow-sm hover:shadow-md transition-all duration-200 border-0"
                  onClick={() => onPreviewPlan(null)}
                  size="small"
                />
                <Button
                  type="button"
                  label="Select This Plan"
                  icon="pi pi-check"
                  className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-medium shadow-md hover:shadow-lg transition-all duration-200 border-0"
                  onClick={() => {
                    onSelectPlan(selectedPlan);
                    toast.current?.show({
                      severity: "success",
                      summary: "Plan Selected",
                      detail: `${selectedPlan.planname} has been selected`,
                      life: 2000,
                    });
                  }}
                  size="small"
                />
              </div>

              {/* Hero Section */}
              <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
                <div className="text-center mb-4">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <i className="pi pi-crown text-yellow-500 text-sm"></i>
                    <h2 className="text-xl font-bold text-gray-800">
                      {selectedPlan.planname}
                    </h2>
                    <i className="pi pi-crown text-yellow-500 text-sm"></i>
                  </div>
                  <p className="text-gray-600 text-sm mb-3 max-w-md mx-auto">
                    {selectedPlan.description || 'No description available'}
                  </p>

                  {/* Pricing Showcase */}
                  <div className="flex flex-col sm:flex-row justify-center items-center gap-4 bg-gray-50 rounded-lg p-3">
                    <div className="text-center">
                      <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg shadow-md">
                        <span className="text-lg font-bold text-white">₹{parseFloat(selectedPlan.price || 0).toLocaleString()}</span>
                        <p className="text-emerald-100 text-xs font-medium mt-1">Plan Price</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-center">
                      <div className="w-6 h-px sm:w-px sm:h-6 bg-gray-300"></div>
                    </div>
                    <div className="text-center">
                      <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-md">
                        <span className="text-lg font-bold text-white">₹{parseFloat(selectedPlan.amc_charges || 0).toLocaleString()}</span>
                        <p className="text-blue-100 text-xs font-medium mt-1">AMC Charges</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid lg:grid-cols-2 gap-4">
                {/* Plan Information */}
                <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                      <i className="pi pi-info-circle text-white text-sm"></i>
                    </div>
                    <h4 className="text-lg font-semibold text-gray-800">Plan Information</h4>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                      <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                        <i className="pi pi-calendar text-white text-sm"></i>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700 text-sm">Duration</span>
                        <p className="text-green-600 font-semibold">{selectedPlan.duration} days</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                      <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                        <i className="pi pi-sync text-white text-sm"></i>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700 text-sm">Frequency</span>
                        <p className="text-blue-600 font-semibold">{selectedPlan.frequency}</p>
                      </div>
                    </div>
                    {selectedPlan.is_trial === 1 && (
                      <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                        <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                          <i className="pi pi-gift text-white text-sm"></i>
                        </div>
                        <div>
                          <Badge value="Trial Available" severity="warning" className="text-sm" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Features Section */}
                <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                      <i className="pi pi-check-circle text-white text-sm"></i>
                    </div>
                    <h4 className="text-lg font-semibold text-gray-800">Features Included</h4>
                  </div>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {selectedPlan.details && selectedPlan.details.length > 0 ? (
                      selectedPlan.details.map((detail, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <div className="w-7 h-7 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                            <i className="pi pi-check text-white text-xs"></i>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="font-medium text-gray-800 text-sm">{detail.particularname}</h5>
                            <div className="mt-1">
                              <span className="text-xs font-medium text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded">
                                Limit: {detail.limitation}
                              </span>
                              {detail.description && (
                                <p className="text-gray-600 text-xs mt-1 leading-relaxed">{detail.description}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <div className="p-3 bg-gray-100 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                          <i className="pi pi-info-circle text-lg text-gray-400"></i>
                        </div>
                        <p className="text-gray-500 text-sm font-medium">No specific features listed</p>
                        <p className="text-gray-400 text-xs mt-1">This plan includes standard features</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Plans Grid View */
            <div className="space-y-4 animate-fade-in-up">
              {/* Hero Header */}
              <div className="text-center mb-3">
                <div className="inline-flex items-center gap-2 mb-2">
                  <i className="pi pi-bookmark text-emerald-600 text-base"></i>
                  <h3 className="text-lg font-semibold text-gray-800">
                    Choose Your Perfect Plan
                  </h3>
                  <i className="pi pi-star text-emerald-600 text-base"></i>
                </div>
                <p className="text-gray-600 text-xs max-w-md mx-auto">
                  Select the ideal subscription plan for your agricultural business
                </p>
              </div>

              {/* Plans Grid */}
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 max-w-4xl mx-auto pt-4 px-4">
                {plans.map((plan, index) => (
                  <div
                    key={plan.planid}
                    className={`group relative bg-white rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 border overflow-hidden ${
                      index === 1 ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-gray-200 hover:border-emerald-200'
                    }`}
                  >
                    {/* Popular Ribbon Badge */}
                    {index === 1 && (
                      <div className="ribbon-wrapper">
                        <div className="ribbon">
                          <i className="pi pi-star-fill mr-1"></i>
                          POPULAR
                        </div>
                      </div>
                    )}

                    {/* Header */}
                    <div className={`relative p-3 text-center text-white ${
                      index === 0 ? 'bg-gradient-to-r from-emerald-500 to-green-600' :
                      index === 1 ? 'bg-gradient-to-r from-blue-500 to-indigo-600' :
                      'bg-gradient-to-r from-purple-500 to-pink-600'
                    }`}>
                      <div className="relative z-10">
                        <div className="flex items-center justify-center gap-2 mb-1">
                          <i className="pi pi-bookmark text-white text-xs"></i>
                          <h4 className="text-base font-semibold">{plan.planname}</h4>
                        </div>
                        <div className="text-xl font-bold mb-1">
                          ₹{parseFloat(plan.price || 0).toLocaleString()}
                        </div>
                        <p className="text-xs opacity-90">Plan Price</p>
                        {plan.is_trial === 1 && (
                          <Badge value="Free Trial" severity="warning" className="mt-1 text-xs px-1 py-0.5" />
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-3">
                      <p className="text-gray-600 mb-3 text-xs leading-relaxed">
                        {plan.description || 'No description available'}
                      </p>

                      {/* Features */}
                      <div className="space-y-1.5 mb-3">
                        <div className="flex items-center gap-2 p-1.5 bg-green-50 rounded">
                          <div className="w-5 h-5 bg-green-500 rounded flex items-center justify-center">
                            <i className="pi pi-calendar text-white text-xs"></i>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700 text-xs">Duration</span>
                            <p className="text-green-600 font-semibold text-xs">{plan.duration} days</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 p-1.5 bg-blue-50 rounded">
                          <div className="w-5 h-5 bg-blue-500 rounded flex items-center justify-center">
                            <i className="pi pi-sync text-white text-xs"></i>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700 text-xs">Frequency</span>
                            <p className="text-blue-600 font-semibold text-xs">{plan.frequency}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 p-1.5 bg-purple-50 rounded">
                          <div className="w-5 h-5 bg-purple-500 rounded flex items-center justify-center">
                            <i className="pi pi-dollar text-white text-xs"></i>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700 text-xs">AMC</span>
                            <p className="text-purple-600 font-semibold text-xs">₹{parseFloat(plan.amc_charges || 0).toLocaleString()}</p>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col gap-1.5">
                        <Button
                          type="button"
                          label="View Details"
                          icon="pi pi-eye"
                          className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium shadow-sm hover:shadow transition-all duration-200 border-0 rounded py-1.5 text-xs"
                          onClick={() => onPreviewPlan(plan)}
                        />
                        <Button
                          type="button"
                          label="Select Plan"
                          icon="pi pi-check"
                          className={`w-full text-white font-semibold shadow hover:shadow-md transition-all duration-200 border-0 rounded py-1.5 text-xs ${
                            index === 0 ? 'bg-emerald-500 hover:bg-emerald-600' :
                            index === 1 ? 'bg-blue-500 hover:bg-blue-600' :
                            'bg-purple-500 hover:bg-purple-600'
                          }`}
                          onClick={() => {
                            onSelectPlan(plan);
                            toast.current?.show({
                              severity: "success",
                              summary: "Plan Selected",
                              detail: `${plan.planname} has been selected`,
                              life: 2000,
                            });
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Empty State */}
              {plans.length === 0 && (
                <div className="text-center py-16">
                  <div className="max-w-md mx-auto">
                    <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center">
                      <i className="pi pi-inbox text-5xl text-gray-500"></i>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-700 mb-2">No Plans Available</h3>
                    <p className="text-gray-500 text-lg">Check back later for exciting subscription plans!</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Dialog>
    </>
  );
};

export default PlanExplorer;