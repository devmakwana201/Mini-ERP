import SubscriptionIcon from "assets/nav-icons/id.svg?react";
import CompanyIcon from "assets/dualicons/setting.svg?react";
import PlanIcon from "assets/nav-icons/id.svg?react";
import AddonIcon from "assets/nav-icons/id.svg?react";
import ParticularIcon from "assets/nav-icons/id.svg?react";
import {
  NAV_TYPE_ROOT,
  NAV_TYPE_ITEM,
} from "constants/app.constant";

const ROOT_SUBSCRIPTION = "/subscription-management";

const path = (root, item) => `${root}${item}`;

export const subscriptionManagement = {
  id: "subscription-management",
  type: NAV_TYPE_ROOT,
  path: "subscription-management",
  title: "Subscription Management",
  transKey: "nav.subscription-management.subscription-management",
  Icon: SubscriptionIcon,
  childs: [
    {
      id: "subscription-management.companies",
      type: NAV_TYPE_ITEM,
      path: path(ROOT_SUBSCRIPTION, "/companies"),
      title: "Companies Management",
      transKey: "nav.subscription-management.companies-management",
      Icon: CompanyIcon,
    },
    {
      id: "subscription-management.plans",
      type: NAV_TYPE_ITEM,
      path: path(ROOT_SUBSCRIPTION, "/plans"),
      title: "Plans Management",
      transKey: "nav.subscription-management.plans-management",
      Icon: PlanIcon,
    },
    {
      id: "subscription-management.addons",
      type: NAV_TYPE_ITEM,
      path: path(ROOT_SUBSCRIPTION, "/addons"),
      title: "Addons Management",
      transKey: "nav.subscription-management.addons-management",
      Icon: AddonIcon,
    },
    {
      id: "subscription-management.particulars",
      type: NAV_TYPE_ITEM,
      path: path(ROOT_SUBSCRIPTION, "/particulars"),
      title: "Particulars Management",
      transKey: "nav.subscription-management.particulars-management",
      Icon: ParticularIcon,
    },
    {
      id: "subscription-management.company-addons",
      type: NAV_TYPE_ITEM,
      path: path(ROOT_SUBSCRIPTION, "/company-addons"),
      title: "Company Addons",
      transKey: "nav.subscription-management.company-addons",
      Icon: AddonIcon,
    },
  ],
};