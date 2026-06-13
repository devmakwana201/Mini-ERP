import { NAV_TYPE_ITEM, } from "constants/app.constant";
import DashboardsIcon from 'assets/dualicons/dashboards.svg?react'
import MasterIcon from 'assets/dualicons/prototypes.svg?react'

export const baseNavigation = [
    {
        id: 'dashboards',
        type: NAV_TYPE_ITEM,
        path: '/dashboards',
        title: 'Dashboards',
        transKey: 'nav.dashboards.dashboards',
        Icon: DashboardsIcon,
    },
    {
        id: 'master-records',
        type: NAV_TYPE_ITEM,
        path: '/master-records/user-list',
        title: 'Master Records',
        transKey: 'nav.master-records.master-records',
        Icon: MasterIcon,
    },
]