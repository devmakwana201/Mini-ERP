import IdIcon from "assets/nav-icons/id.svg?react";
import GeneralConfigIcon from "assets/dualicons/setting.svg?react";
import {
  NAV_TYPE_ROOT,
  NAV_TYPE_ITEM,
  NAV_TYPE_COLLAPSE,
} from "constants/app.constant";

const ROOT_FORMS = "/general-configurations";

const path = (root, item) => `${root}${item}`;

export const generalConfigurations = {
  id: "general-configurations",
  type: NAV_TYPE_ROOT,
  path: "general-configurations",
  title: "General Configurations",
  transKey: "nav.general-configurations.general-configurations",
  Icon: GeneralConfigIcon,
  childs: [
    {
      id: "general-configurations.serialkey-management",
      type: NAV_TYPE_COLLAPSE,
      path: path(ROOT_FORMS, "/serialkey"),
      title: "Serialkey Management",
      transKey: "nav.general-configurations.serialkey-management",
      Icon: IdIcon,
      childs: [
        {
          id: "general-configurations.generete-key",
          type: NAV_TYPE_ITEM,
          path: path(ROOT_FORMS, "/serialkey/generate-key"),
          title: "Generate key",
          transKey: "nav.general-configurations.generate-key",
        },
        {
          id: "general-configurations.report",
          type: NAV_TYPE_ITEM,
          path: path(ROOT_FORMS, "/serialkey/report"),
          title: "Report",
          transKey: "nav.general-configurations.report",
        },
      ],
    },
  ],
};
