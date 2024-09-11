"use client";

import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import UserList from "@/components/partials/users/UserList";
import TableLoading from "@/components/skeleton/Table";
import EditUser from "@/components/partials/users/EditUser";
import axios from "@/configs/axios-config";
import { ADMIN_ENDPOINTS } from "@/constant/endpoints";
import notify from "@/app/notify";

const ManageUsersPage = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const dispatch = useDispatch();
  const [users, setUsers] = useState([])
  const [tableUsers, setTableUsers] = useState([])
  const [userEdit, setUserEdit] = useState(false)
  const [deleting, setDeleting] = useState([])

  useEffect(() => {
    axios.get(ADMIN_ENDPOINTS.GET_USERS).then(({ data }) => {
        if (Array.isArray(data)) {
            setUsers(data)
        }
    }).catch(err => console.log(err))
      .finally(() => setIsLoaded(true))
  }, []);

  useEffect(() => {
    console.log(userEdit)
  }, [userEdit])

  useEffect(() => {
    const modifiedData = users.map(user => ({
      id: user._id,
      name: `${user.first_name} ${user.last_name}`,
      username: user.username,
      company: user.company,
      email: user.email,
      numbers: user.numbers,
      created_at: user.created_at,
      disabled: user.disabled
  }))
    setTableUsers(modifiedData)
  }, [users])

  function updateLocalUser(newData) {
    const newList = [...users]
    newList[userEdit] = newData
    // const userIndex = newList.findIndex(user => user._id === newData._id)
    console.log(newList)
    setUsers(newList)
  }

  function deleteUser(id) {
    console.log("DElete it", id)
    setDeleting(former => [...former, id])
    const body = {user_ids: [id]}
    console.log(body)
    axios.delete(ADMIN_ENDPOINTS.DELETE_USERS, {data: [id]}).then(({ data }) => {
      if (data.success) {
        notify.success("User deleted")
        setUsers(former => former.filter(user => user._id !== id))
      }
    }).finally(() => setDeleting(former => former.filter(cid => cid !== id)))
  }

  return (
    <div>
      {/* <div className="flex flex-wrap justify-between items-center mb-4">
        <h4 className="font-medium lg:text-2xl text-xl capitalize text-slate-900 inline-block ltr:pr-4 rtl:pl-4">
          Your Users
        </h4>
      </div> */}
      {!isLoaded && (
        <TableLoading count={3} />
      )}

      {isLoaded && (
        <div>
          <UserList users={tableUsers} setUserEdit={setUserEdit} deleteUser={deleteUser} deleting={deleting} />
        </div>
      )}
      <EditUser userEdit={users[userEdit] ?? false} setUserEdit={setUserEdit} updateLocalUser={updateLocalUser} />
    </div>
  );
};

export default ManageUsersPage;
