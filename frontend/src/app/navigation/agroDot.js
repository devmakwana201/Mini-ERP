import DotIcon from "assets/dualicons/applications.svg?react";
import IssueIcon from "assets/nav-icons/error.svg?react";
import CreditNoteIcon from "assets/nav-icons/document-add.svg?react";
import {
  NAV_TYPE_ROOT,
  NAV_TYPE_ITEM,
  NAV_TYPE_COLLAPSE,
} from "constants/app.constant";
import { Cog6ToothIcon, TagIcon, TruckIcon } from "@heroicons/react/24/outline";
import AgroDotIcon from "assets/nav-icons/truck.svg?react";

const ROOT_AGRO_DOT = "/agro-dot";

const path = (root, item) => `${root}${item}`;

export const agroDot = {
  id: "agro-dot",
  type: NAV_TYPE_ROOT,
  path: "agro-dot",
  title: "Agro Dot",
  transKey: "nav.agro-dot.agro-dot",
  Icon: DotIcon,
  childs: [
    {
      id: "agro-dot.customer-issues",
      type: NAV_TYPE_COLLAPSE,
      path: path(ROOT_AGRO_DOT, "/customer-issues"),
      title: "Customer Issues",
      transKey: "nav.agro-dot.customer-issues",
      Icon: IssueIcon,
      childs: [
        {
          id: "agro-dot.grn-issues",
          type: NAV_TYPE_ITEM,
          path: path(ROOT_AGRO_DOT, "/customer-issues/grn-issues"),
          title: "GRN Issues",
          transKey: "nav.agro-dot.grn-issues",
          Icon: IssueIcon,
        },
        {
          id: "agro-dot.credit-notes",
          type: NAV_TYPE_ITEM,
          path: path(ROOT_AGRO_DOT, "/customer-issues/credit-notes"),
          title: "Credit Notes",
          transKey: "nav.agro-dot.credit-notes",
          Icon: CreditNoteIcon,
        },
        {
      id: "agro-dot.dispatch",
      type: NAV_TYPE_ITEM,
      path: path(ROOT_AGRO_DOT, "/dispatch"),
      title: "Dispatch",
      transKey: "nav.agroDot.dispatch",
      Icon: TruckIcon,
    },
    {
      id: "agro-dot.offers",
      type: NAV_TYPE_ITEM,
      path: path(ROOT_AGRO_DOT, "/offers"),
      title: "Offer / Scheme",
      transKey: "nav.agroDot.offers",
      Icon: TagIcon,
    },
    {
      id: "agro-dot.price-policy",
      type: NAV_TYPE_ITEM,
      path: path(ROOT_AGRO_DOT, "/price-policy"),
      title: "Price Policy",
      transKey: "nav.agroDot.price-policy",
      Icon: Cog6ToothIcon,
    }
      ],
    },
  ],
};
