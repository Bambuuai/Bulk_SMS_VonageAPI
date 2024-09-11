"use client";

import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import ContactList from "@/components/partials/contact/ContactList";
import Loading from "@/components/Loading";
import notify from "@/app/notify";
import EditContact from "@/components/partials/contact/EditContact";
import axios from "@/configs/axios-config";
import { USER_ENDPOINTS } from "@/constant/endpoints";

const ManageUsersPage = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const dispatch = useDispatch();
  const [groups, setGroups] = useState([])
  const [contacts, setContacts] = useState([])
  const [contactEdit, setContactEdit] = useState(false)
  const [deleting, setDeleting] = useState([])

  useEffect(() => {
    axios.get(USER_ENDPOINTS.GET_CONTACTS).then(({ data }) => {
        console.log(data)
        if (Array.isArray(data)) {
            setContacts(data)
        }
    }).catch(err => console.log(err))
      .finally(() => setIsLoaded(true))
  }, []);

  function updateLocalContact(newData) {
    const newList = [...contacts]
    const contactIndex = newList.findIndex(contact => contact._id === newData._id)
    newList[contactIndex] = newData
    console.log(newData, contactIndex)
    console.log(newList)
    setContacts(newList)
  }

  function deleteContact(id) {
    console.log("DElete it", id)
    setDeleting(former => [...former, id])
    axios.delete(USER_ENDPOINTS.REMOVE_CONTACTS, {data: [id]}).then(({ data }) => {
      if (data.success) {
        setContacts(former => former.filter(contact => contact._id !== id));
        notify.success("Contact Deleted", {theme: "dark"});
      }
    })
  }

  useEffect(() => {
    const groupContacts = contacts.reduce((acc, contact) => {
      contact.groups.forEach((group) => {
        if (!acc[group]) {
          acc[group] = [];
        }
        acc[group].push(contact);
      });
      return acc;
    }, {});
    console.log("Groups: ", groupContacts)
    setGroups(groupContacts)
  }, [contacts])

  return (
    <div className="h-full">
      {/* <div className="flex flex-wrap justify-between items-center mb-4">
        <h4 className="font-medium lg:text-2xl text-xl capitalize text-slate-900 inline-block ltr:pr-4 rtl:pl-4">
          Your Users
        </h4>
      </div> */}
      {!isLoaded && (
        <Loading className="app_height-footer" />
      )}

      {isLoaded && (
        contacts.length ? (
          <div className="space-y-12">
            {
              Object.keys(groups).sort().map((name,index ) => (
                <ContactList key={index} group={name} contacts={groups[name]} setContactEdit={setContactEdit} deleteContact={deleteContact} deleting={deleting} />
              ))
            }
          </div>
        ) : (
          <div className="h-full flex flex-col justify-center items-center container-center">
            <img className="w-60" src="/assets/images/custom/contacts.png" alt="Illustration showing Phonebook" />
            <p className="mt-4 text-center font-medium">No contacts added</p> 
          </div>
        )
      )}
      <EditContact contactEdit={contactEdit} setContactEdit={setContactEdit} updateLocalContact={updateLocalContact} UPDATE_ENDPOINT={USER_ENDPOINTS.UPDATE_CONTACTS} />
    </div>
  );
};

export default ManageUsersPage;
