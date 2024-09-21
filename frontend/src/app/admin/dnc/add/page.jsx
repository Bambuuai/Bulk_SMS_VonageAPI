"use client";

import Card from "@/components/ui/Card";
import Textinput from "@/components/ui/Textinput";
import Icon from "@/components/ui/Icon";
import Button from "@/components/ui/Button";
import { useForm, useFieldArray } from "react-hook-form";
import InputGroup from "@/components/ui/InputGroup";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import axios from "@/configs/axios-config";
import { ADMIN_ENDPOINTS } from "@/constant/endpoints"
import notify from "@/app/notify";
import { useState } from "react";
import DropZone from "@/components/partials/froms/DropZone";
import { parsePhoneNumber, isValidPhoneNumber } from "libphonenumber-js";
import {formatToVonage, verifyNumbers} from "@/utils";

// const schema = yup
//   .object({
//     name: yup.string(),
//     phone_number: yup.string().matches(/^[1-9]\d{8,14}$/, "Phone number is not valid").required("Phone number is required")
//   }).required()

const AddDNCs = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingFile, setLoadingFile] = useState(false);
  const [fileImport, setFileImport] = useState([]);
  const { register, control, handleSubmit, reset, trigger, setError, formState: { errors } } = useForm({
    defaultValues: {
        dnc: [{name: "", phone_number: ""}]
    },
    // resolver: yupResolver(schema)
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: "dnc",
  });

    function uploadFile(e) {
        e.preventDefault();
        console.log(fileImport)
        setLoadingFile(true)
        const formData = new FormData()
        formData.append("file", fileImport[0])

        axios.post(ADMIN_ENDPOINTS.IMPORT_DNC, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        }).then(({ data }) => {
            if (data.added > 0 || data.upserted > 0) {
                notify.success(`${data?.upserted + data?.added} DNCs imported successfully.`);
                setFileImport([])
            }
        })
            .catch(err => console.log(err))
            .finally(() => setLoadingFile(false))
    }

  function getInputs(file) {
    setLoadingFile(true)
    const formData = new FormData()
    formData.append("file", file)

    axios.post(ADMIN_ENDPOINTS.IMPORT_DNC, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }).then(({ data }) => {
      if (Array.isArray(data) && data.length) {
        append(data)
      }
    })
    .catch(err => console.log(err))
    .finally(() => setLoadingFile(false))
  }
  
  function onSubmit(data) {
    setIsLoading(true)
      const hasErrors = verifyNumbers(data.dnc, setError, "dnc")
      if (hasErrors) {
          setIsLoading(false)
          return;
      }
      const apiDnc = formatToVonage(data.dnc)

    axios.post(ADMIN_ENDPOINTS.ADD_DNC, apiDnc).then(response => {
        if (Array.isArray(response.data)) {
            notify.success("DNCs Added Successfully")
            reset()
        }
    }).finally(() => {
       setIsLoading(false)
    })
  }
  return (
    <div className="space-y-10">
      <Card
        title="Add DNC Numbers"
        headerslot={
          <Button
            text="Add New Number"
            icon="heroicons-outline:plus"
            className="btn-dark"
            onClick={() => append()}
            disabled={isLoading}
          />
        }
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          {fields.map((item, index) => (
            <div
              className="md:grid-cols-2 grid-cols-1 grid gap-5 mb-5 last:mb-0"
              key={index}
            >
                <div className="flex-1">
                    <InputGroup
                        label="Name"
                        type="text"
                        id={`name-${index}`}
                        placeholder="Opt-out request"
                        register={register}
                        name={`dnc[${index}].name`}
                        disabled={isLoading}
                    />
                </div>

              <div className="flex justify-between items-end space-x-5">
                <div className="flex-1">
                    <InputGroup
                        label="Phone Number"
                        type="tel"
                        id={`phone-${index}`}
                        placeholder="+2349110347359"
                        register={register}
                        name={`dnc[${index}].phone_number`}
                        error={errors?.dnc?.[index]?.phone_number}
                        disabled={isLoading}
                        required
                    />
                </div>
                <div className="flex-none relative">
                  <button
                    onClick={() => remove(index)}
                    type="button"
                    className="inline-flex items-center justify-center h-10 w-10 bg-danger-500 text-lg border rounded border-danger-500 text-white disabled:opacity-40 disabled:pointer-events-none disabled:!cursor-not-allowed"
                    disabled={isLoading}
                  >
                    <Icon icon="heroicons-outline:trash" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          <div className="ltr:text-right rtl:text-left">
            <Button type="submit" text="Submit" className="btn-dark" isLoading={isLoading} />
          </div>
        </form>
      </Card>

      <div className="xl:col-span-2 col-span-1">
          <Card title="File upload">
              <DropZone loading={loadingFile} files={fileImport} onFilesSelected={setFileImport}/>
              <div className="flex justify-end mt-4 space-x-4">
                  <Button text="Clear File" className="btn-danger" onClick={() => setFileImport([])}
                          disabled={!fileImport.length}/>
                  <Button type="submit" text="Upload DNCs" className="btn-dark" isLoading={loadingFile}
                          disabled={!fileImport.length}/>
              </div>
          </Card>
      </div>
    </div>
  );
};

export default AddDNCs;
