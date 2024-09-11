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

const dateFormatingOptions = {
  weekday: 'short', // "Fri"
  year: 'numeric',  // "2024"
  month: 'short',   // "Aug"
  day: '2-digit',   // "30"
  hour: 'numeric',  // "2"
  minute: '2-digit', // "44"
  hour12: true,     // "PM"
};

const QueueList = ({ queues, editQueue, editing }) => {
  const dispatch = useDispatch();
  const router = useRouter();

  const COLUMNS = useMemo(() => [
    {
      Header: "Campaign Name",
      accessor: "campaign.name",
      Cell: (row) => {
        return <span className="font-medium capitalize">{row?.cell?.value}</span>;
      },
    },
    {
      Header: "Current Batch",
      accessor: "current_batch",
      Cell: (row) => {
        return <div>{row?.cell?.value}</div>;
      },
    },
    {
      Header: "Total Batches",
      accessor: "total_batches",
      Cell: (row) => {
        return <div>{row?.cell?.value}</div>;
      },
    },
    {
      Header: "Status",
      accessor: "status",
      Cell: (row) => {
        const status_map = {
          scheduled: "bg-primary-600 text-primary-600",
          in_progress: "bg-info-600 text-info-600",
          paused: "bg-secondary-600 text-secondary-600",
          completed: "bg-success-600 text-success-600",
          cancelled: "bg-danger-700 text-danger-700",
          failed: "bg-danger-600 text-danger-600"
        }
        return (
          <div className="flex space-x-3 items-center text-left rtl:space-x-reverse">
            <div className="flex-1 font-medium text-sm leading-4 whitespace-nowrap">
              <div className="space-x-2">
                <Badge
                  label={row?.cell?.value?.replaceAll("_", " ")}
                  className={`${status_map[row?.cell?.value]} bg-opacity-[0.12]`}
                />
              </div>
            </div>
          </div>
        );
      },
    },
    {
      Header: "Created At",
      // Display "Started At" instead, and retrieve the schedule now/schedule time from the DB.
      accessor: "created_at",
      Cell: ({ row, cell }) => {
        console.log(cell?.value, row)
        const field_value = cell?.value ? row?.original?.created_at : row?.original?.schedule_time
        const date = new Date(field_value)

        const formattedDate = date.toLocaleString('en-US', dateFormatingOptions);
        return <div>{ formattedDate }</div>;
      },
    },
    {
      Header: "Action",
      accessor: "action",
      Cell: ({ row }) => {
        return (
          <div className="flex space-x-3 rtl:space-x-reverse">
            {
              ["in_progress", "scheduled"].includes(row?.original?.status) ? (
              <Tooltip content="Pause" placement="top" arrow animation="shift-away" theme="secondary">
                <button className="w-6 h-6" type="button" onClick={() => editQueue(row?.original?._id, "paused")}>
                  <Icon icon="heroicons-solid:pause" className="text-secondary-500" width={26} />
                </button>
              </Tooltip>
              ) : ""
            }
            { 
              ["paused", "scheduled"].includes(row?.original?.status) ? (
              <Tooltip content={row?.original?.status === "paused" ? "Resume" : "Start"} placement="top" arrow animation="shift-away" theme="primary">
                <button className="w-6 h-6" type="button" onClick={() => editQueue(row?.original?._id, "in_progress")}>
                  <Icon icon="fluent:play-circle-20-filled" className="text-primary-500" width={26} />
                </button>
              </Tooltip>
              ) : ""
            }
            {
              ["in_progress", "scheduled"].includes(row?.original?.status) ? (
                <Tooltip
                  content="Cancel"
                  placement="top"
                  arrow
                  animation="shift-away"
                  theme="danger"
                >
                  <button className="w-6 h-6" type="button" onClick={() => editQueue(row?.original?._id, "cancelled")}>
                    <Icon icon="fluent:dismiss-square-20-filled" className="text-danger-400" width={26} />
                  </button>
                </Tooltip>
              ) : ""
            }
          </div>
        );
      },
    },
  ], [editQueue]);

  const columns = useMemo(() => COLUMNS, [COLUMNS]);
  const data = useMemo(() => queues, [queues]);

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
          <h4 className="card-title">Campaign Queues</h4>
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
                    return (
                      <tr
                        key={`ex-tr2-${row.id}`}
                        {...row.getRowProps()}
                        className={`even:bg-slate-100 dark:even:bg-slate-700 opacity-100 duration-300 ease-in-out ${editing.includes(row?.original?._id) ? "opacity-40 ease-in-out pointer-events-none pulse-custom" : ""}`}
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

export default QueueList;
