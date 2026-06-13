const db = require("../../../config/db");
const winston = require("../../../config/winston");

const parseFilters = (filters) => {
    if (!filters) return {};
    try {
        return JSON.parse(filters);
    } catch (error) {
        winston.warn("Invalid filters JSON received", {
            source: "creditorReport.model.js",
            function: "parseFilters",
            error: error.message,
        });
        return {};
    }
};

const getFilterValue = (filters, field) => {
    const value = filters[field];
    return typeof value === "object" ? value?.value : value;
};

const buildScopedClause = (alias, companyid, locationid) => {
    const conditions = [`${alias}.isdeleted = 0`];
    const params = [];

    if (companyid) {
        conditions.push(`${alias}.companyid = ?`);
        params.push(companyid);
    }

    if (locationid) {
        conditions.push(`${alias}.locationid = ?`);
        params.push(locationid);
    }

    return {
        clause: conditions.join(" AND "),
        params,
    };
};

module.exports = {
    getCreditorReport: async (req) => {
        try {
            const {
                start = 0,
                length = 10,
                filters,
                sortField = "outstanding_amount",
                sortOrder = "desc",
                locationId,
            } = req.query;

            const parsedFilters = parseFilters(filters);
            const companyid =
                getFilterValue(parsedFilters, "companyid") || req.user?.companyId || null;
            const locationid = locationId || getFilterValue(parsedFilters, "locationid") || null;

            const accountScope = buildScopedClause("sad", companyid, locationid);
            const paymentScope = buildScopedClause("sp", companyid, locationid);
            const purchaseScope = buildScopedClause("pom", companyid, locationid);

            const baseParams = [
                ...accountScope.params,
                ...accountScope.params,
                ...accountScope.params,
                ...accountScope.params,
                ...paymentScope.params,
                ...paymentScope.params,
                ...purchaseScope.params,
                ...accountScope.params,
            ];

            if (companyid) {
                baseParams.push(companyid);
            }

            const baseQuery = `
                SELECT
                    sm.id AS id,
                    sm.supplierid AS supplierid,
                    sm.suppliername AS creditor,
                    ROUND(COALESCE(sm.overduelimit, 0), 2) AS credit_limit,
                    ROUND(COALESCE((
                        SELECT sad.balance
                        FROM supplieraccountdetails sad
                        WHERE sad.supplierid = sm.supplierid AND ${accountScope.clause}
                        ORDER BY sad.paymentdate DESC, sad.id DESC
                        LIMIT 1
                    ), csm.outstandingamt, sm.outstandingamt, 0), 2) AS amount,
                    ROUND(COALESCE((
                        SELECT sad.balance
                        FROM supplieraccountdetails sad
                        WHERE sad.supplierid = sm.supplierid AND ${accountScope.clause}
                        ORDER BY sad.paymentdate DESC, sad.id DESC
                        LIMIT 1
                    ), csm.outstandingamt, sm.outstandingamt, 0), 2) AS outstanding_amount,
                    ROUND(COALESCE((
                        SELECT sad.balance - COALESCE(sad.debitamount, 0) + COALESCE(sad.creditamount, 0)
                        FROM supplieraccountdetails sad
                        WHERE sad.supplierid = sm.supplierid AND ${accountScope.clause}
                        ORDER BY sad.paymentdate ASC, sad.id ASC
                        LIMIT 1
                    ), 0), 2) AS opening_balance,
                    ROUND(COALESCE((
                        SELECT sad.balance
                        FROM supplieraccountdetails sad
                        WHERE sad.supplierid = sm.supplierid AND ${accountScope.clause}
                        ORDER BY sad.paymentdate DESC, sad.id DESC
                        LIMIT 1
                    ), csm.outstandingamt, sm.outstandingamt, 0), 2) AS closing_balance,
                    (
                        SELECT sp.paymentdate
                        FROM supplieraccountdetails sp
                        WHERE sp.supplierid = sm.supplierid
                          AND sp.creditamount > 0
                          AND sp.purchaseorderid IS NULL
                          AND (sp.txntype = 1 OR sp.txntype IS NULL)
                          AND ${paymentScope.clause}
                        ORDER BY sp.paymentdate DESC, sp.id DESC
                        LIMIT 1
                    ) AS last_payment_date,
                    ROUND(COALESCE((
                        SELECT sp.creditamount
                        FROM supplieraccountdetails sp
                        WHERE sp.supplierid = sm.supplierid
                          AND sp.creditamount > 0
                          AND sp.purchaseorderid IS NULL
                          AND (sp.txntype = 1 OR sp.txntype IS NULL)
                          AND ${paymentScope.clause}
                        ORDER BY sp.paymentdate DESC, sp.id DESC
                        LIMIT 1
                    ), 0), 2) AS last_payment_amount,
                    ROUND(COALESCE((
                        SELECT SUM(pom.grandtotal)
                        FROM purchaseordermaster pom
                        WHERE pom.supplierid = sm.supplierid
                          AND YEAR(pom.purchaseorderdate) = YEAR(CURDATE())
                          AND ${purchaseScope.clause}
                    ), 0), 2) AS total_purchases_ytd,
                    ROUND(
                        COALESCE(sm.overduelimit, 0) -
                        COALESCE((
                            SELECT sad.balance
                            FROM supplieraccountdetails sad
                            WHERE sad.supplierid = sm.supplierid AND ${accountScope.clause}
                            ORDER BY sad.paymentdate DESC, sad.id DESC
                            LIMIT 1
                        ), csm.outstandingamt, sm.outstandingamt, 0),
                        2
                    ) AS available_credit,
                    COALESCE(sm.contactperson, '') AS contact_person,
                    COALESCE(sm.phoneno, '') AS phone
                FROM suppliermaster sm
                LEFT JOIN company_suppliermaster csm
                    ON csm.supplierid = sm.supplierid
                    AND csm.isdeleted = 0
                    ${companyid ? "AND csm.companyid = ?" : ""}
                WHERE sm.isdeleted = 0 AND sm.isapproved = 1
            `;

            const filterConditions = [];
            const filterParams = [];

            Object.entries({
                creditor: "creditor",
                contact_person: "contact_person",
                phone: "phone",
            }).forEach(([filterKey, dbField]) => {
                const value = getFilterValue(parsedFilters, filterKey);
                if (value) {
                    filterConditions.push(`${dbField} LIKE ?`);
                    filterParams.push(`%${value}%`);
                }
            });

            Object.entries({
                amount: "amount",
                credit_limit: "credit_limit",
                outstanding_amount: "outstanding_amount",
                opening_balance: "opening_balance",
                closing_balance: "closing_balance",
                last_payment_amount: "last_payment_amount",
                total_purchases_ytd: "total_purchases_ytd",
                available_credit: "available_credit",
            }).forEach(([filterKey, dbField]) => {
                const value = getFilterValue(parsedFilters, filterKey);
                if (value !== null && value !== undefined && value !== "") {
                    filterConditions.push(`ROUND(CAST(${dbField} AS DECIMAL(18,2)), 2) = ?`);
                    filterParams.push(parseFloat(value));
                }
            });

            const lastPaymentDate = getFilterValue(parsedFilters, "last_payment_date");
            if (lastPaymentDate) {
                filterConditions.push(`DATE_FORMAT(last_payment_date, '%d/%m/%Y') LIKE ?`);
                filterParams.push(`%${lastPaymentDate}%`);
            }

            const global = getFilterValue(parsedFilters, "global");
            if (global) {
                filterConditions.push(`(
                    creditor LIKE ? OR contact_person LIKE ? OR phone LIKE ?
                    OR CAST(amount AS CHAR) LIKE ? OR CAST(credit_limit AS CHAR) LIKE ?
                    OR CAST(outstanding_amount AS CHAR) LIKE ? OR CAST(opening_balance AS CHAR) LIKE ?
                    OR CAST(closing_balance AS CHAR) LIKE ? OR DATE_FORMAT(last_payment_date, '%d/%m/%Y') LIKE ?
                    OR CAST(last_payment_amount AS CHAR) LIKE ? OR CAST(total_purchases_ytd AS CHAR) LIKE ?
                    OR CAST(available_credit AS CHAR) LIKE ?
                )`);
                const searchValue = `%${global}%`;
                filterParams.push(
                    searchValue,
                    searchValue,
                    searchValue,
                    searchValue,
                    searchValue,
                    searchValue,
                    searchValue,
                    searchValue,
                    searchValue,
                    searchValue,
                    searchValue,
                    searchValue
                );
            }

            const reportWhereClause =
                filterConditions.length > 0 ? `WHERE ${filterConditions.join(" AND ")}` : "";

            const countQuery = `
                SELECT COUNT(*) AS total
                FROM (${baseQuery}) AS creditor_report
                ${reportWhereClause}
            `;

            const countResult = await db.getResults(countQuery, [...baseParams, ...filterParams]);
            const totalRecords = countResult[0]?.total || 0;

            const sortFieldMap = {
                id: "id",
                creditor: "creditor",
                amount: "amount",
                credit_limit: "credit_limit",
                outstanding_amount: "outstanding_amount",
                opening_balance: "opening_balance",
                closing_balance: "closing_balance",
                last_payment_date: "last_payment_date",
                last_payment_amount: "last_payment_amount",
                total_purchases_ytd: "total_purchases_ytd",
                available_credit: "available_credit",
                contact_person: "contact_person",
                phone: "phone",
            };

            const mappedSortField =
                sortFieldMap[String(sortField || "").toLowerCase()] || "outstanding_amount";
            const order = String(sortOrder).toLowerCase() === "asc" ? "ASC" : "DESC";

            let dataQuery = `
                SELECT *
                FROM (${baseQuery}) AS creditor_report
                ${reportWhereClause}
                ORDER BY ${mappedSortField} ${order}, creditor ASC
            `;

            const startNum = parseInt(start, 10) || 0;
            const lengthNum = parseInt(length, 10);
            const queryParams = [...baseParams, ...filterParams];

            if (lengthNum !== -1) {
                dataQuery += " LIMIT ?, ?";
                queryParams.push(startNum, Number.isNaN(lengthNum) ? 10 : lengthNum);
            }

            const creditorData = await db.getResults(dataQuery, queryParams);

            return {
                data: creditorData,
                pagination: {
                    start: startNum,
                    length: Number.isNaN(lengthNum) ? 10 : lengthNum,
                    total: totalRecords,
                    totalPages:
                        lengthNum !== -1 && !Number.isNaN(lengthNum)
                            ? Math.ceil(totalRecords / lengthNum)
                            : 1,
                },
            };
        } catch (error) {
            winston.error(`Error fetching creditor report: ${error.message}`, {
                source: "creditorReport.model.js",
                function: "getCreditorReport",
                error: error.message,
                stack: error.stack,
                filters: req.query?.filters,
            });
            throw error;
        }
    },
};
