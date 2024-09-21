import React, { useState, useMemo, useEffect } from "react";
import { useDispatch } from "react-redux";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Icon from "@/components/ui/Icon";
import Tooltip from "@/components/ui/Tooltip";
import { useRouter } from "next/navigation";
import {
  useTable,
  useRowSelect,
  useSortBy,
  useGlobalFilter,
  usePagination,
} from "react-table";

const UserList = ({ users, setUserEdit, deleteUser, deleting }) => {
  const dispatch = useDispatch();
  const router = useRouter();

  const COLUMNS = useMemo(() => [
    {
      Header: "Full Name",
      accessor: "name",
      Cell: (row) => {
        return (
          <div className="flex space-x-3 items-center text-left rtl:space-x-reverse capitalize">
            <div className="flex-none">
              <div className="h-10 w-10 rounded-full text-sm bg-[#E0EAFF] dark:bg-slate-700 flex flex-col items-center justify-center font-medium -tracking-[1px]">
                {row?.cell?.value.charAt(0) +
                  row?.cell?.value.split(" ")[1].charAt(0)}
              </div>
            </div>
            <div className="flex-1 font-medium text-sm leading-4 whitespace-nowrap">
              {row?.cell?.value.length > 20
                ? row?.cell?.value.substring(0, 20) + "..."
                : row?.cell?.value}
            </div>
          </div>
        );
      },
    },
    {
      Header: "Username",
      accessor: "username",
      Cell: (row) => {
        return <span>{row?.cell?.value}</span>;
      },
    },
    {
      Header: "Email Address",
      accessor: "email",
      Cell: (row) => {
        return <div>{row?.cell?.value}</div>;
      },
    },
    // {
    //   Header: "Sender DID",
    //   accessor: "msisdn",
    //   Cell: (row) => {
    //     return <div>{row?.cell?.value}</div>;
    //   },
    // },
    {
      Header: "Company",
      accessor: "company",
      Cell: (row) => {
        return <div>{row?.cell?.value}</div>;
      },
    },
    {
      Header: "Date Created",
      accessor: "created_at",
      Cell: (row) => {
        const date = new Date(row?.cell?.value)
        return <div>{date.toDateString()}</div>;
      },
    },
    {
      Header: "Status",
      accessor: "disabled",
      Cell: (row) => {
        console.log(row?.cell?.value, row)
        return <div>{
          row?.cell?.value ? 
          <Badge label="Disabled" className="bg-danger-600 text-white pill" icon="heroicons-outline:x-mark" />
          : <Badge label="Active" className="bg-success-600 text-white pill" icon="heroicons-outline:check" />}</div>;
      },
    },
    {
      Header: "Action",
      accessor: "action",
      Cell: ({ row }) => {
        return (
          <div className="flex space-x-3 rtl:space-x-reverse">
            <Tooltip content="Edit" placement="top" arrow animation="shift-away">
              <button className="action-btn" type="button" onClick={() => setUserEdit(row?.index)}>
                <Icon icon="heroicons:pencil-square" />
              </button>
            </Tooltip>
            <Tooltip
              content="Delete"
              placement="top"
              arrow
              animation="shift-away"
              theme="danger"
              >
              <button className="action-btn" type="button" onClick={() => deleteUser(row?.original?.id)}>
                <Icon icon="heroicons:trash" />
              </button>
            </Tooltip>
          </div>
        );
      },
    },
  ], [deleteUser, setUserEdit]);

  const columns = useMemo(() => COLUMNS, [COLUMNS]);
  const data = useMemo(() => users, [users]);

  const tableInstance = useTable(
    {
      columns,
      data,
    },

    useGlobalFilter,
    useSortBy,
    usePagination,
    useRowSelect
  );
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    footerGroups,
    page,
    nextPage,
    previousPage,
    canNextPage,
    canPreviousPage,
    pageOptions,
    state,
    gotoPage,
    pageCount,
    setPageSize,
    setGlobalFilter,
    prepareRow,
  } = tableInstance;

  const { globalFilter, pageIndex, pageSize } = state;
  return (
    <>
      <Card className="manage-list">
        <div className="md:flex justify-between items-center mb-6">
          <h4 className="card-title">Your Users</h4>
        </div>
        <div className="overflow-x-auto -mx-6">
          <div className="inline-block min-w-full align-middle">
            <div className="overflow-hidden ">
              <table
                className="min-w-full divide-y divide-slate-100 table-fixed dark:divide-slate-700"
                {...getTableProps}
              >
                <thead className=" bg-slate-100 dark:bg-slate-700">
                  {headerGroups.map((headerGroup) => (
                    <tr
                      {...headerGroup.getHeaderGroupProps()}
                      key={`ex-tr-${headerGroup.id}`}
                    >
                      {headerGroup.headers.map((column) => (
                        <th
                          {...column.getHeaderProps(
                            column.getSortByToggleProps()
                          )}
                          key={`ex-th-${column.id}`}
                          scope="col"
                          className=" table-th "
                        >
                          {column.render("Header")}
                          <span>
                            {column.isSorted
                              ? column.isSortedDesc
                                ? " 🔽"
                                : " 🔼"
                              : ""}
                          </span>
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody
                  className="bg-white divide-y divide-slate-100 dark:bg-slate-800 dark:divide-slate-700"
                  {...getTableBodyProps}
                >
                  {page.map((row) => {
                    prepareRow(row);
                    // console.log("Testing: ", deleting.includes(row?.original?.id), deleting, row?.original?.id)
                    return (
                      <tr
                        key={`ex-tr2-${row.id}`}
                        {...row.getRowProps()}
                        className={`even:bg-slate-100 dark:even:bg-slate-700 opacity-100 duration-300 ease-in-out ${deleting.includes(row?.original?.id) ? "opacity-40 ease-in-out pointer-events-none pulse-custom" : ""}`}
                      >
                        {row.cells.map((cell) => {
                          return (
                            <td
                              {...cell.getCellProps()}
                              className="table-td"
                              key={`ex-td-${cell.column.id}`}
                            >
                              {cell.render("Cell")}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="md:flex md:space-y-0 space-y-5 justify-between mt-6 items-center">
          <div className=" flex items-center space-x-3 rtl:space-x-reverse">
            <span className=" flex space-x-2  rtl:space-x-reverse items-center">
              <span className=" text-sm font-medium text-slate-600 dark:text-slate-300">
                Go
              </span>
              <span>
                <input
                  type="number"
                  className=" form-control py-2"
                  defaultValue={pageIndex + 1}
                  onChange={(e) => {
                    const pageNumber = e.target.value
                      ? Number(e.target.value) - 1
                      : 0;
                    gotoPage(pageNumber);
                  }}
                  style={{ width: "50px" }}
                />
              </span>
            </span>
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
              Page{" "}
              <span>
                {pageIndex + 1} of {pageOptions.length}
              </span>
            </span>
          </div>
          <ul className="flex items-center  space-x-3  rtl:space-x-reverse">
            <li className="text-xl leading-4 text-slate-900 dark:text-white rtl:rotate-180">
              <button
                className={` ${
                  !canPreviousPage ? "opacity-50 cursor-not-allowed" : ""
                }`}
                onClick={() => previousPage()}
                disabled={!canPreviousPage}
              >
                <Icon icon="heroicons-outline:chevron-left" />
              </button>
            </li>
            {pageOptions.map((page, pageIdx) => (
              <li key={pageIdx}>
                <button
                  href="#"
                  aria-current="page"
                  className={` ${
                    pageIdx === pageIndex
                      ? "bg-slate-900 dark:bg-slate-600  dark:text-slate-200 text-white font-medium "
                      : "bg-slate-100  dark:text-slate-400 text-slate-900  font-normal "
                  }    text-sm rounded leading-[16px] flex h-6 w-6 items-center justify-center transition-all duration-150`}
                  onClick={() => gotoPage(pageIdx)}
                >
                  {page + 1}
                </button>
              </li>
            ))}
            <li className="text-xl leading-4 text-slate-900 dark:text-white rtl:rotate-180">
              <button
                className={` ${
                  !canNextPage ? "opacity-50 cursor-not-allowed" : ""
                }`}
                onClick={() => nextPage()}
                disabled={!canNextPage}
              >
                <Icon icon="heroicons-outline:chevron-right" />
              </button>
            </li>
          </ul>
        </div>
      </Card>
    </>
  );
};

export default UserList;
