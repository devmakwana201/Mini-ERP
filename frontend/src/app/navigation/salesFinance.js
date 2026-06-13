import { NAV_TYPE_ROOT, NAV_TYPE_ITEM } from "constants/app.constant";
import SalesOrderIcon from "assets/nav-icons/shopping-cart.svg?react";
import GenerationIcon from "assets/nav-icons/document-add.svg?react";
import DeliverIcon from "assets/nav-icons/truck.svg?react";
import IdIcon from "assets/nav-icons/id.svg?react";

const ROOT_SALES = "/sales";

const path = (root, item) => `${root}${item}`;

export const salesPanel = {
  id: "sales-panel",
  type: NAV_TYPE_ROOT,
  path: ROOT_SALES,
  title: "Sales",
  transKey: "nav.sales-panel.sales",
  Icon: SalesOrderIcon,
  childs: [
    {
      id: "sales-order.direct-generation",
      type: NAV_TYPE_ITEM,
      path: path(ROOT_SALES, "/direct-generation"),
      title: "Direct SO Generation",
      transKey: "nav.sales-order.direct-generation",
      Icon: GenerationIcon,
    },
    {
      id: "sales-order.po-generation",
      type: NAV_TYPE_ITEM,
      path: path(ROOT_SALES, "/po-generation"),
      title: "From PO Generation",
      transKey: "nav.sales-order.po-generation",
      Icon: GenerationIcon,
    },
    {
      id: "sales-order.deliver-products",
      type: NAV_TYPE_ITEM,
      path: path(ROOT_SALES, "/deliver-products"),
      title: "Deliver Products",
      transKey: "nav.sales-order.deliver-products",
      Icon: DeliverIcon,
    },
    {
      id: "sales-panel.invoice",
      type: NAV_TYPE_ITEM,
      path: path(ROOT_SALES, "/invoice"),
      title: "Invoice",
      transKey: "nav.sales-panel.invoice",
      Icon: IdIcon,
    },
  ],
};
