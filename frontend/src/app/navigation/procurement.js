import ProcurementIcon from "assets/dualicons/components.svg?react";
import PurchaseOrderIcon from "assets/nav-icons/doc.svg?react";
import CreatePoIcon from "assets/nav-icons/document-add.svg?react";
import { NAV_TYPE_ROOT, NAV_TYPE_ITEM } from "constants/app.constant";

const ROOT_PROCUREMENT = "/procurement";

const path = (root, item) => `${root}${item}`;

export const procurement = {
  id: "procurement",
  type: NAV_TYPE_ROOT,
  path: "procurement",
  title: "Procurement",
  transKey: "nav.procurement.procurement",
  Icon: ProcurementIcon,
  childs: [
    {
      id: "procurement.purchase-order",
      type: NAV_TYPE_ITEM,
      path: path(ROOT_PROCUREMENT, "/purchase-order"),
      title: "Purchase Order",
      transKey: "nav.procurement.purchase-order",
      Icon: PurchaseOrderIcon,
    },
    {
      id: "procurement.create-po",
      type: NAV_TYPE_ITEM,
      path: path(ROOT_PROCUREMENT, "/create-po"),
      title: "Create PO",
      transKey: "nav.procurement.create-po",
      Icon: CreatePoIcon,
    },
  ],
};
