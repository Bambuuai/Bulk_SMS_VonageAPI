import React, { useState, useEffect } from "react";
import CreatableSelect from "react-select/creatable";
import makeAnimated from "react-select/animated";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import notify from "@/app/notify";
import FormGroup from "@/components/ui/FormGroup";
import axios from "@/configs/axios-config";
import { normalGroups, prepContactForUpdate } from "@/utils";

const animatedComponents = makeAnimated();

const EditContact = ({
	setContactEdit,
	contactEdit,
	updateLocalContact,
	UPDATE_ENDPOINT,
}) => {
	const [isLoading, setIsLoading] = useState(false);
	const [groups, setGroups] = useState([]);

	const FormValidationSchema = yup
		.object({
			name: yup.string().default(contactEdit.name),
			phone_number: yup.string().default(contactEdit.phone_number),
			// notes: yup.string().default(contactEdit.notes),
			// groups: yup.string().default(contactEdit.groups),
		})
		.required();

	const {
		register,
		control,
		reset,
		formState: { errors },
		handleSubmit,
	} = useForm({
		resolver: yupResolver(FormValidationSchema),

		mode: "all",
	});

	useEffect(() => {
		reset(contactEdit);
		setGroups(contactEdit.groups);
	}, [contactEdit, reset]);

	const onSubmit = (update) => {
		setIsLoading(true);
		update.name = update.name.trim();
		update.phone_number = update.phone_number.trim();
		// update.notes = update.notes.trim();
		update.groups = normalGroups(groups, true);

		console.log(update);
		axios
			.put(UPDATE_ENDPOINT, [prepContactForUpdate(update)])
			.then(({ data }) => {
				console.log(data);
				if (data.modified) {
					updateLocalContact(update);
					setContactEdit(false);
					notify.success("Contact Updated Successfully");
				}
			})
			.finally(() => {
				setIsLoading(false);
			});
	};

	return (
		<Modal
			title="Edit Contact"
			activeModal={Boolean(contactEdit)}
			onClose={() => setContactEdit(false)}
			centered
		>
			<form onSubmit={handleSubmit(onSubmit)} className="space-y-4 ">
				<FormGroup label="Name" error={errors.name}>
					<input
						type="text"
						defaultValue={contactEdit.name}
						className="form-control py-2"
						{...register("name")}
					/>
				</FormGroup>

				<FormGroup label="Phone Number" error={errors.phone_number}>
					<input
						type="text"
						defaultValue={contactEdit.phone_number}
						className="form-control py-2"
						{...register("phone_number")}
					/>
				</FormGroup>

				{/* <FormGroup label="Notes" error={errors.notes}>
          <input
            type="text"
            defaultValue={contactEdit.notes}
            className="form-control py-2"
            {...register("notes")}
          />
        </FormGroup> */}

				{/* error={errors.groups} */}
				<FormGroup label="Groups">
					<CreatableSelect
						className="react-select capitalize"
						classNamePrefix="select"
						classNames={{
							control: () => "max-h-[37px]",
							valueContainer: () =>
								"gap-y-1.5 !py-1 !px-1.5 max-h-[37px]",
						}}
						isClearable={false}
						closeMenuOnSelect={true}
						components={animatedComponents}
						value={groups}
						openMenuOnClick={false}
						openMenuOnFocus={false}
						onChange={(selectedOptions) => {
							setGroups(selectedOptions);
						}}
						isMulti
						required
						// {...register("groups")}
					/>
				</FormGroup>

				<div className="">
					<Button
						text="Update Contact"
						type="submit"
						className="btn btn-dark"
						isLoading={isLoading}
					/>
				</div>
			</form>
		</Modal>
	);
};

export default EditContact;
