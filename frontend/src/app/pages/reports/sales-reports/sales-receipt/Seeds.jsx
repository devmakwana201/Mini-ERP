import React, { useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Toast } from "primereact/toast";
import { Page } from "components/shared/Page";
import BillActionBar from "components/bill/BillActionBar";
import BillErrorState from "components/bill/BillErrorState";
import { useBillFontLoader } from "hooks/useBillFontLoader";
import { useBillData } from "hooks/useBillData";
import {
  generatePDF,
  generateImage,
  BILL_FONT_FAMILY,
} from "utils/billExportUtils";

// Transform Seeds API response to component format
const transformSeedsApiResponse = (apiData) => {
  const { locationData, orderData, itemdetails } = apiData;

  // Transform seeds items
  const transformedProducts = (itemdetails.seed || []).map((item, index) => ({
    srNo: index + 1,
    name: item.itemname,
    hsnCode: item.hsnseccode,
    category: item.itemcategory || "-",
    brand: item.brandname || "-",
    qty: `${item.quantity}`,
    rate: parseFloat(item.price) || 0,
    amount: parseFloat(item.totalamount) || 0,
    manufacturer: item.brandname || "-",
    lotNoAndDate: item.batchinfo || "-",
    packingDetails: "-",
    saleRate: parseFloat(item.price) || 0,
    totalAmount: parseFloat(item.totalamount) || 0,
  }));

  return {
    // Location data
    locationName: locationData.locationname || "",
    locationAddress: locationData.address || "",
    locationCity: locationData.cityname || "",
    locationState: locationData.statename || "",
    locationContact: locationData.contactno || "",
    GSTIN: locationData.gstno || "",
    SeedsLicenseNumber: locationData.seedslicensenumber || "",
    SeedsLicenseDate: locationData.seedslicensedate || "",
    tagline: locationData.tagline || "",
    bankdetails: locationData.bankdetails || "—",
    termconditions: locationData.termconditions || "—",

    // Order data
    BillNo: orderData.billno || "",
    Customer: orderData.customername || "",
    CustomerPhone: orderData.customerphone || "",
    Date: orderData.orderdate || "",
    Time: orderData.orderdate ? orderData.orderdate.split(" ")[1] : "",
    Transaction: orderData.paymentmodename || "",
    OrderTotal: parseFloat(orderData.amount) || 0,
    Discount: parseFloat(orderData.discountamount) || 0,
    GrandTotal: parseFloat(orderData.grandtotal) || 0,

    // Static fields (kept for compatibility)
    FarmerCode: orderData.customername || "",
    GatesNumber: orderData.customerphone || "",
    Mobile: locationData.contactno || "",
    BillNumber: orderData.billno || "",

    // Products
    products: transformedProducts,
  };
};

