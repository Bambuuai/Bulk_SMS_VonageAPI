import React, { useState, useMemo, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Icon from "@/components/ui/Icon";
import { toast } from "react-toastify";
import Tooltip from "@/components/ui/Tooltip";
// import { removeUser, updateUser } from "./store";
import { useRouter } from "next/navigation";
import {
  useTable,
  useRowSelect,
  useSortBy,
  useGlobalFilter,
  usePagination,
} from "react-table";
import { selectableGroups } from "@/utils"
import Button from "@/components/ui/Button";
import { parsePhoneNumberWithError } from "libphonenumber-js"
import {formatToDisplay} from "@/utils";


const MsisdnList = ({ msisdns, buyNumber, editNumber, operating, isPurchase, actions }) => {
  const dispatch = useDispatch();
  const router = useRouter();

  const COLUMNS = useMemo(() => [
    {
      Header: "Number",
      accessor: "msisdn",
      Cell: (row) => {
        return (
          <div className="flex space-x-3 items-center text-left rtl:space-x-reverse">
            <div className="flex-1 font-medium text-sm leading-4 whitespace-nowrap">
                {formatToDisplay(row?.cell?.value)}
            </div>
          </div>
        );
      },
    },
    {
      Header: "Type",
      accessor: "type",
      Cell: (row) => {
        const value_map = {
          "mobile-lvn": "Mobile",
          "landline": "Landline",
          "landline-toll-free": "Toll Free"
        } 
        return <span>{value_map[row?.cell?.value]}</span>;
      },
    },
    {
      Header: "Features",
      accessor: "features",
      Cell: (row) => {
        return (
          <div className="flex space-x-3 items-center text-left rtl:space-x-reverse">
            <div className="flex-1 font-medium text-sm leading-4 whitespace-nowrap">
              <div className="space-x-2">
                {row?.cell?.value?.map((group, index) =>
                  <Badge
                    key={index}
                    label={group}
                    className="bg-primary-500 text-primary-500 bg-opacity-[0.12]"
                  />)
                }
              </div>
            </div>
          </div>
        );
      },
    },
    {
      Header: "Linked User",
      accessor: "users",
      Cell: (row) => {
        return (
            row?.cell?.value ? row?.cell?.value.map(user => <span key={user._id}>{user.email}</span>) : <span className="opacity-50 text-sm">No user assigned</span>
            )
      },
    },
    // {
    //   Header: isPurchase ? "Cost" : "Users Linked",
    //   accessor: isPurchase ? "cost" : "users",
    //   Cell: (row) => {
    //     return (
    //       <div className="flex space-x-3 items-center text-left rtl:space-x-reverse">
    //         <div className="flex-1 font-medium text-sm leading-4 whitespace-nowrap">
    //             {isPurchase ? row?.cell?.value : row?.cell?.value?.length}
    //         </div>
    //       </div>
    //     );
    //   },
    // },
    {
      Header: "action",
      accessor: "action",
      Cell: ({ row }) => {
        if (isPurchase) {
          return (
            <div className="flex space-x-3 rtl:space-x-reverse">
              <Button className="btn btn-dark py-2.5" onClick={() => buyNumber(row?.original)}>Buy</Button>
            </div>
          );
        } else {
          return (
            <div className="flex space-x-3 rtl:space-x-reverse">
              <Button className="btn btn-dark py-2.5" onClick={() => editNumber(row?.original)}>Edit</Button>
            </div>
          )
        }
      },
    },
  ], [editNumber, isPurchase, buyNumber]);
  // const actions = [
  //   {
  //     name: "Edit",
  //     icon: "heroicons:pencil-square",
  //     doit: (item) => dispatch(updateUser(item)),
  //   },
  //   {
  //     name: "Delete",
  //     icon: "heroicons-outline:trash",
  //     doit: (item) => dispatch(removeUser(item.id)),
  //   },
  // ];

  const columns = useMemo(() => COLUMNS, [COLUMNS]);
  const data = useMemo(() => msisdns, [msisdns]);

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
      <Card className="manage-list !shadow-none" bodyClass="p-6 !pt-0" noborder>
        {/* <div className="md:flex justify-between items-center mb-6">
          <h4 className="card-title">Your Contacts</h4>
        </div> */}
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
                          className={` table-th ${isPurchase ? "border border-slate-100" : ""} `}
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
                    return (
                      <tr
                        key={`contact-${row.id}`}
                        {...row.getRowProps()}
                        className={`opacity-100 duration-300 ease-in-out ${operating.includes(row?.original?.msisdn) ? "opacity-40 ease-in-out pointer-events-none pulse-custom" : ""}`}
                      >
                        {row.cells.map((cell) => {
                          return (
                            <td
                              {...cell.getCellProps()}
                              className={`table-td ${isPurchase ?"border border-slate-100" : ""}`}
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

export default MsisdnList;