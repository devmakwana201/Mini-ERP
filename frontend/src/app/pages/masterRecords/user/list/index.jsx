import { Page } from "components/shared/Page";
import { Toast } from "primereact/toast";
import { useCallback, useEffect, useRef, useState } from "react";
import { UserService } from "services/master-records/users";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { Button } from "primereact/button";
import { useNavigate } from "react-router";
import { Dialog } from "primereact/dialog";
import { Skeleton } from "primereact/skeleton";
import { FilterMatchMode, FilterOperator } from "primereact/api";
import { OverlayPanel } from "primereact/overlaypanel";
import EmptyMessage from "components/shared/EmptyMessage";

export default function UserList() {
  const toast = useRef(null);
  const navigate = useNavigate();
  const [userList, setUserList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const actionOverlayRef = useRef(null);
  const [selectedRow, setSelectedRow] = useState(null);

  // Delete states
  const [deleteUserDialog, setDeleteUserDialog] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState(null);

  const [deleteLoading, setDeleteLoading] = useState(false);

  const [lazyParams, setLazyParams] = useState({
    first: 0,
    rows: 10,
    sortField: null,
    sortOrder: null,
  });

  const [totalRecords, setTotalRecords] = useState(0);

  const [filters, setFilters] = useState({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    username: { value: null, matchMode: FilterMatchMode.CONTAINS },
    firstname: { value: null, matchMode: FilterMatchMode.CONTAINS },
    lastname: { value: null, matchMode: FilterMatchMode.CONTAINS },
    email: { value: null, matchMode: FilterMatchMode.CONTAINS },
  });

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);

    const data = await UserService.getFormattedUsers({
      filters,
      start: lazyParams.first,
      length: lazyParams.rows,
      sortField: lazyParams.sortField,
      sortOrder: lazyParams.sortOrder === 1 ? "asc" : "desc",
    });

    setUserList(data.data);
    setTotalRecords(data.totalRecords);
    setIsLoading(false);
  }, [filters, lazyParams]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchUsers();
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [filters, fetchUsers]);

  useEffect(() => {
    const sessionState = sessionStorage.getItem("userTableFilters");
    if (sessionState) {
      const parsed = JSON.parse(sessionState);

      if (parsed.sortField !== undefined && parsed.sortOrder !== undefined) {
        setLazyParams((prev) => ({
          ...prev,
          sortField: parsed.sortField,
          sortOrder: parsed.sortOrder,
        }));
      }
    }
  }, []);

  const blankRow = {
    username: "",
    firstname: "",
    lastname: "",
    email: "",
  };

  const onGlobalFilterChange = (e) => {
    const value = e.target.value;
    const updatedFilters = {
      ...filters,
      global: { ...filters.global, value },
    };
    setFilters(updatedFilters);
    // sessionStorage.setItem("userTableFilters", JSON.stringify(updatedFilters));
  };

  const renderHeader = () => (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
      <h3 className="text-sm font-semibold sm:text-base lg:text-lg">
        User List
      </h3>

      <div className="flex w-full flex-row items-center gap-2 sm:w-auto">
        <IconField iconPosition="left" className="flex-1">
          <InputIcon className="pi pi-search" />
          <InputText
            type="search"
            value={filters.global?.value || ""}
            onChange={onGlobalFilterChange}
            placeholder="Keyword Search"
            className="w-full"
          />
        </IconField>

        <Button
          label="Add"
          icon="pi pi-plus"
          className="p-button-sm"
          onClick={() => {
            navigate("/master-records/user");
          }}
        />
      </div>
    </div>
  );

  const editUser = (rowData) => {
    navigate(`/master-records/user/${rowData.userid}`);
  };

  const confirmDeleteUser = (rowData) => {
    setDeleteUserDialog(true);
    setDeleteUserId(rowData.userid);
  };

  const hideDeleteUserDialog = () => {
    setDeleteUserDialog(false);
  };

  const handleDeleteUser = async (userId) => {
    setDeleteLoading(true); // Start loading
    try {
      const res = await UserService.deleteUser(userId);
      if (res.success === 1) {
        toast.current.show({
          severity: "success",
          summary: "Success",
          detail: res.msg || "Operation completed successfully",
          life: 3000,
        });
        hideDeleteUserDialog();
        fetchUsers();
      } else {
        toast.current.show({
          severity: "error",
          summary: "Error",
          detail:
            res.error?.details?.[0]?.message ||
            res.msg ||
            "Failed to delete user.",
          life: 3000,
        });
      }
    } catch (error) {
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: error?.msg || "Unexpected error occurred.",
        life: 3000,
      });
    } finally {
      setDeleteLoading(false); // Stop loading
    }
  };

  const deleteUser = async () => {
    try {
      await handleDeleteUser(deleteUserId);
    } catch (error) {
      console.error("Error deleting user:", error);
    }
  };

  const deleteUserDialogFooter = (
    <>
      <Button
        label="No"
        icon="pi pi-times"
        style={{ marginRight: "1rem" }}
        outlined
        onClick={hideDeleteUserDialog}
        disabled={deleteLoading}
      />
      <Button
        label={deleteLoading ? "Deleting" : "Yes"}
        icon={deleteLoading ? "pi pi-spin pi-spinner" : "pi pi-check"}
        severity="danger"
        onClick={deleteUser}
        disabled={deleteLoading}
      />
    </>
  );

  const menuBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton shape="circle" size="2.5rem" />
    ) : (
      <Button
        icon="pi pi-ellipsis-v"
        className="h-[2.5rem] w-[2.5rem]"
        rounded
        text
        aria-label="More Options"
        onClick={(e) => {
          setSelectedRow(rowData);
          actionOverlayRef.current.toggle(e);
        }}
      />
    );
  };

  const userNameBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="40%" height="1.5rem" />
    ) : (
      <span>{rowData.username}</span>
    );
  };

  const firstNameBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="40%" height="1.5rem" />
    ) : (
      <span>{rowData.firstname}</span>
    );
  };

  const lastNameBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="40%" height="1.5rem" />
    ) : (
      <span>{rowData.lastname}</span>
    );
  };

  const emailBodyTemplate = (rowData) => {
    return isLoading ? (
      <Skeleton width="40%" height="1.5rem" />
    ) : (
      <span>{rowData.email}</span>
    );
  };

  return (
    <Page title="User List">
      <Toast ref={toast} />
      <div className="w-full px-(--margin-x) pt-5 lg:pt-6">
        <div className="grid grid-cols-12 gap-4 sm:gap-5 lg:gap-6">
          <div className="col-span-12">
            <div className="prime-card">
              <DataTable
                value={
                  isLoading
                    ? Array.from({ length: 10 }, () => blankRow)
                    : userList
                }
                className="broder-gray-300 overflow-hidden rounded-lg border"
                header={renderHeader()}
                emptyMessage={
                  <EmptyMessage
                    title="No users found"
                    subtitle="No users match your current filters. Try adjusting your search criteria."
                  />
                }
                paginator
                lazy
                filterDisplay="row"
                filterDelay={0}
                filters={filters}
                globalFilterFields={[
                  "username",
                  "firstname",
                  "lastname",
                  "email",
                ]}
                onFilter={(e) => {
                  setIsLoading(true);
                  setFilters(e.filters);
                  // sessionStorage.setItem(
                  //   "userTableFilters",
                  //   JSON.stringify(e.filters),
                  // );
                  setLazyParams((prev) => ({ ...prev, first: 0 }));
                }}
                onPage={(e) => {
                  setIsLoading(true);
                  setLazyParams((prev) => ({
                    ...prev,
                    first: e.first,
                    rows: e.rows,
                  }));
                }}
                onSort={(e) => {
                  setIsLoading(true);
                  setLazyParams((prev) => ({
                    ...prev,
                    sortField: e.sortField,
                    sortOrder: e.sortOrder,
                  }));
                }}
                stateStorage="session"
                stateKey="userTableFilters"
                rows={lazyParams.rows}
                first={lazyParams.first}
                totalRecords={totalRecords}
                sortField={lazyParams.sortField}
                sortOrder={lazyParams.sortOrder}
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries"
                rowsPerPageOptions={[10, 25, 50]}
                tableStyle={{ minWidth: "50rem" }}
                removableSort
              >
                <Column
                  header="Action"
                  body={menuBodyTemplate}
                  style={{ width: "3rem" }}
                />
                <Column
                  header="Sr No."
                  body={(rowData, options) =>
                    isLoading ? (
                      <Skeleton width="20%" height="1.5rem" />
                    ) : (
                      options.rowIndex + 1
                    )
                  }
                  style={{ minWidth: "5rem" }}
                />
                <Column
                  field="username"
                  header="User Name"
                  style={{ minWidth: "10rem" }}
                  body={userNameBodyTemplate}
                  filter
                  showFilterMenu={false}
                  filterPlaceholder="Search Username"
                  sortable
                />
                <Column
                  field="firstname"
                  header="First Name"
                  style={{ minWidth: "10rem" }}
                  body={firstNameBodyTemplate}
                  filter
                  showFilterMenu={false}
                  filterPlaceholder="Search Firstname"
                  sortable
                />
                <Column
                  field="lastname"
                  header="Last Name"
                  style={{ minWidth: "10rem" }}
                  body={lastNameBodyTemplate}
                  filter
                  showFilterMenu={false}
                  filterPlaceholder="Search Lastname"
                  sortable
                />
                <Column
                  field="email"
                  header="Email"
                  style={{ minWidth: "10rem" }}
                  body={emailBodyTemplate}
                  filter
                  showFilterMenu={false}
                  filterPlaceholder="Search Email"
                  sortable
                />

                {/* <Column header="Action" body={actionBodyTemplate} /> */}
              </DataTable>

              <OverlayPanel ref={actionOverlayRef}>
                <div className="flex gap-2">
                  <Button
                    icon="pi pi-pencil"
                    rounded
                    outlined
                    className="p-0 text-xs"
                    style={{
                      fontSize: "0.7rem",
                      width: "2.5rem",
                      height: "2.5rem",
                    }}
                    onClick={() => {
                      editUser(selectedRow);
                      actionOverlayRef.current.hide();
                    }}
                  />
                  <Button
                    icon="pi pi-trash"
                    rounded
                    outlined
                    severity="danger"
                    className="p-0 text-xs"
                    style={{
                      fontSize: "0.7rem",
                      width: "2.5rem",
                      height: "2.5rem",
                    }}
                    onClick={() => {
                      confirmDeleteUser(selectedRow);
                      actionOverlayRef.current.hide();
                    }}
                  />
                </div>
              </OverlayPanel>

              {/* Delete Dialog */}
              <Dialog
                visible={deleteUserDialog}
                style={{ width: "32rem" }}
                breakpoints={{ "960px": "75vw", "641px": "90vw" }}
                header="Confirm"
                modal
                footer={deleteUserDialogFooter}
                onHide={hideDeleteUserDialog}
                blockScroll={true}
                draggable={false}
                resizable={false}
                dismissableMask
              >
                <div className="confirmation-content flex items-center">
                  <i
                    className="pi pi-exclamation-triangle mr-3"
                    style={{ fontSize: "2rem" }}
                  />
                  {/* {portion && ( */}
                  <span>Are you sure you want to delete ?</span>
                  {/* )} */}
                </div>
              </Dialog>
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}
