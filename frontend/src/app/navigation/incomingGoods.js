import TruckIcon from "assets/nav-icons/truck.svg?react";
import DocIcon from "assets/nav-icons/doc.svg?react";
import InvoiceIcon from "assets/nav-icons/invoice.svg?react";
import { NAV_TYPE_ROOT, NAV_TYPE_ITEM } from "constants/app.constant";

const ROOT = "/incoming-goods";
const path = (root, item) => `${root}${item}`;

export const incomingGoods = {
  id: "incoming-goods",
  type: NAV_TYPE_ROOT,
  path: "incoming-goods",
  title: "Incoming Goods",
  transKey: "nav.incoming-goods.incoming-goods",
  Icon: TruckIcon,
  childs: [
    {
      id: "incoming-goods.delivery-receipt",
      type: NAV_TYPE_ITEM,
      path: path(ROOT, "/delivery-receipt"),
      title: "Delivery Receipt",
      transKey: "nav.incoming-goods.delivery-receipt",
      Icon: DocIcon,
    },
    {
      id: "incoming-goods.grn",
      type: NAV_TYPE_ITEM,
      path: path(ROOT, "/grn"),
      title: "GRN",
      transKey: "nav.incoming-goods.grn",
      Icon: DocIcon,
    },
    {
      id: "incoming-goods.credit-notes-received",
      type: NAV_TYPE_ITEM,
      path: path(ROOT, "/credit-notes-received"),
      title: "Credit Notes (Received)",
      transKey: "nav.incoming-goods.credit-notes-received",
      Icon: InvoiceIcon,
    },
  ],
};
