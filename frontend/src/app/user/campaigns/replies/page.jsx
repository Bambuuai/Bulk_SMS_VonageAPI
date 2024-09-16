"use client";
import Card from "@/components/ui/Card";
import { useEffect, useState } from "react";
import { USER_ENDPOINTS } from "@/constant/endpoints";
import axios from "@/configs/axios-config";
import Button from "@/components/ui/Button";
import Loading from "@/components/Loading";
import SkeletionTable from "@/components/skeleton/Table";

const CampaignReplies = () => {
    const [campaigns, setCampaigns] = useState([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
      setIsLoading(true)
      axios.get(USER_ENDPOINTS.GET_CAMPAIGN_CHATS).then(({ data }) => {
        if (Array.isArray(data)) {
          setCampaigns(data)
        }
      }).finally(() => setIsLoading(false))
    }, [])

  return (
    <div className="grid grid-cols-1 gap-5 h-full">
      {
        campaigns.length ? (
          <Card title="Campaign Replies" noborder>
            <div className="overflow-x-auto -mx-6">
              <div className="inline-block min-w-full align-middle">
                <div className="overflow-hidden ">
                  <table className="min-w-full divide-y divide-slate-100 table-fixed dark:divide-slate-700">
                    <thead className="bg-slate-200 dark:bg-slate-700">
                      <tr>
                          <th scope="col" className=" table-th !px-12">
                            Campaign Name
                          </th>
                          <th scope="col" className=" table-th !px-12">
                            Sender Phone Number
                          </th>
                          <th scope="col" className=" table-th !px-12">
                            Total Replies
                          </th>
                          <th scope="col" className=" table-th !px-12">
                            Action
                          </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100 dark:bg-slate-800 dark:divide-slate-700">
                      {
                        campaigns.map((row, i) => (
                          <tr
                            key={i}
                            className="dark:hover:bg-slate-700"
                          >
                            <td className="table-td !px-12">{row.name}</td>
                            <td className="table-td !px-12">{row.sender_msisdn}</td>
                            <td className="table-td !px-12 ">{row.totalReplies}</td>
                            <td className="table-td !px-12 ">
                              <Button className="btn btn-dark" link={"replies/" + row._id}>View Chat</Button>
                            </td>
                          </tr>
                        ))
                    }
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </Card>
        ) : (
          isLoading ? (
            <Loading className="app_height-footer" />
          ) : (
            <div className="h-full flex flex-col justify-center items-center container-center">
              <img className="w-60" src="/assets/images/custom/no-replies.png" alt="Illustration showing that there are no replies" />
              <p className="mt-4 text-center font-medium">No replies available</p> 
            </div>
          )
        )}
    </div>
  );
};

export default CampaignReplies;
