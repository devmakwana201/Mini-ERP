import React, { useRef, useEffect } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
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

// Transform API response to component format
const transformApiResponse = (apiData) => {
  const { locationData, orderData, itemdetails } = apiData;

  // Transform items into the format expected by the component
  const transformItems = (items, category) => {
    return items.map((item, index) => ({
      name: item.itemname,
      hsn: item.hsnseccode,
      qty: `${item.quantity}`,
      rate: parseFloat(item.price),
      amount: parseFloat(item.totalamount),
      taxPercent: parseFloat(item.taxamount),
      taxProfileName: item.taxprofilename,
      totalTaxAmount: parseFloat(item.totaltaxamount),
      category: category,
      batchInfo: item.batchinfo || "-",
    }));
  };

  // Combine all products
  const allProducts = [
    ...transformItems(itemdetails.seed || [], "seed"),
    ...transformItems(itemdetails.fertilizer || [], "fertilizer"),
    ...transformItems(itemdetails.pesticide || [], "pesticide"),
    ...transformItems(itemdetails.otherproduct || [], "otherproduct"),
  ];

  return {
    // Location data
    locationName: locationData.locationname || "",
    locationAddress: locationData.address || "",
    locationCity: locationData.cityname || "",
    locationState: locationData.statename || "",
    locationContact: locationData.contactno || "",
    locationGST: locationData.gstno || "",
    tagline: locationData.tagline || "",
    bankdetails: locationData.bankdetails || "—",
    termconditions: locationData.termconditions || "—",

    // Order data
    BillNo: orderData.billno || "",
    Customer: orderData.customername || "",
    CustomerPhone: orderData.customerphone || "",
    Date: orderData.orderdate || "",
    Transaction: orderData.paymentmodename || "",
    OrderTotal: parseFloat(orderData.amount) || 0,
    Discount: parseFloat(orderData.discountamount) || 0,
    TaxableAmount: parseFloat(orderData.taxableamount) || 0,
    TaxAmount: parseFloat(orderData.totaltaxamount) || 0,
    RoundOff: parseFloat(orderData.roundoff) || 0,
    GrandTotal: parseFloat(orderData.grandtotal) || 0,

    // Products
    products: allProducts,
    itemDetails: itemdetails,
  };
};

