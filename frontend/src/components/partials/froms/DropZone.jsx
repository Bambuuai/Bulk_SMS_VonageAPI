import React, { useState } from "react";
import { useDropzone } from "react-dropzone";
import ProgressBar from "@/components/ui/ProgressBar";

const DropZone = ({ loading=False, onFilesSelected }) => {
  const [files, setFiles] = useState([]);
  const { getRootProps, getInputProps, isDragAccept } = useDropzone({
    accept: {
      "text/csv": [".csv"],
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      const mappedFiles = acceptedFiles.map((file) =>
        Object.assign(file, {
          preview: URL.createObjectURL(file),
        })
      )
      // setFiles(mappedFiles);
      onFilesSelected(mappedFiles[0]);
    },
  });
  return (
    <div>
      <div className="text-center rounded-md flex flex-col justify-center items-center cursor-pointer">
        {!loading && (
          <div {...getRootProps({ className: "dropzone w-full py-[52px] border-dashed border border-secondary-500" })}>
            <input className="hidden" {...getInputProps()} />
            <img
              src="/assets/images/svg/upload.svg"
              alt=""
              className="mx-auto mb-4"
            />
            {isDragAccept ? (
              <p className="text-sm text-slate-500 dark:text-slate-300 ">
                Drop the files here ...
              </p>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-300 f">
                Drop files here or click to upload.
              </p>
            )}
          </div>
        )}
        <div className="w-full flex space-x-4">
          {
            loading ? (
              <div className="w-full">
                {/* <p className="text-sm text-slate-500 dark:text-slate-300 mb-4">Extracting Fields...</p> */}
                <ProgressBar
                  value={100}
                  className="bg-slate-900 w-full "
                  striped
                  backClass="h-3 rounded-[999px]"
                  animate
                />
              </div>
            ) : ""
          }
          {/* {files.map((file, i) => (
            <div key={i} className="mb-4 flex-none">
              <div className="h-[300px] w-[300px] mx-auto mt-6 rounded-md">
                <img
                  src={file.preview}
                  alt=""
                  className=" object-contain h-full w-full block rounded-md"
                  onLoad={() => {
                    URL.revokeObjectURL(file.preview);
                  }}
                />
              </div>
            </div>
          ))} */}
        </div>
      </div>
    </div>
  );
};

export default DropZone;
