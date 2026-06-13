import ApprovalIcon from "assets/nav-icons/check-double.svg?react";
import CheckIcon from "assets/nav-icons/checkbox.svg?react";
import {
  NAV_TYPE_ROOT,
  NAV_TYPE_ITEM,
} from "constants/app.constant";

const ROOT_APPROVALS = "/approvals";

const path = (root, item) => `${root}${item}`;

export const approvals = {
  id: "approvals",
  type: NAV_TYPE_ROOT,
  path: "approvals",
  title: "Approvals",
  transKey: "nav.approvals.approvals",
  Icon: ApprovalIcon,
  childs: [
    {
      id: "approvals.manage-approvals",
      type: NAV_TYPE_ITEM,
      path: ROOT_APPROVALS,
      title: "Manage Approvals",
      transKey: "nav.approvals.manage-approvals",
      Icon: CheckIcon,
    },
  ],
};