export default function Seeds() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useRef(null);
  const billRef = useRef(null);

  // Use shared hooks
  const { fontLoaded, preloadFont } = useBillFontLoader();
  const { billData, isLoading, error, retryFetch } = useBillData(
    "seeds",
    id,
    transformSeedsApiResponse,
  );

  useEffect(() => {
    // Load font when component mounts
    preloadFont();
  }, [preloadFont]);

  // Use shared export utilities
  const downloadPDF = () => {
    generatePDF(billRef.current, `Bill-${billData?.BillNo}.pdf`, toast);
  };

  const downloadImage = () => {
    generateImage(billRef.current, `Bill-${billData?.BillNo}.png`, toast);
  };

  if (isLoading || !fontLoaded) {
    return (
      <Page title="Loading Bill...">
        {/* Fixed Action Bar Skeleton - matches actual button positions */}
        <div className="fixed top-2 right-2 z-50 sm:top-4 sm:right-4">
          {/* Download Buttons Skeleton */}
          <div className="flex gap-1 sm:gap-2">
            <div className="h-12 w-12 animate-pulse rounded-full bg-yellow-200"></div>
            <div className="h-12 w-12 animate-pulse rounded-full bg-blue-200"></div>
          </div>
        </div>

        <div className="min-h-screen bg-gray-100 py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4">
            {/* Bill Skeleton */}
            <div
              className="overflow-hidden rounded-lg bg-white shadow-lg"
              style={{ minWidth: "800px" }}
            >
              {/* Bill Header Skeleton */}
              <div className="border-b-2 border-gray-100 p-6">
                <div className="grid grid-cols-3 gap-4">
                  {/* Left Column - GSTIN and other details */}
                  <div className="space-y-3">
                    <div className="h-4 w-32 animate-pulse rounded bg-gray-200"></div>
                    <div className="h-4 w-28 animate-pulse rounded bg-gray-100"></div>
                    <div className="h-4 w-36 animate-pulse rounded bg-gray-100"></div>
                    <div className="h-4 w-36 animate-pulse rounded bg-gray-100"></div>
                    <div className="h-4 w-32 animate-pulse rounded bg-gray-100"></div>
                  </div>

                  {/* Center Column - BILL OF SUPPLY and shop details */}
                  <div className="flex flex-col items-center space-y-3">
                    {/* BILL OF SUPPLY skeleton */}
                    <div className="h-8 w-32 animate-pulse rounded border-2 border-blue-200 bg-blue-100"></div>

                    {/* Shop name skeleton */}
                    <div className="h-6 w-40 animate-pulse rounded bg-gray-200"></div>

                    {/* Shop description skeleton */}
                    <div className="space-y-1 text-center">
                      <div className="h-3 w-48 animate-pulse rounded bg-gray-100"></div>
                      <div className="h-3 w-36 animate-pulse rounded bg-gray-100"></div>
                    </div>

                    {/* Address skeleton */}
                    <div className="h-3 w-52 animate-pulse rounded bg-gray-100"></div>
                  </div>

                  {/* Right Column - Mobile, Bill details */}
                  <div className="space-y-2 text-right">
                    <div className="ml-auto h-4 w-24 animate-pulse rounded bg-gray-200"></div>
                    <div className="ml-auto h-4 w-32 animate-pulse rounded bg-gray-100"></div>
                    <div className="ml-auto h-4 w-40 animate-pulse rounded bg-gray-100"></div>
                    <div className="ml-auto h-4 w-20 animate-pulse rounded bg-gray-100"></div>
                    {/* Payment method skeleton at bottom right */}
                    <div className="mt-8 ml-auto h-4 w-28 animate-pulse rounded bg-gray-200"></div>
                  </div>
                </div>
              </div>

              {/* Table Skeleton */}
              <div className="p-6">
                {/* Table Header */}
                <div className="mb-2 grid grid-cols-10 gap-2 rounded bg-blue-50 p-2">
                  {[...Array(10)].map((_, i) => (
                    <div
                      key={i}
                      className="h-4 animate-pulse rounded bg-blue-100"
                    ></div>
                  ))}
                </div>

                {/* Table Rows */}
                {[...Array(3)].map((_, rowIndex) => (
                  <div
                    key={rowIndex}
                    className="grid grid-cols-10 gap-2 border-b border-gray-100 p-2"
                  >
                    {[...Array(10)].map((_, colIndex) => (
                      <div
                        key={colIndex}
                        className={`h-4 animate-pulse bg-gray-${rowIndex % 2 === 0 ? "100" : "50"} rounded`}
                        style={{
                          animationDelay: `${(rowIndex * 10 + colIndex) * 50}ms`,
                        }}
                      ></div>
                    ))}
                  </div>
                ))}
              </div>

              {/* Terms and Totals Section Skeleton - Matching actual layout */}
              <div className="p-6">
                <div className="grid grid-cols-5 gap-4">
                  {/* Terms and Bank Details Column (3/5 width on desktop) */}
                  <div className="col-span-3 space-y-4">
                    <div>
                      <div className="mb-2 h-5 w-32 animate-pulse rounded bg-blue-100"></div>
                      <div className="mb-1 h-4 w-1/4 animate-pulse rounded bg-gray-100"></div>
                      <div className="h-4 w-1/4 animate-pulse rounded bg-gray-100"></div>
                    </div>
                    <div>
                      <div className="mb-2 h-5 w-32 animate-pulse rounded bg-blue-100"></div>
                      <div className="mb-1 h-4 w-1/4 animate-pulse rounded bg-gray-100"></div>
                      <div className="h-4 w-1/4 animate-pulse rounded bg-gray-100"></div>
                    </div>
                  </div>

                  {/* Totals Table Column (2/5 width on desktop) */}
                  <div className="col-span-2">
                    <table className="w-full border-collapse">
                      <tbody>
                        <tr>
                          <td className="border border-gray-300 px-3 py-2">
                            <div className="h-4 w-20 animate-pulse rounded bg-gray-200"></div>
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-right">
                            <div className="ml-auto h-4 w-16 animate-pulse rounded bg-gray-300"></div>
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 px-3 py-2">
                            <div className="h-4 w-24 animate-pulse rounded bg-gray-200"></div>
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-right">
                            <div className="ml-auto h-4 w-16 animate-pulse rounded bg-gray-300"></div>
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 px-3 py-2">
                            <div className="h-4 w-20 animate-pulse rounded bg-gray-300 font-bold"></div>
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-right">
                            <div className="ml-auto h-4 w-20 animate-pulse rounded bg-gray-400 font-bold"></div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Signature Section Skeleton */}
                <div className="mt-8 grid grid-cols-2 gap-6">
                  <div>
                    <div className="mb-8 h-4 w-48 animate-pulse rounded bg-gray-200"></div>
                    <div className="h-0.5 w-48 bg-gray-300"></div>
                  </div>
                  <div className="text-right">
                    <div className="mb-8 ml-auto h-4 w-48 animate-pulse rounded bg-gray-200"></div>
                    <div className="ml-auto h-0.5 w-48 bg-gray-300"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Page>
    );
  }

  // Error State
  if (error) {
    return <BillErrorState error={error} onRetry={retryFetch} title="Error" />;
  }

  // Bill Not Found State (legacy - now handled by error state)
  if (!billData) {
    return (
      <Page title="Bill Not Found">
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <h1 className="mb-4 text-2xl font-bold text-gray-800">
              Bill Not Found
            </h1>
            <p className="mb-6 text-gray-600">
              The requested bill could not be found.
            </p>
          </div>
        </div>
      </Page>
    );
  }

  return (
    <Page title={`Bill ${billData.BillNo}`}>
      <Toast ref={toast} />

      {/* Action Bar */}
      <BillActionBar
        onDownloadPDF={downloadPDF}
        onDownloadImage={downloadImage}
      />

      {/* Bill Content */}
      <div className="min-h-screen bg-gray-100 py-16 sm:py-20 print:bg-white print:py-0">
        <div className="mx-auto w-full max-w-7xl px-2 sm:px-4">
          {/* Responsive Bill Wrapper */}
          <div className="overflow-x-auto">
            <div
              ref={billRef}
              className="bg-white shadow-lg print:shadow-none"
              style={{ minWidth: "800px" }}
            >
              {/* Bill Container */}
              <div
                className="print:page-break-after-always border-2 border-blue-600 bg-white p-3 sm:p-6 print:m-0"
                style={{
                  fontFamily: BILL_FONT_FAMILY,
                }}
              >
                <table className="w-full table-fixed border-collapse">
                  {/* Header Section */}
                  <tbody>
                    <tr>
                      <td>
                        <table className="w-full table-fixed border-collapse">
                          <tbody>
                            <tr>
                              <td className="w-1/3 p-2 text-left align-top text-sm wrap-break-word">
                                <div className="mb-1 text-sm">
                                  <span className="font-bold">GSTIN:</span>{" "}
                                  {billData.GSTIN || "—"}
                                </div>
                                <div className="mb-1 text-sm">
                                  <span className="font-bold">
                                    બિયારણ લા. નં:
                                  </span>{" "}
                                  {billData.SeedsLicenseNumber || "—"}
                                </div>
                                <div className="mb-1 text-sm">
                                  <span className="font-bold">
                                    બિયારણ લા. તા:
                                  </span>{" "}
                                  {billData.SeedsLicenseDate
                                    ? new Date(
                                        billData.SeedsLicenseDate,
                                      ).toLocaleDateString("en-IN")
                                    : "—"}
                                </div>
                                <div className="mb-1 text-sm">
                                  <span className="font-bold">
                                    ગ્રાહકનું નામ:
                                  </span>{" "}
                                  {billData.Customer || "—"}
                                </div>
                                <div className="text-sm">
                                  <span className="font-bold">ગ્રાહક મો:</span>{" "}
                                  {billData.CustomerPhone || "—"}
                                </div>
                              </td>
                              <td className="w-1/3 p-2 text-center align-top text-sm wrap-break-word">
                                <span className="inline-block rounded border-2 border-blue-600 px-3 py-2 text-base leading-none font-bold whitespace-nowrap text-blue-600">
                                  BILL OF SUPPLY
                                </span>
                                <span className="mt-1 block text-xl font-bold text-black">
                                  {billData.locationName}
                                </span>
                                <span className="mt-2 block text-base font-normal">
                                  {billData.tagline}
                                </span>
                                <hr className="mt-2 border-t border-gray-400" />
                                <div className="mt-2 text-base font-normal">
                                  {billData.locationAddress},{" "}
                                  {billData.locationCity},{" "}
                                  {billData.locationState}
                                </div>
                              </td>
                              <td className="relative w-1/3 p-2 text-right align-top text-sm wrap-break-word">
                                <div className="text-sm">
                                  <div className="mb-1">
                                    <span className="font-bold">મો:</span>{" "}
                                    {billData.locationContact || "—"}
                                  </div>
                                  <div className="mb-1">
                                    <span className="font-bold">બિલ નં:</span>{" "}
                                    {billData.BillNumber || "—"}
                                  </div>
                                  <div className="mb-1">
                                    <span className="font-bold">તા:</span>{" "}
                                    {billData.Date} વિસ્તારક્ષેત્ર, ન્યાય
                                  </div>
                                  <div>ક્ષેત્ર {billData.locationCity}</div>
                                </div>
                                <div className="absolute right-2 bottom-2 text-right">
                                  <span className="font-bold">
                                    ચુકવણી પ્રકાર:
                                  </span>{" "}
                                  {billData.Transaction || "—"}
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>

                    {/* Items Table */}
                    <tr>
                      <td>
                        <table className="mt-4 w-full border-collapse text-xs sm:text-sm">
                          <thead>
                            <tr>
                              <th
                                className="border border-blue-600 bg-blue-50 px-1 py-1 text-center font-bold text-blue-600 sm:px-2 sm:py-2"
                                style={{ width: "6%" }}
                              >
                                અ. નં
                              </th>
                              <th
                                className="border border-blue-600 bg-blue-50 px-1 py-1 text-center font-bold text-blue-600 sm:px-2 sm:py-2"
                                style={{ width: "20%" }}
                              >
                                પાક અને જાતનું નામ
                              </th>
                              <th
                                className="border border-blue-600 bg-blue-50 px-1 py-1 text-center font-bold text-blue-600 sm:px-2 sm:py-2"
                                style={{ width: "10%" }}
                              >
                                HSN Code
                              </th>
                              <th
                                className="border border-blue-600 bg-blue-50 px-1 py-1 text-center font-bold text-blue-600 sm:px-2 sm:py-2"
                                style={{ width: "12%" }}
                              >
                                બિયારણનું વર્ગ
                              </th>
                              <th
                                className="border border-blue-600 bg-blue-50 px-1 py-1 text-center font-bold text-blue-600 sm:px-2 sm:py-2"
                                style={{ width: "12%" }}
                              >
                                ઉત્પાદકનું નામ
                              </th>
                              <th
                                className="border border-blue-600 bg-blue-50 px-1 py-1 text-center font-bold text-blue-600 sm:px-2 sm:py-2"
                                style={{ width: "12%" }}
                              >
                                લોટ નં. અને તારીખ
                              </th>
                              <th
                                className="border border-blue-600 bg-blue-50 px-1 py-1 text-center font-bold text-blue-600 sm:px-2 sm:py-2"
                                style={{ width: "8%" }}
                              >
                                પેકિંગની વિગત
                              </th>
                              <th
                                className="border border-blue-600 bg-blue-50 px-1 py-1 text-center font-bold text-blue-600 sm:px-2 sm:py-2"
                                style={{ width: "10%" }}
                              >
                                વેચાણ ભાવ
                              </th>
                              <th
                                className="border border-blue-600 bg-blue-50 px-1 py-1 text-center font-bold text-blue-600 sm:px-2 sm:py-2"
                                style={{ width: "10%" }}
                              >
                                જથ્થો
                              </th>
                              <th
                                className="border border-blue-600 bg-blue-50 px-1 py-1 text-center font-bold text-blue-600 sm:px-2 sm:py-2"
                                style={{ width: "10%" }}
                              >
                                કુલ કિંમત
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {billData.products &&
                              billData.products.map((product, index) => (
                                <tr key={index}>
                                  <td className="border border-blue-600 px-1 py-1 text-center wrap-break-word sm:px-2 sm:py-1">
                                    {product.srNo}
                                  </td>
                                  <td className="border border-blue-600 px-1 py-1 text-left wrap-break-word sm:px-2 sm:py-1">
                                    {product.name}
                                  </td>
                                  <td className="border border-blue-600 px-1 py-1 text-center wrap-break-word sm:px-2 sm:py-1">
                                    {product.hsnCode}
                                  </td>
                                  <td className="border border-blue-600 px-1 py-1 text-center wrap-break-word sm:px-2 sm:py-1">
                                    {product.category}
                                  </td>
                                  <td className="border border-blue-600 px-1 py-1 text-center wrap-break-word sm:px-2 sm:py-1">
                                    {product.manufacturer}
                                  </td>
                                  <td className="border border-blue-600 px-1 py-1 text-center wrap-break-word sm:px-2 sm:py-1">
                                    {product.lotNoAndDate}
                                  </td>
                                  <td className="border border-blue-600 px-1 py-1 text-center wrap-break-word sm:px-2 sm:py-1">
                                    {product.packingDetails}
                                  </td>
                                  <td className="border border-blue-600 px-1 py-1 text-center wrap-break-word tabular-nums sm:px-2 sm:py-1">
                                    {product.saleRate}
                                  </td>
                                  <td className="border border-blue-600 px-1 py-1 text-center wrap-break-word sm:px-2 sm:py-1">
                                    {product.qty}
                                  </td>
                                  <td className="border border-blue-600 px-1 py-1 text-center wrap-break-word tabular-nums sm:px-2 sm:py-1">
                                    {product.totalAmount}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>

                    {/* Terms and Totals */}
                    <tr>
                      <td>
                        <table className="mt-4 w-full border-collapse">
                          <tbody>
                            <tr>
                              <td className="w-3/5 pr-4 align-top text-base">
                                <div className="mb-2 text-sm font-bold text-blue-600">
                                  શરતો અને નિયમો:
                                </div>
                                <div className="my-2 text-sm">
                                  {billData.termconditions}
                                </div>

                                <div className="mb-2 text-sm font-bold text-blue-600">
                                  બેંકની વિગતો:
                                </div>
                                <div className="my-2 space-y-1 text-sm">
                                  {billData.bankdetails}
                                </div>
                              </td>

                              <td className="w-2/5 align-top text-sm">
                                <table className="w-full border-collapse text-sm">
                                  <tbody>
                                    <tr>
                                      <td className="border border-blue-600 px-3 py-2 text-left font-bold">
                                        કુલ રકમ:
                                      </td>
                                      <td className="border border-blue-600 px-3 py-2 text-right">
                                        {billData.OrderTotal}
                                      </td>
                                    </tr>
                                    <tr>
                                      <td className="border border-blue-600 px-3 py-2 text-left font-bold">
                                        છૂટ:
                                      </td>
                                      <td className="border border-blue-600 px-3 py-2 text-right">
                                        {billData.Discount}
                                      </td>
                                    </tr>
                                    <tr>
                                      <td className="border border-blue-600 px-3 py-2 font-bold">
                                        કુલ મળતર:
                                      </td>
                                      <td className="border border-blue-600 px-3 py-2 text-right font-bold">
                                        {billData.GrandTotal}
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>

                    {/* Signatures */}
                    <tr>
                      <td>
                        <table className="mt-4 w-full border-collapse">
                          <tbody>
                            <tr>
                              <td className="w-1/2 pr-4 text-left align-bottom">
                                <div className="mt-4 text-sm font-bold">
                                  પુરવઠાકર્તાની અધિકૃત વ્યક્તિની સહી
                                </div>
                                <div className="mt-8 w-48 border-t-2 border-blue-600"></div>
                              </td>
                              <td className="w-1/2 text-right align-bottom">
                                <div className="mt-4 text-sm font-bold">
                                  ગ્રાહકની અધિકૃત વ્યક્તિની સહી
                                </div>
                                <div className="mt-8 ml-auto w-48 border-t-2 border-blue-600"></div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}
