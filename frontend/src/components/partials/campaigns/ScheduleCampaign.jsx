import React, { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import notify from "@/app/notify";
import { USER_ENDPOINTS } from "@/constant/endpoints"
import axios from "@/configs/axios-config";
import Flatpickr from "react-flatpickr";


const ScheduleCampaign = ({ campaignToSchedule, setCampaignToSchedule }) => {
  const [isDisabled, setIsDisabled] = useState(campaignToSchedule?.disabled)
  const [isLoading, setIsLoading] = useState(false)
  const [scheduleTime, setScheduleTime] = useState();

  // useEffect(() => {
  //   if (campaignToSchedule) {
  //     setIsDisabled(campaignToSchedule?.disabled)
  //     console.log(campaignToSchedule)
  //   }
  // }, [campaignToSchedule])

  const onSubmit = (e) => {
    e.preventDefault()
    setIsLoading(true)

    const body = {
      campaign_ids: [campaignToSchedule._id],
      start_times: [scheduleTime],
    }
    console.log(body)
    axios.post(USER_ENDPOINTS.ADD_CAMPAIGN_TO_QUEUE, body).then(({ data }) => {
      console.log(data)
      if (data.success) {
        setCampaignToSchedule(false);
        notify.success(`Campaign scheduled successfully`);
      }
    }).finally(() => {
      setIsLoading(false)
    })
  };

  return (
    <Modal
      title={`Schedule Campaign`}
      activeModal={Boolean(campaignToSchedule)}
      onClose={() => setCampaignToSchedule(false)}
      centered
    >
      <form onSubmit={onSubmit} className="space-y-4 ">
        <div>
          <label className="form-label normal-case">
            When should the campaign begin?
          </label>
          <div className="relative schedule-time">
            <Flatpickr
                className="form-control py-2"
                placeholder="Select date & time to begin campaign..."
                name="schedule_time"
                options={{
                  // altInput: true,
                  enableTime: true,
                  dateFormat: "F j, Y H:i",
                  // dateFormat: "Y-m-d",
                  time_24hr: true,
                  minDate: "today",
                  allowInput: false
                }}
                value={scheduleTime}
                onChange={(date) => setScheduleTime(date[0])}
            />
          </div>
        </div>

        <div className="ltr:text-right rtl:text-left !mt-6">
          <Button text="Schedule" type="submit" className="btn btn-dark w-full text-center" isLoading={isLoading}/>
        </div>
      </form>
    </Modal>
  );
};

export default ScheduleCampaign;
