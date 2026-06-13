import IdIcon from "assets/nav-icons/id.svg?react";
import MasterIcon from "assets/dualicons/prototypes.svg?react";
import {
  NAV_TYPE_ROOT,
  NAV_TYPE_ITEM,
  NAV_TYPE_COLLAPSE,
} from "constants/app.constant";

const ROOT_FORMS = "/master-records";

const path = (root, item) => `${root}${item}`;

export const masterRecords = {
  id: "master-records",
  type: NAV_TYPE_ROOT,
  path: "master-records",
  title: "Master Records",
  transKey: "nav.master-records.master-records",
  Icon: MasterIcon,
  childs: [
    {
      id: "master-records.user",
      type: NAV_TYPE_ITEM,
      path: path(ROOT_FORMS, "/user-list"),
      title: "User",
      transKey: "nav.master-records.user",
      Icon: IdIcon,
    },
    {
      id: "master-records.roles",
      type: NAV_TYPE_COLLAPSE,
      path: path(ROOT_FORMS, "/roles"),
      title: "Roles",
      transKey: "nav.master-records.roles",
      Icon: IdIcon,
      childs: [
        {
          id: "master-records.role",
          type: NAV_TYPE_ITEM,
          path: path(ROOT_FORMS, "/roles/role"),
          title: "Role",
          transKey: "nav.master-records.role",
        },
        {
          id: "master-records.permission",
          type: NAV_TYPE_ITEM,
          path: path(ROOT_FORMS, "/roles/permission"),
          title: "Permission",
          transKey: "nav.master-records.permission",
        },
      ],
    },
    {
      id: "master-records.inventory-management",
      type: NAV_TYPE_COLLAPSE,
      path: path(ROOT_FORMS, "/inventory"),
      title: "Inventory Management",
      transKey: "nav.master-records.inventory-management",
      Icon: IdIcon,
      childs: [
        {
          id: "master-records.item-management",
          type: NAV_TYPE_ITEM,
          path: path(ROOT_FORMS, "/inventory/item/item-list"),
          title: "Item Management",
          transKey: "nav.master-records.item-management",
        },
        {
          id: "master-records.item-category-management",
          type: NAV_TYPE_ITEM,
          path: path(ROOT_FORMS, "/inventory/item-category/item-category-list"),
          title: "Item Category Management",
          transKey: "nav.master-records.item-category-management",
        },
        {
          id: "master-records.supplier-management",
          type: NAV_TYPE_ITEM,
          path: path(ROOT_FORMS, "/inventory/supplier/supplier-list"),
          title: "Supplier Management",
          transKey: "nav.master-records.supplier-management",
        },
        {
          id: "master-records.uom-management",
          type: NAV_TYPE_ITEM,
          path: path(ROOT_FORMS, "/inventory/uom/uom-list"),
          title: "UOM Management",
          transKey: "nav.master-records.uom-management",
        },
        {
          id: "master-records.brand-management",
          type: NAV_TYPE_ITEM,
          path: path(ROOT_FORMS, "/inventory/brand/brand-list"),
          title: "Brand Management",
          transKey: "nav.master-records.brand-management",
        },
        {
          id: "master-records.warehouse-management",
          type: NAV_TYPE_ITEM,
          path: path(ROOT_FORMS, "/inventory/warehouse/warehouse-list"),
          title: "Warehouse Management",
          transKey: "nav.master-records.warehouse-management",
        },
        {
          id: "master-records.warehouse-item-mapping",
          type: NAV_TYPE_ITEM,
          path: path(ROOT_FORMS, "/inventory/warehouse/warehouse-item-mapping"),
          title: "Warehouse Item Mapping",
          transKey: "nav.master-records.warehouse-item-mapping",
        }
      ],
    },
  ],
};
