const db = require("../../config/db");
const winston = require("../../config/winston");
module.exports = {
    ebill: async (billId, formatid = null) => {
        try {
            const locationQuery = `select lm.locationid, lm.locationname, lm.address, cym.cityname, stm.statename, lm.contactno, lm.gstno,
                                    IFNULL(bnf.bankdetails, "") as bankdetails,
                                    IFNULL(bnf.termconditions, "") as termconditions,
                                    IFNULL(bnf.jurisdiction, "") as jurisdiction,
                                    IFNULL(bnf.tagline, "") as tagline,
                                    IFNULL(bnf.invoicemsg, "") as invoicemsg
                                    from locationmaster lm
                                    JOIN ordermaster om ON om.locationid = lm.locationid AND lm.isdeleted = 0
                                    LEFT JOIN orderinvoice oi ON oi.uniquekey = om.uniquekey AND oi.isdeleted = 0
                                    LEFT JOIN billnumformat bnf ON bnf.formatid = oi.formatid AND bnf.isdeleted = 0
                                    LEFT JOIN citymaster cym on cym.cityid = lm.cityid and cym.isdeleted = 0
                                    LEFT JOIN statemaster stm on stm.stateid = lm.stateid and stm.isdeleted = 0
                                    where om.uniquekey = ?
                                    LIMIT 1`;
            const locationData = await db.getResults(locationQuery, billId);

            const orderQuery = `select om.orderid, om.billno, DATE_FORMAT(om.orderdate, '%d-%b-%y %h:%I:%p') orderdate,
                                    GROUP_CONCAT(DISTINCT pt.paymentmodename ORDER BY pt.paymentmodename SEPARATOR ', ') as paymentmodename,
                                    cm.name customername, cm.phoneno as customerphone,
                                    ROUND(CAST(om.amount AS CHAR), 2) amount,
                                    ROUND(CAST(om.discountamount AS CHAR), 2) discountamount,
                                    ROUND(CAST(om.taxableamount AS CHAR), 2) taxableamount,
                                    ROUND(CAST(om.totaltaxamount AS CHAR), 2) totaltaxamount,
                                    ROUND(CAST(om.roundoff AS CHAR), 2) roundoff,
                                    ROUND(CAST(om.grandtotal AS CHAR), 2) grandtotal
                                from ordermaster om
                                LEFT JOIN paymentmaster ptm ON ptm.uniquekey=om.uniquekey AND ptm.isdeleted = 0
                                LEFT JOIN paymenttransactionmaster pttm ON pttm.uniquekey=ptm.uniquekey AND pttm.isdeleted = 0
                                LEFT JOIN paymenttype pt ON pttm.paymodeid = pt.paymentid AND pt.isdeleted = 0
                                LEFT JOIN customermaster cm ON cm.uniquekey=om.customeruniquekey AND om.companyid=cm.companyid AND cm.isdeleted = 0
                                where om.uniquekey = ? AND om.isdeleted = 0
                                GROUP BY om.orderid, om.billno, om.orderdate, cm.name, cm.phoneno, om.amount, om.discountamount, om.taxableamount, om.totaltaxamount, om.roundoff, om.grandtotal`;
            const orderData = await db.getResults(orderQuery, billId);

            let query = `SELECT
                            opd.locationid,
                            lm.locationname,
                            om.orderid,
                            om.billno,
                            lm.gstno,
                            im.hsnseccode,
                            io.formatid,
                            icm.itemcategoryname,
                            om.orderdate AS orderdate,
                            om.ordertype AS ordertypeid,
                            otm.ordertype,
                            opd.productid,
                            im.itemname,
                            ROUND(CAST(opd.quantity AS CHAR),2) quantity,
                            tpm.taxprofilename,
                            ROUND(CAST(opd.price AS CHAR),2) price,
                            ROUND(CAST(opd.totaltaxamount AS CHAR),2) totaltaxamount,
                            ROUND(CAST(opd.taxableamount AS CHAR),2) taxableamount,
                            ROUND(CAST(om.discountamount AS CHAR),2) discountamount,
                            ROUND(CAST(opd.taxamount AS CHAR),2) AS taxamt,
                            ROUND(CAST(om.roundoff AS CHAR),2) roundoff,
                            ROUND(CAST(om.grandtotal AS CHAR),2) grandtotal,
                            ROUND(CAST(opd.totalamount AS CHAR),2) totalamount,
                            ROUND(CAST(om.amount AS CHAR),2) amount,
                            cm.id AS customerid,
                            cm.name,
                            cm.phoneno,
                            cmp.companyname,
                            lm.address,
                            lm.contactno,
                            cym.cityname,
                            opd.batchid,
                            CASE WHEN opd.batchid = '' THEN '-' WHEN opd.batchdate IS NULL THEN CONCAT(opd.batchid) ELSE CONCAT(
                                opd.batchid,
                                ' (',
                                DATE_FORMAT(opd.batchdate, '%d-%m-%Y'),
                                ')'
                            ) END AS batchinfo
                        FROM
                            orderproductdetails opd
                            LEFT JOIN ordermaster om ON opd.uniquekey = om.uniquekey AND om.isdeleted = 0
                            LEFT JOIN itemmaster im ON opd.pmuniquekey = im.uniquekey AND im.isdeleted = 0
                            LEFT JOIN itemcategorymaster icm ON im.mastercategoryid = icm.itemcategoryid
                            LEFT JOIN ordertypemaster otm ON om.ordertype = otm.ordertypeid AND otm.isdeleted = 0
                            LEFT JOIN locationmaster lm ON om.locationid = lm.locationid AND lm.isdeleted = 0
                            LEFT JOIN companymaster cmp ON cmp.companyid = om.companyid AND cmp.isdeleted = 0
                            LEFT JOIN orderinvoice io ON io.invoiceid = opd.invoiceid AND io.uniquekey = om.uniquekey
                            LEFT JOIN billnumformat bnf ON bnf.formatid = io.formatid AND bnf.isdeleted = 0
                            LEFT JOIN citymaster cym ON cym.cityid = lm.cityid AND cym.isdeleted = 0
                            LEFT JOIN customermaster cm ON cm.customerid = om.customerid AND om.companyid = cm.companyid
                            LEFT JOIN taxprofilemaster tpm ON im.defaulttaxprofileid = tpm.taxprofileid AND tpm.isdeleted = 0
                        WHERE
                            om.uniquekey = ?`;

            let params = [billId];

            if (formatid) {
                query += ` AND bnf.format_type = ?`;
                params.push(formatid);
            }

            const getReceiptData = await db.getResults(query, params);
            // const orderTaxQuery = `select taxname,round(opd.taxpercentage,2)taxpercentage,round(sum(opd.taxamount),2) taxamount
            //                         from orderproducttaxdetails opd
            //                         inner join taxmaster tm on opd.taxid=tm.taxid and tm.isdeleted=0
            //                         and uniquekey = ?
            //                         group by opd.taxid order by opd.taxpercentage`;
            // const getOrderTaxDetails = await db.getResults(orderTaxQuery, (billId));

            // const getExtraDataQuery = `SELECT formatid, format, IFNULL(prefix, "") prefix, IFNULL(startnumber, "") startnumber,
            //                             IFNULL(termconditions, "") termconditions, IFNULL(jurisdiction, "") jurisdiction,
            //                             IFNULL(bankdetails, "") bankdetails, IFNULL(tagline, "") tagline, IFNULL(invoicemsg, "") invoicemsg
            //                             FROM billnumformat
            //                             where isdeleted = 0 AND formatid = ? `;
            // const getExtraData = await db.getResults(getExtraDataQuery, ());
            // console.log(getReceiptData);
            const formatCategories = {
                seeds: "seed",
                fertilizers: "fertilizer",
                pesticides: "pesticide",
                otherproduct: "otherproduct",
            };

            // Initialize itemdetails with empty arrays for all categories
            const itemdetails = {
                seed: [],
                fertilizer: [],
                pesticide: [],
                otherproduct: [],
            };

            // Group itemdetails by formatid
            getReceiptData.forEach((item) => {
                const category = formatCategories[item.itemcategoryname] || "otherproduct";
                const mappedItem = {
                    itemname: item.itemname,
                    hsnseccode: item.hsnseccode,
                    batchid: item.batchid,
                    batchinfo: item.batchinfo,
                    quantity: item.quantity,
                    price: item.price,
                    totalamount: item.totalamount,
                    taxprofilename: item.taxprofilename,
                    taxamount: item.taxamt,
                    totaltaxamount: item.totaltaxamount,
                };
                itemdetails[category].push(mappedItem);
            });

            const result = {
                locationData: locationData[0] || {},
                orderData: orderData[0] || {},
                itemdetails,
            };

            return result;
        } catch (error) {
            winston.error(`Error Retriving ebill: ${error.message}`, {
                source: "salesReceipts.model.js",
                function: "ebill",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                billId: billId,
                formatid: formatid
            });
            throw error
        }
    },

    ebillSeed: async (billId) => {
        try {
            const locationQuery = `select lm.locationid, lm.locationname, lm.address, cym.cityname, stm.statename, lm.contactno, lm.gstno,
                                    lm.seedslicensenumber, lm.seedslicensedate,
                                    IFNULL(bnf.bankdetails, "") as bankdetails,
                                    IFNULL(bnf.termconditions, "") as termconditions,
                                    IFNULL(bnf.jurisdiction, "") as jurisdiction,
                                    IFNULL(bnf.tagline, "") as tagline,
                                    IFNULL(bnf.invoicemsg, "") as invoicemsg
                                    from locationmaster lm
                                    JOIN ordermaster om ON om.locationid = lm.locationid AND lm.isdeleted = 0
                                    LEFT JOIN orderinvoice oi ON oi.uniquekey = om.uniquekey AND oi.isdeleted = 0
                                    LEFT JOIN billnumformat bnf ON bnf.formatid = oi.formatid AND bnf.isdeleted = 0 AND bnf.format_type = 1
                                    LEFT JOIN citymaster cym on cym.cityid = lm.cityid and cym.isdeleted = 0
                                    LEFT JOIN statemaster stm on stm.stateid = lm.stateid and stm.isdeleted = 0
                                    where om.uniquekey = ?
                                    LIMIT 1`;
            const locationData = await db.getResults(locationQuery, billId);

            const orderQuery = `select om.orderid, om.billno, DATE_FORMAT(om.orderdate, '%d-%b-%y %h:%I:%p') orderdate,
                                    GROUP_CONCAT(DISTINCT pt.paymentmodename ORDER BY pt.paymentmodename SEPARATOR ', ') as paymentmodename,
                                    cm.name customername, cm.phoneno as customerphone,
                                    ROUND(CAST(io.amount AS CHAR), 2) amount,
                                    ROUND(CAST(io.discountamt AS CHAR), 2) discountamount,
                                    ROUND(CAST(io.taxableamt AS CHAR), 2) taxableamount,
                                    ROUND(CAST(io.taxamt AS CHAR), 2) totaltaxamount,
                                    ROUND(CAST(io.grandtotal AS CHAR), 2) grandtotal
                                from ordermaster om
                                INNER JOIN orderinvoice io ON io.uniquekey = om.uniquekey AND io.isdeleted = 0
                                INNER JOIN billnumformat bnf ON bnf.formatid = io.formatid AND bnf.isdeleted = 0 AND bnf.format_type = 1
                                LEFT JOIN paymentmaster ptm ON ptm.uniquekey=om.uniquekey AND ptm.isdeleted = 0
                                LEFT JOIN paymenttransactionmaster pttm ON pttm.uniquekey=ptm.uniquekey AND pttm.isdeleted = 0
                                LEFT JOIN paymenttype pt ON pttm.paymodeid = pt.paymentid AND pt.isdeleted = 0
                                LEFT JOIN customermaster cm ON cm.uniquekey=om.customeruniquekey AND om.companyid=cm.companyid AND cm.isdeleted = 0
                                where om.uniquekey = ? AND om.isdeleted = 0
                                GROUP BY om.orderid, om.billno, om.orderdate, cm.name, cm.phoneno, io.amount, io.discountamt, io.taxableamt, io.taxamt, io.grandtotal`;
            const orderData = await db.getResults(orderQuery, billId);

            let query = `SELECT opd.locationid,lm.locationname,om.orderid,om.billno,lm.gstno,im.hsnseccode, io.formatid,
                            iscm.itemcategoryname as itemsubcategory, icm.itemcategoryname as itemcategory, bm.brandname,
                            DATE_FORMAT(om.orderdate, '%d-%b-%y %h:%I:%p') orderdate,
                            om.ordertype AS ordertypeid,otm.ordertype,
                            opd.productid,im.itemname, ROUND(CAST(opd.quantity AS CHAR), 2) quantity,
                            ROUND(CAST(opd.price AS CHAR), 2) price,ROUND(CAST(opd.totaltaxamount AS CHAR), 2) totaltaxamount,
                            ROUND(CAST(om.taxableamount AS CHAR), 2) taxableamount,ROUND(CAST(om.discountamount AS CHAR), 2) discountamount,
                            ROUND(CAST(om.roundoff AS CHAR), 2) roundoff,
                            ROUND(CAST(om.grandtotal AS CHAR), 2) grandtotal,ROUND(CAST(opd.totalamount AS CHAR), 2) totalamount,ROUND(CAST(om.amount AS CHAR), 2) amount,
                            cm.id as customerid,cm.name,cm.phoneno,cmp.companyname,lm.address, lm.contactno , cym.cityname,
                            opd.batchid, CASE WHEN opd.batchid = '' THEN '-' WHEN opd.batchdate IS NULL THEN CONCAT(opd.batchid) ELSE CONCAT(opd.batchid, ' (', DATE_FORMAT(opd.batchdate, '%d-%m-%Y'), ')') END AS batchinfo
                            FROM orderproductdetails opd
                                LEFT JOIN ordermaster om ON opd.uniquekey=om.uniquekey AND om.isdeleted = 0
                                LEFT JOIN itemmaster im ON opd.pmuniquekey = im.uniquekey AND im.isdeleted = 0
                                LEFT JOIN itemcategorymaster iscm ON iscm.itemcategoryid = im.subcategoryid AND iscm.isdeleted = 0
                                LEFT JOIN itemcategorymaster icm ON icm.itemcategoryid = im.categoryid AND icm.isdeleted = 0
                                LEFT JOIN brandmaster bm ON im.brandid = bm.brandid AND bm.isdeleted = 0
                                LEFT JOIN ordertypemaster otm ON om.ordertype = otm.ordertypeid AND otm.isdeleted = 0
                                LEFT JOIN locationmaster lm ON om.locationid = lm.locationid AND lm.isdeleted = 0
                                LEFT JOIN companymaster cmp ON cmp.companyid=om.companyid AND cmp.isdeleted=0
                                LEFT JOIN orderinvoice io on io.invoiceid = opd.invoiceid AND io.uniquekey = om.uniquekey
                                LEFT JOIN billnumformat bnf ON bnf.formatid = io.formatid AND bnf.isdeleted = 0
                                LEFT JOIN citymaster cym on cym.cityid = lm.cityid and cym.isdeleted = 0
                                LEFT JOIN customermaster cm ON cm.customerid=om.customerid AND om.companyid=cm.companyid
                            WHERE om.uniquekey = ? AND bnf.format_type = 1`;

            const getReceiptData = await db.getResults(query, [billId]);

            const itemdetails = {
                seed: [],
            };

            getReceiptData.forEach((item) => {
                const mappedItem = {
                    itemname: item.itemname,
                    hsnseccode: item.hsnseccode, //itemcategory, //brandname
                    batchid: item.batchid,
                    batchinfo: item.batchinfo,
                    itemsubcategory: item.itemsubcategory,
                    itemcategory: item.itemcategory,
                    brandname: item.brandname,
                    quantity: item.quantity,
                    price: item.price,
                    totalamount: item.totalamount,
                    totaltaxamount: item.totaltaxamount,
                };
                itemdetails.seed.push(mappedItem);
            });

            const result = {
                locationData: locationData[0] || {},
                orderData: orderData[0] || {},
                itemdetails,
            };

            return result;
        } catch (error) {
            winston.error(`Error Retrieving seed ebill: ${error.message}`, {
                source: "salesReceipts.model.js",
                function: "ebillSeed",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                billId: billId
            });
            throw error
        }
    },

    ebillFertilizer: async (billId) => {
        try {
            const locationQuery = `select lm.locationid, lm.locationname, lm.address, cym.cityname, stm.statename, lm.contactno, lm.gstno,
                                    lm.fertilizerlicensenumber, lm.fertilizerlicensedate,
                                    IFNULL(bnf.bankdetails, "") as bankdetails,
                                    IFNULL(bnf.termconditions, "") as termconditions,
                                    IFNULL(bnf.jurisdiction, "") as jurisdiction,
                                    IFNULL(bnf.tagline, "") as tagline,
                                    IFNULL(bnf.invoicemsg, "") as invoicemsg
                                    from locationmaster lm
                                    JOIN ordermaster om ON om.locationid = lm.locationid AND lm.isdeleted = 0
                                    LEFT JOIN orderinvoice oi ON oi.uniquekey = om.uniquekey AND oi.isdeleted = 0
                                    LEFT JOIN billnumformat bnf ON bnf.formatid = oi.formatid AND bnf.isdeleted = 0 AND bnf.format_type = 2
                                    LEFT JOIN citymaster cym on cym.cityid = lm.cityid and cym.isdeleted = 0
                                    LEFT JOIN statemaster stm on stm.stateid = lm.stateid and stm.isdeleted = 0
                                    where om.uniquekey = ?
                                    LIMIT 1`;
            const locationData = await db.getResults(locationQuery, billId);

            const orderQuery = `select om.orderid, om.billno, DATE_FORMAT(om.orderdate, '%d-%b-%y %h:%I:%p') orderdate,
                                    GROUP_CONCAT(DISTINCT pt.paymentmodename ORDER BY pt.paymentmodename SEPARATOR ', ') as paymentmodename,
                                    cm.name customername, cm.phoneno as customerphone,
                                    ROUND(CAST(io.amount AS CHAR), 2) amount,
                                    ROUND(CAST(io.discountamt AS CHAR), 2) discountamount,
                                    ROUND(CAST(io.taxableamt AS CHAR), 2) taxableamount,
                                    ROUND(CAST(io.taxamt AS CHAR), 2) totaltaxamount,
                                    ROUND(CAST(io.grandtotal AS CHAR), 2) grandtotal
                                from ordermaster om
                                INNER JOIN orderinvoice io ON io.uniquekey = om.uniquekey AND io.isdeleted = 0
                                INNER JOIN billnumformat bnf ON bnf.formatid = io.formatid AND bnf.isdeleted = 0 AND bnf.format_type = 2
                                LEFT JOIN paymentmaster ptm ON ptm.uniquekey=om.uniquekey AND ptm.isdeleted = 0
                                LEFT JOIN paymenttransactionmaster pttm ON pttm.uniquekey=ptm.uniquekey AND pttm.isdeleted = 0
                                LEFT JOIN paymenttype pt ON pttm.paymodeid = pt.paymentid AND pt.isdeleted = 0
                                LEFT JOIN customermaster cm ON cm.uniquekey=om.customeruniquekey AND om.companyid=cm.companyid AND cm.isdeleted = 0
                                where om.uniquekey = ? AND om.isdeleted = 0
                                GROUP BY om.orderid, om.billno, om.orderdate, cm.name, cm.phoneno, io.amount, io.discountamt, io.taxableamt, io.taxamt, io.grandtotal`;
            const orderData = await db.getResults(orderQuery, billId);

            let query = `SELECT opd.locationid,lm.locationname,om.orderid,om.billno,lm.gstno,im.hsnseccode, io.formatid,
                            DATE_FORMAT(om.orderdate, '%d-%b-%y %h:%I:%p') orderdate,
                            om.ordertype AS ordertypeid,otm.ordertype,
                            opd.productid,im.itemname, ROUND(CAST(opd.quantity AS CHAR), 2) quantity,
                            ROUND(CAST(opd.price AS CHAR), 2) price,ROUND(CAST(opd.totaltaxamount AS CHAR), 2) totaltaxamount,
                            ROUND(CAST(om.taxableamount AS CHAR), 2) taxableamount,ROUND(CAST(om.discountamount AS CHAR), 2) discountamount,
                            ROUND(CAST(om.roundoff AS CHAR), 2) roundoff,
                            ROUND(CAST(om.grandtotal AS CHAR), 2) grandtotal,ROUND(CAST(opd.totalamount AS CHAR), 2) totalamount,ROUND(CAST(om.amount AS CHAR), 2) amount,
                            cm.id as customerid,cm.name,cm.phoneno,cmp.companyname,lm.address, lm.contactno , cym.cityname,
                            opd.batchid, CASE WHEN opd.batchid = '' THEN '-' WHEN opd.batchdate IS NULL THEN CONCAT(opd.batchid) ELSE CONCAT(opd.batchid, ' (', DATE_FORMAT(opd.batchdate, '%d-%m-%Y'), ')') END AS batchinfo
                            FROM orderproductdetails opd
                                LEFT JOIN ordermaster om ON opd.uniquekey=om.uniquekey AND om.isdeleted = 0
                                LEFT JOIN itemmaster im ON opd.pmuniquekey = im.uniquekey AND im.isdeleted = 0
                                LEFT JOIN ordertypemaster otm ON om.ordertype = otm.ordertypeid AND otm.isdeleted = 0
                                LEFT JOIN locationmaster lm ON om.locationid = lm.locationid AND lm.isdeleted = 0
                                LEFT JOIN companymaster cmp ON cmp.companyid=om.companyid AND cmp.isdeleted=0
                                LEFT JOIN orderinvoice io on io.invoiceid = opd.invoiceid AND io.uniquekey = om.uniquekey
                                LEFT JOIN billnumformat bnf ON bnf.formatid = io.formatid AND bnf.isdeleted = 0
                                LEFT JOIN citymaster cym on cym.cityid = lm.cityid and cym.isdeleted = 0
                                LEFT JOIN customermaster cm ON cm.customerid=om.customerid AND om.companyid=cm.companyid
                            WHERE om.uniquekey = ? AND bnf.format_type = 2`;

            const getReceiptData = await db.getResults(query, [billId]);

            const itemdetails = {
                fertilizer: [],
            };

            getReceiptData.forEach((item) => {
                const mappedItem = {
                    itemname: item.itemname,
                    hsnseccode: item.hsnseccode,
                    batchid: item.batchid,
                    batchinfo: item.batchinfo,
                    quantity: item.quantity,
                    price: item.price,
                    totalamount: item.totalamount,
                    totaltaxamount: item.totaltaxamount,
                };
                itemdetails.fertilizer.push(mappedItem);
            });

            const result = {
                locationData: locationData[0] || {},
                orderData: orderData[0] || {},
                itemdetails,
            };

            return result;
        } catch (error) {
            winston.error(`Error Retrieving fertilizer ebill: ${error.message}`, {
                source: "salesReceipts.model.js",
                function: "ebillFertilizer",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                billId: billId
            });
            throw error
        }
    },

    ebillPesticide: async (billId) => {
        try {
            const locationQuery = `select lm.locationid, lm.locationname, lm.address, cym.cityname, stm.statename, lm.contactno, lm.gstno,
                                    lm.pesticideslicensenumber, lm.pesticideslicensedate,
                                    IFNULL(bnf.bankdetails, "") as bankdetails,
                                    IFNULL(bnf.termconditions, "") as termconditions,
                                    IFNULL(bnf.jurisdiction, "") as jurisdiction,
                                    IFNULL(bnf.tagline, "") as tagline,
                                    IFNULL(bnf.invoicemsg, "") as invoicemsg
                                    from locationmaster lm
                                    JOIN ordermaster om ON om.locationid = lm.locationid AND lm.isdeleted = 0
                                    LEFT JOIN orderinvoice oi ON oi.uniquekey = om.uniquekey AND oi.isdeleted = 0
                                    LEFT JOIN billnumformat bnf ON bnf.formatid = oi.formatid AND bnf.isdeleted = 0 AND bnf.format_type = 3
                                    LEFT JOIN citymaster cym on cym.cityid = lm.cityid and cym.isdeleted = 0
                                    LEFT JOIN statemaster stm on stm.stateid = lm.stateid and stm.isdeleted = 0
                                    where om.uniquekey = ?
                                    LIMIT 1`;
            const locationData = await db.getResults(locationQuery, billId);

            const orderQuery = `select om.orderid, om.billno, DATE_FORMAT(om.orderdate, '%d-%b-%y %h:%I:%p') orderdate,
                                    GROUP_CONCAT(DISTINCT pt.paymentmodename ORDER BY pt.paymentmodename SEPARATOR ', ') as paymentmodename,
                                    cm.name customername, cm.phoneno as customerphone,
                                    ROUND(CAST(io.amount AS CHAR), 2) amount,
                                    ROUND(CAST(io.discountamt AS CHAR), 2) discountamount,
                                    ROUND(CAST(io.taxableamt AS CHAR), 2) taxableamount,
                                    ROUND(CAST(io.taxamt AS CHAR), 2) totaltaxamount,
                                    ROUND(CAST(io.grandtotal AS CHAR), 2) grandtotal
                                from ordermaster om
                                INNER JOIN orderinvoice io ON io.uniquekey = om.uniquekey AND io.isdeleted = 0
                                INNER JOIN billnumformat bnf ON bnf.formatid = io.formatid AND bnf.isdeleted = 0 AND bnf.format_type = 3
                                LEFT JOIN paymentmaster ptm ON ptm.uniquekey=om.uniquekey AND ptm.isdeleted = 0
                                LEFT JOIN paymenttransactionmaster pttm ON pttm.uniquekey=ptm.uniquekey AND pttm.isdeleted = 0
                                LEFT JOIN paymenttype pt ON pttm.paymodeid = pt.paymentid AND pt.isdeleted = 0
                                LEFT JOIN customermaster cm ON cm.uniquekey=om.customeruniquekey AND om.companyid=cm.companyid AND cm.isdeleted = 0
                                where om.uniquekey = ? AND om.isdeleted = 0
                                GROUP BY om.orderid, om.billno, om.orderdate, cm.name, cm.phoneno, io.amount, io.discountamt, io.taxableamt, io.taxamt, io.grandtotal`;
            const orderData = await db.getResults(orderQuery, billId);

            let query = `SELECT opd.locationid,lm.locationname,om.orderid,om.billno,lm.gstno,im.hsnseccode, io.formatid, bm.brandname,
                            DATE_FORMAT(om.orderdate, '%d-%b-%y %h:%I:%p') orderdate,
                            om.ordertype AS ordertypeid,otm.ordertype,
                            opd.productid,im.itemname, ROUND(CAST(opd.quantity AS CHAR), 2) quantity,
                            ROUND(CAST(opd.price AS CHAR), 2) price,ROUND(CAST(opd.totaltaxamount AS CHAR), 2) totaltaxamount,
                            ROUND(CAST(om.taxableamount AS CHAR), 2) taxableamount,ROUND(CAST(om.discountamount AS CHAR), 2) discountamount,
                            ROUND(CAST(om.roundoff AS CHAR), 2) roundoff,
                            ROUND(CAST(om.grandtotal AS CHAR), 2) grandtotal,ROUND(CAST(opd.totalamount AS CHAR), 2) totalamount,ROUND(CAST(om.amount AS CHAR), 2) amount,
                            cm.id as customerid,cm.name,cm.phoneno,cmp.companyname,lm.address, lm.contactno , cym.cityname,
                            opd.batchid, CASE WHEN opd.batchid = '' THEN '-' WHEN opd.batchdate IS NULL THEN CONCAT(opd.batchid) ELSE CONCAT(opd.batchid, ' (', DATE_FORMAT(opd.batchdate, '%d-%m-%Y'), ')') END AS batchinfo
                            FROM orderproductdetails opd
                                LEFT JOIN ordermaster om ON opd.uniquekey=om.uniquekey AND om.isdeleted = 0
                                LEFT JOIN itemmaster im ON opd.pmuniquekey = im.uniquekey AND im.isdeleted = 0
                                LEFT JOIN brandmaster bm ON im.brandid = bm.brandid AND bm.isdeleted = 0
                                LEFT JOIN ordertypemaster otm ON om.ordertype = otm.ordertypeid AND otm.isdeleted = 0
                                LEFT JOIN locationmaster lm ON om.locationid = lm.locationid AND lm.isdeleted = 0
                                LEFT JOIN companymaster cmp ON cmp.companyid=om.companyid AND cmp.isdeleted=0
                                LEFT JOIN orderinvoice io on io.invoiceid = opd.invoiceid AND io.uniquekey = om.uniquekey
                                LEFT JOIN billnumformat bnf ON bnf.formatid = io.formatid AND bnf.isdeleted = 0
                                LEFT JOIN citymaster cym on cym.cityid = lm.cityid and cym.isdeleted = 0
                                LEFT JOIN customermaster cm ON cm.customerid=om.customerid AND om.companyid=cm.companyid
                            WHERE om.uniquekey = ? AND bnf.format_type = 3`;

            const getReceiptData = await db.getResults(query, [billId]);

            const itemdetails = {
                pesticide: [],
            };

            getReceiptData.forEach((item) => {
                const mappedItem = {
                    itemname: item.itemname,
                    hsnseccode: item.hsnseccode,
                    brandname: item.brandname,
                    batchid: item.batchid,
                    batchinfo: item.batchinfo,
                    quantity: item.quantity,
                    price: item.price,
                    totalamount: item.totalamount,
                    totaltaxamount: item.totaltaxamount,
                };
                itemdetails.pesticide.push(mappedItem);
            });

            const result = {
                locationData: locationData[0] || {},
                orderData: orderData[0] || {},
                itemdetails,
            };

            return result;
        } catch (error) {
            winston.error(`Error Retrieving pesticide ebill: ${error.message}`, {
                source: "salesReceipts.model.js",
                function: "ebillPesticide",
                error: error.message,
                code: error.code,
                errno: error.errno,
                stack: error.stack,
                billId: billId
            });
            throw error
        }
    },
};