export default function EBill() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useRef(null);
  const billRef = useRef(null);
  const hasAutoDownloaded = useRef(false);

  // Use shared hooks
  const { fontLoaded, preloadFont } = useBillFontLoader();
  const { billData, isLoading, error, retryFetch } = useBillData(
    "ebill",
    id,
    transformApiResponse,
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

  useEffect(() => {
    if (!fontLoaded || !billData || !billRef.current || hasAutoDownloaded.current) {
      return;
    }

    const searchParams = new URLSearchParams(location.search);
    const shouldAutoDownloadPdf = searchParams.get("download") === "pdf";

    if (!shouldAutoDownloadPdf) {
      return;
    }

    hasAutoDownloaded.current = true;
    const timer = window.setTimeout(() => {
      generatePDF(billRef.current, `Bill-${billData?.BillNo}.pdf`, toast);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [billData, fontLoaded, location.search]);

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
                  <div className="space-y-3">
                    <div className="h-6 w-48 animate-pulse rounded bg-gray-200"></div>
                    <div className="h-4 w-32 animate-pulse rounded bg-gray-100"></div>
                    <div className="h-4 w-40 animate-pulse rounded bg-gray-100"></div>
                  </div>
                  <div className="flex justify-center">
                    <div className="h-10 w-32 animate-pulse rounded border-2 border-blue-200 bg-blue-100"></div>
                  </div>
                  <div className="space-y-2 text-right">
                    <div className="ml-auto h-4 w-24 animate-pulse rounded bg-gray-200"></div>
                    <div className="ml-auto h-4 w-32 animate-pulse rounded bg-gray-100"></div>
                    <div className="ml-auto h-4 w-28 animate-pulse rounded bg-gray-100"></div>
                  </div>
                </div>
              </div>

              {/* From/To Section Skeleton */}
              <div className="grid grid-cols-2 gap-6 border-b border-gray-100 p-6">
                <div className="space-y-3">
                  <div className="h-5 w-16 animate-pulse rounded bg-blue-100"></div>
                  <div className="h-4 w-40 animate-pulse rounded bg-gray-200"></div>
                  <div className="h-4 w-48 animate-pulse rounded bg-gray-100"></div>
                  <div className="h-4 w-32 animate-pulse rounded bg-gray-100"></div>
                </div>
                <div className="space-y-3">
                  <div className="h-5 w-20 animate-pulse rounded bg-blue-100"></div>
                  <div className="h-4 w-36 animate-pulse rounded bg-gray-200"></div>
                  <div className="h-4 w-28 animate-pulse rounded bg-gray-100"></div>
                </div>
              </div>

              {/* Table Skeleton */}
              <div className="p-6">
                {/* Table Header */}
                <div className="mb-2 grid grid-cols-11 gap-2 rounded bg-blue-50 p-2">
                  {[...Array(11)].map((_, i) => (
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
                    className="grid grid-cols-11 gap-2 border-b border-gray-100 p-2"
                  >
                    {[...Array(11)].map((_, colIndex) => (
                      <div
                        key={colIndex}
                        className={`h-4 animate-pulse bg-gray-${rowIndex % 2 === 0 ? "100" : "50"} rounded`}
                        style={{
                          animationDelay: `${(rowIndex * 11 + colIndex) * 50}ms`,
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
                            <div className="h-4 w-20 animate-pulse rounded bg-gray-200"></div>
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-right">
                            <div className="ml-auto h-4 w-16 animate-pulse rounded bg-gray-300"></div>
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 px-3 py-2">
                            <div className="h-4 w-28 animate-pulse rounded bg-gray-200"></div>
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
                        <tr>
                          <td className="border border-gray-300 px-3 py-2">
                            <div className="h-4 w-20 animate-pulse rounded bg-gray-200"></div>
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-right">
                            <div className="ml-auto h-4 w-12 animate-pulse rounded bg-gray-300"></div>
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
    return <BillErrorState error={error} onRetry={retryFetch} />;
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
                                <span className="mt-1 block text-xl font-bold text-black">
                                  {billData.locationName}
                                </span>
                                <span className="mt-2 block text-base font-normal">
                                  {billData.tagline}
                                </span>
                              </td>
                              <td className="w-1/3 p-2 text-center align-top text-sm wrap-break-word">
                                <span className="inline-block rounded border-2 border-blue-600 px-3 py-2 text-base leading-none font-bold whitespace-nowrap text-blue-600">
                                  SALES ORDER
                                </span>
                              </td>
                              <td className="w-1/3 p-2 text-right align-top text-sm wrap-break-word">
                                <div className="mt-3 text-sm">
                                  <div className="mb-2">
                                    <span className="font-bold">ઓર્ડર નં:</span>{" "}
                                    {billData.BillNo || "—"}
                                  </div>
                                  <div className="mb-2">
                                    <span className="font-bold">તારીખ:</span>{" "}
                                    {billData.Date || "—"}
                                  </div>
                                  <div>
                                    <span className="font-bold">ચુકવણી:</span>{" "}
                                    {billData.Transaction || "—"}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>

                    {/* From/Bill To Section */}
                    <tr>
                      <td>
                        <table className="w-full border-collapse text-sm">
                          <tbody>
                            <tr>
                              <td className="w-1/2 px-3 py-2">
                                <div className="mb-1 text-sm font-bold text-blue-600 uppercase">
                                  FROM
                                </div>
                                <div className="my-1">
                                  <span className="font-bold">
                                    {billData.locationName}
                                  </span>
                                </div>
                                <div className="my-1">
                                  {billData.locationAddress},{" "}
                                  {billData.locationCity},{" "}
                                  {billData.locationState}
                                </div>
                                <div className="my-1">
                                  <span className="font-bold">GSTIN:</span>{" "}
                                  {billData.locationGST || "—"}
                                </div>
                                <div className="my-1">
                                  <span className="font-bold">Phone:</span>{" "}
                                  {billData.locationContact || "—"}
                                </div>
                              </td>
                              <td className="w-1/2 px-3 py-2">
                                <div className="mb-1 text-sm font-bold text-blue-600 uppercase">
                                  BILL TO
                                </div>
                                <div className="my-1">
                                  <span className="font-bold">Name:</span>{" "}
                                  {billData.Customer || "—"}
                                </div>
                                <div className="my-1">
                                  <span className="font-bold">Phone:</span>{" "}
                                  {billData.CustomerPhone || "—"}
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
                                style={{ width: "5%" }}
                              >
                                અ.ક્ર.
                              </th>
                              <th
                                className="border border-blue-600 bg-blue-50 px-1 py-1 text-center font-bold text-blue-600 sm:px-2 sm:py-2"
                                style={{ width: "27%" }}
                              >
                                વિવરણ
                              </th>
                              <th
                                className="border border-blue-600 bg-blue-50 px-1 py-1 text-center font-bold text-blue-600 sm:px-2 sm:py-2"
                                style={{ width: "11%" }}
                              >
                                HSN
                              </th>
                              <th
                                className="border border-blue-600 bg-blue-50 px-1 py-1 text-center font-bold text-blue-600 sm:px-2 sm:py-2"
                                style={{ width: "10%" }}
                              >
                                બેચ / લોટ તારીખ
                              </th>
                              <th
                                className="border border-blue-600 bg-blue-50 px-1 py-1 text-center font-bold text-blue-600 sm:px-2 sm:py-2"
                                style={{ width: "8%" }}
                              >
                                પેકીંગની વિગત
                              </th>
                              <th
                                className="border border-blue-600 bg-blue-50 px-1 py-1 text-center font-bold text-blue-600 sm:px-2 sm:py-2"
                                style={{ width: "6%" }}
                              >
                                જથ્થો
                              </th>
                              <th
                                className="border border-blue-600 bg-blue-50 px-1 py-1 text-center font-bold text-blue-600 sm:px-2 sm:py-2"
                                style={{ width: "8%" }}
                              >
                                દર
                              </th>
                              <th
                                className="border border-blue-600 bg-blue-50 px-1 py-1 text-center font-bold text-blue-600 sm:px-2 sm:py-2"
                                style={{ width: "7%" }}
                              >
                                રકમ
                              </th>
                              <th
                                className="border border-blue-600 bg-blue-50 px-1 py-1 text-center font-bold text-blue-600 sm:px-2 sm:py-2"
                                style={{ width: "6%" }}
                              >
                                Tax%
                              </th>
                              <th
                                className="border border-blue-600 bg-blue-50 px-1 py-1 text-center font-bold text-blue-600 sm:px-2 sm:py-2"
                                style={{ width: "8%" }}
                              >
                                કર રકમ
                              </th>
                              <th
                                className="border border-blue-600 bg-blue-50 px-1 py-1 text-center font-bold text-blue-600 sm:px-2 sm:py-2"
                                style={{ width: "10%" }}
                              >
                                કુલ રકમ
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {billData.itemDetails?.seed &&
                              billData.itemDetails.seed.length > 0 && (
                                <>
                                  <tr>
                                    <td
                                      colSpan="11"
                                      className="border border-blue-600 bg-blue-50 px-1 py-1 text-left font-bold text-blue-600 sm:px-2 sm:py-1"
                                    >
                                      Seeds
                                    </td>
                                  </tr>
                                  {billData.itemDetails.seed.map(
                                    (product, index) => (
                                      <tr key={`seed-${index}`}>
                                        <td className="border border-blue-600 px-1 py-1 text-left wrap-break-word sm:px-2 sm:py-1">
                                          {index + 1}
                                        </td>
                                        <td className="border border-blue-600 px-1 py-1 text-left wrap-break-word sm:px-2 sm:py-1">
                                          {product.itemname}
                                        </td>
                                        <td className="border border-blue-600 px-1 py-1 text-center wrap-break-word sm:px-2 sm:py-1">
                                          ({product.hsnseccode})
                                        </td>
                                        <td className="border border-blue-600 px-1 py-1 text-center wrap-break-word sm:px-2 sm:py-1">
                                          {product.batchinfo || "-"}
                                        </td>
                                        <td className="border border-blue-600 px-1 py-1 text-center wrap-break-word sm:px-2 sm:py-1">
                                          -
                                        </td>
                                        <td className="border border-blue-600 px-1 py-1 text-center wrap-break-word sm:px-2 sm:py-1">
                                          {product.quantity}
                                        </td>
                                        <td className="border border-blue-600 px-1 py-1 text-center wrap-break-word sm:px-2 sm:py-1">
                                          {parseFloat(product.price).toFixed(2)}
                                        </td>
                                        <td className="border border-blue-600 px-1 py-1 text-center wrap-break-word tabular-nums sm:px-2 sm:py-1">
                                          {parseFloat(
                                            product.totalamount,
                                          ).toFixed(2)}
                                        </td>
                                        <td className="border border-blue-600 px-1 py-1 text-center wrap-break-word sm:px-2 sm:py-1">
                                          {product.taxprofilename}
                                        </td>
                                        <td className="border border-blue-600 px-1 py-1 text-center wrap-break-word tabular-nums sm:px-2 sm:py-1">
                                          {parseFloat(
                                            product.taxamount,
                                          ).toFixed(2)}
                                        </td>
                                        <td className="border border-blue-600 px-1 py-1 text-center wrap-break-word tabular-nums sm:px-2 sm:py-1">
                                          {parseFloat(
                                            product.totaltaxamount,
                                          ).toFixed(2)}
                                        </td>
                                      </tr>
                                    ),
                                  )}
                                </>
                              )}

                            {billData.itemDetails?.fertilizer &&
                              billData.itemDetails.fertilizer.length > 0 && (
                                <>
                                  <tr>
                                    <td
                                      colSpan="11"
                                      className="border border-blue-600 bg-blue-50 px-1 py-1 text-left font-bold text-blue-600 sm:px-2 sm:py-1"
                                    >
                                      Fertilizers
                                    </td>
                                  </tr>
                                  {billData.itemDetails.fertilizer.map(
                                    (product, index) => (
                                      <tr key={`fertilizer-${index}`}>
                                        <td className="border border-blue-600 px-1 py-1 text-left wrap-break-word sm:px-2 sm:py-1">
                                          {index + 1}
                                        </td>
                                        <td className="border border-blue-600 px-1 py-1 text-left wrap-break-word sm:px-2 sm:py-1">
                                          {product.itemname}
                                        </td>
                                        <td className="border border-blue-600 px-1 py-1 text-center wrap-break-word sm:px-2 sm:py-1">
                                          ({product.hsnseccode})
                                        </td>
                                        <td className="border border-blue-600 px-1 py-1 text-center wrap-break-word sm:px-2 sm:py-1">
                                          {product.batchinfoF || "-"}
                                        </td>
                                        <td className="border border-blue-600 px-1 py-1 text-center wrap-break-word sm:px-2 sm:py-1">
                                          -
                                        </td>
                                        <td className="border border-blue-600 px-1 py-1 text-center wrap-break-word sm:px-2 sm:py-1">
                                          {product.quantity}
                                        </td>
                                        <td className="border border-blue-600 px-1 py-1 text-center wrap-break-word sm:px-2 sm:py-1">
                                          {parseFloat(product.price).toFixed(2)}
                                        </td>
                                        <td className="border border-blue-600 px-1 py-1 text-center wrap-break-word tabular-nums sm:px-2 sm:py-1">
                                          {parseFloat(
                                            product.totalamount,
                                          ).toFixed(2)}
                                        </td>
                                        <td className="border border-blue-600 px-1 py-1 text-center wrap-break-word sm:px-2 sm:py-1">
                                          {product.taxprofilename}
                                        </td>
                                        <td className="border border-blue-600 px-1 py-1 text-center wrap-break-word tabular-nums sm:px-2 sm:py-1">
                                          {parseFloat(
                                            product.taxamount,
                                          ).toFixed(2)}
                                        </td>
                                        <td className="border border-blue-600 px-1 py-1 text-center wrap-break-word tabular-nums sm:px-2 sm:py-1">
                                          {parseFloat(
                                            product.totaltaxamount,
                                          ).toFixed(2)}
                                        </td>
                                      </tr>
                                    ),
                                  )}
                                </>
                              )}

                            {billData.itemDetails?.pesticide &&
                              billData.itemDetails.pesticide.length > 0 && (
                                <>
                                  <tr>
                                    <td
                                      colSpan="11"
                                      className="border border-blue-600 bg-blue-50 px-1 py-1 text-left font-bold text-blue-600 sm:px-2 sm:py-1"
                                    >
                                      Pesticides
                                    </td>
                                  </tr>
                                  {billData.itemDetails.pesticide.map(
                                    (product, index) => (
                                      <tr key={`pesticide-${index}`}>
                                        <td className="border border-blue-600 px-1 py-1 text-left wrap-break-word sm:px-2 sm:py-1">
                                          {index + 1}
                                        </td>
                                        <td className="border border-blue-600 px-1 py-1 text-left wrap-break-word sm:px-2 sm:py-1">
                                          {product.itemname}
                                        </td>
                                        <td className="border border-blue-600 px-1 py-1 text-center wrap-break-word sm:px-2 sm:py-1">
                                          ({product.hsnseccode})
                                        </td>
                                        <td className="border border-blue-600 px-1 py-1 text-center wrap-break-word sm:px-2 sm:py-1">
                                          {product.batchinfo || "-"}
                                        </td>
                                        <td className="border border-blue-600 px-1 py-1 text-center wrap-break-word sm:px-2 sm:py-1">
                                          -
                                        </td>
                                        <td className="border border-blue-600 px-1 py-1 text-center wrap-break-word sm:px-2 sm:py-1">
                                          {product.quantity}
                                        </td>
                                        <td className="border border-blue-600 px-1 py-1 text-center wrap-break-word sm:px-2 sm:py-1">
                                          {parseFloat(product.price).toFixed(2)}
                                        </td>
                                        <td className="border border-blue-600 px-1 py-1 text-center wrap-break-word tabular-nums sm:px-2 sm:py-1">
                                          {parseFloat(
                                            product.totalamount,
                                          ).toFixed(2)}
                                        </td>
                                        <td className="border border-blue-600 px-1 py-1 text-center wrap-break-word sm:px-2 sm:py-1">
                                          {product.taxprofilename}
                                        </td>
                                        <td className="border border-blue-600 px-1 py-1 text-center wrap-break-word tabular-nums sm:px-2 sm:py-1">
                                          {parseFloat(
                                            product.taxamount,
                                          ).toFixed(2)}
                                        </td>
                                        <td className="border border-blue-600 px-1 py-1 text-center wrap-break-word tabular-nums sm:px-2 sm:py-1">
                                          {parseFloat(
                                            product.totaltaxamount,
                                          ).toFixed(2)}
                                        </td>
                                      </tr>
                                    ),
                                  )}
                                </>
                              )}

                            {billData.itemDetails?.otherproduct &&
                              billData.itemDetails.otherproduct.length > 0 && (
                                <>
                                  <tr>
                                    <td
                                      colSpan="11"
                                      className="border border-blue-600 bg-blue-50 px-1 py-1 text-left font-bold text-blue-600 sm:px-2 sm:py-1"
                                    >
                                      Other Products
                                    </td>
                                  </tr>
                                  {billData.itemDetails.otherproduct.map(
                                    (product, index) => (
                                      <tr key={`otherproduct-${index}`}>
                                        <td className="border border-blue-600 px-1 py-1 text-left wrap-break-word sm:px-2 sm:py-1">
                                          {index + 1}
                                        </td>
                                        <td className="border border-blue-600 px-1 py-1 text-left wrap-break-word sm:px-2 sm:py-1">
                                          {product.itemname}
                                        </td>
                                        <td className="border border-blue-600 px-1 py-1 text-center wrap-break-word sm:px-2 sm:py-1">
                                          ({product.hsnseccode})
                                        </td>
                                        <td className="border border-blue-600 px-1 py-1 text-center wrap-break-word sm:px-2 sm:py-1">
                                          {product.batchinfo || "-"}
                                        </td>
                                        <td className="border border-blue-600 px-1 py-1 text-center wrap-break-word sm:px-2 sm:py-1">
                                          -
                                        </td>
                                        <td className="border border-blue-600 px-1 py-1 text-center wrap-break-word sm:px-2 sm:py-1">
                                          {product.quantity}
                                        </td>
                                        <td className="border border-blue-600 px-1 py-1 text-center wrap-break-word sm:px-2 sm:py-1">
                                          {parseFloat(product.price).toFixed(2)}
                                        </td>
                                        <td className="border border-blue-600 px-1 py-1 text-center wrap-break-word tabular-nums sm:px-2 sm:py-1">
                                          {parseFloat(
                                            product.totalamount,
                                          ).toFixed(2)}
                                        </td>
                                        <td className="border border-blue-600 px-1 py-1 text-center wrap-break-word sm:px-2 sm:py-1">
                                          {product.taxprofilename}
                                        </td>
                                        <td className="border border-blue-600 px-1 py-1 text-center wrap-break-word tabular-nums sm:px-2 sm:py-1">
                                          {parseFloat(
                                            product.taxamount,
                                          ).toFixed(2)}
                                        </td>
                                        <td className="border border-blue-600 px-1 py-1 text-center wrap-break-word tabular-nums sm:px-2 sm:py-1">
                                          {parseFloat(
                                            product.totaltaxamount,
                                          ).toFixed(2)}
                                        </td>
                                      </tr>
                                    ),
                                  )}
                                </>
                              )}
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
                                      <td className="border border-blue-600 px-3 py-2 text-left font-bold">
                                        કર રકમ:
                                      </td>
                                      <td className="border border-blue-600 px-3 py-2 text-right">
                                        {billData.TaxAmount}
                                      </td>
                                    </tr>
                                    <tr>
                                      <td className="border border-blue-600 px-3 py-2 text-left font-bold">
                                        રાઉન્ડ ઓફ:
                                      </td>
                                      <td className="border border-blue-600 px-3 py-2 text-right">
                                        {billData.RoundOff}
                                      </td>
                                    </tr>
                                    <tr>
                                      <td className="border border-blue-600 px-3 py-2 font-bold">
                                        ટોટલ રકમ:
                                      </td>
                                      <td className="border border-blue-600 px-3 py-2 text-right font-bold">
                                        {billData.GrandTotal}
                                      </td>
                                    </tr>
                                    <tr>
                                      <td className="border border-blue-600 px-3 py-2 text-left font-bold">
                                        બાકી રકમ:
                                      </td>
                                      <td className="border border-blue-600 px-3 py-2 text-right">
                                        0
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
            {/* Computer-generated note
            <div className="py-3 text-center sm:py-4 print:py-2">
              <span className="inline-block rounded border border-dashed border-gray-400 px-3 py-1 text-[11px] text-gray-600 sm:text-xs">
                આ કોમ્પ્યુટરથી જનરેટ થયેલ બિલ છે — This is a computer-generated
                bill and does not require a signature.
              </span>
            </div> */}
          </div>
        </div>
      </div>
    </Page>
  );
}
