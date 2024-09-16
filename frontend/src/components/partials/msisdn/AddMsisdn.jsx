import React, {useCallback, useEffect, useRef, useState} from "react";
import Select, { components } from "react-select";
import Modal from "@/components/ui/Modal";
import { useSelector, useDispatch } from "react-redux";
import { toggleAddModal, pushMsisdn } from "./store";
import Textinput from "@/components/ui/Textinput";
import Textarea from "@/components/ui/Textarea";
import Flatpickr from "react-flatpickr";
import TableLoading from "@/components/skeleton/Table"
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { v4 as uuidv4 } from "uuid";

import FormGroup from "@/components/ui/FormGroup";
import { ADMIN_ENDPOINTS } from "@/constant/endpoints";
import axios from "@/configs/axios-config";
import AvailableMsisdn from "./AvailableMsisdn";
import notify from "@/app/notify";


const AddMsisdn = ({ open, toggleAddModal, updateNumbers }) => {
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(true);
  const [available, setAvailable] = useState(Array(10).fill({}))
  const [purchasingNumbers, setPurchasingNumbers] = useState([]);
  // const [size, setSize] = useState(10)
  //   const [page, setPage] = useState(1)
    const [count, setCount] = useState(7)
    const fetchIdRef = useRef(0)

  const getNumbers = useCallback((page, size) => {
      const fetchId = ++fetchIdRef.current
      console.log(fetchId, fetchIdRef)

      if (fetchId === fetchIdRef.current) {
          setIsLoading(true)
          axios.get(ADMIN_ENDPOINTS.SEARCH_NUMBERS, { params: {size, page: page} }).then(({ data }) => {
              setCount(Math.ceil(data.count / size))
              setAvailable(data.numbers)
          }).finally(() => setIsLoading(false))
      }
  }, [])

  // useEffect(() => {
  //   if (open) {
  //       getNumbers(0, 10)
  //   }
  // }, [open, getNumbers])

  function purchaseNumber(number) {
    setPurchasingNumbers(former => [...former, number.msisdn])
    console.log(number)
    axios.post(ADMIN_ENDPOINTS.BUY_NUMBER, number).then(({ data }) => {
        if (data.success) {
            setAvailable(former => former.filter(f_number => f_number.msisdn != number.msisdn))
            updateNumbers(number)
            notify.success(`${number.msisdn} purchased successfully`)
        }
    }).finally(() => setPurchasingNumbers(former => former.filter(msisdn => msisdn != number.msisdn)))
  }

  // function fetchPage(page, size) {
  //     getNumbers(page, size)
  // }

  return (
    <div>
      <Modal
        title="Buy Numbers"
        labelclassName="btn-outline-dark"
        className="max-w-4xl remove-card-padding"
        activeModal={open}
        onClose={() => toggleAddModal(false)}
      >
        {/* <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 ">
          <Textinput
            name="title"
            label="Msisdn Name"
            placeholder="Msisdn Name"
            register={register}
            error={errors.title}
          />
          <div className="grid lg:grid-cols-2 gap-4 grid-cols-1">
            <FormGroup
              label="Start Date"
              id="default-picker"
              error={errors.startDate}
            >
              <Controller
                name="startDate"
                control={control}
                render={({ field }) => (
                  <Flatpickr
                    className="form-control py-2"
                    id="default-picker"
                    placeholder="yyyy, dd M"
                    value={startDate}
                    onChange={(date) => {
                      field.onChange(date);
                    }}
                    options={{
                      altInput: true,
                      altFormat: "F j, Y",
                      dateFormat: "Y-m-d",
                    }}
                  />
                )}
              />
            </FormGroup>
            <FormGroup
              label="End Date"
              id="default-picker2"
              error={errors.endDate}
            >
              <Controller
                name="endDate"
                control={control}
                render={({ field }) => (
                  <Flatpickr
                    className="form-control py-2"
                    id="default-picker2"
                    placeholder="yyyy, dd M"
                    value={endDate}
                    onChange={(date) => {
                      field.onChange(date);
                    }}
                    options={{
                      altInput: true,
                      altFormat: "F j, Y",
                      dateFormat: "Y-m-d",
                    }}
                  />
                )}
              />
            </FormGroup>
          </div>
          <div className={errors.assign ? "has-error" : ""}>
            <label className="form-label" htmlFor="icon_s">
              Assignee
            </label>
            <Controller
              name="assign"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  options={assigneeOptions}
                  styles={styles}
                  className="react-select"
                  classNamePrefix="select"
                  isMulti
                  components={{
                    Option: OptionComponent,
                  }}
                  id="icon_s"
                />
              )}
            />
            {errors.assign && (
              <div className=" mt-2  text-danger-500 block text-sm">
                {errors.assign?.message || errors.assign?.label.message}
              </div>
            )}
          </div>

          <div className={errors.tags ? "has-error" : ""}>
            <label className="form-label" htmlFor="icon_s">
              Tag
            </label>
            <Controller
              name="tags"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  options={options}
                  styles={styles}
                  className="react-select"
                  classNamePrefix="select"
                  isMulti
                  id="icon_s"
                />
              )}
            />
            {errors.assign && (
              <div className=" mt-2  text-danger-500 block text-sm">
                {errors.tags?.message || errors.tags?.label.message}
              </div>
            )}
          </div>
          <Textarea label="Description" placeholder="Description" />

          <div className="ltr:text-right rtl:text-left">
            <button className="btn btn-dark  text-center">Add</button>
          </div>
        </form> */}
        {/*{isLoading && (*/}
        {/*    <TableLoading count={10} />*/}
        {/*)}*/}
        {
            // !isLoading && (
                <div>
                    <AvailableMsisdn msisdns={available} isPurchase={true} buyNumber={purchaseNumber} isLoading={isLoading} operating={purchasingNumbers} fetchPage={getNumbers} pageCount={count} />
                </div>
            // )
        }
      </Modal>
    </div>
  );
};

export default AddMsisdn;
