import React, { useState, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import axios from "axios";
import ClipLoader from "react-spinners/ClipLoader";
import { PencilIcon } from "@heroicons/react/24/solid";
import EditStockModalSuccess from "./EditStockModalSuccess";
import BeatLoader from "react-spinners/BeatLoader";
import Avatar from "../assets/avatar.png";
import PrintCash from "../PrintCash";
import AddCustomModal from "../EditCustomModal";
type Props = {
  closeModal: () => void;
  record: Record;
  refreshData: () => void;
};
interface Approver {
  id: number;
  firstName: string;
  lastName: string;
  comment: string;
  position: string;
  signature: string;
  status: string;
}
type Record = {
  total_labor: number;
  total_discount: number;
  total_spotcash: number;
  id: number;
  request_code: string;
  created_at: Date;
  status: string;
  approvers_id: number;
  form_data: FormData[];
  supplier?: string;
  address?: string;
  branch: string;
  date: string;
  user_id: number;
  attachment: string;
  noted_by: {
    id: number;
    firstName: string;
    lastName: string;
    comment: string;
    position: string;
    signature: string;
    status: string;
  }[];
  approved_by: {
    id: number;
    firstName: string;
    lastName: string;
    comment: string;
    position: string;
    signature: string;
    status: string;
  }[];
};

type FormData = {
  total_labor: number;
  total_discount: number;
  total_spotcash: number;
  approvers_id: number;
  attachment: string;
  purpose: string;
  items: Item[];
  branch: string;
  date: string;
  grand_total: string;
  supplier: string;
  address: string;
  totalBoatFare: string;
  totalContingency: string;
  totalFare: string;
  totalHotel: string;
  totalperDiem: string;
  totalExpense: string;
  short: string;
};

// Define the Item type
type Item = {
  brand: string;
  model: string;
  unit: string;
  partno: string;
  labor: string;
  spotcash: string;
  discountedPrice: string;
};

const inputStyle = "border border-black text-[12px] font-bold p-2 h-14";
const tableStyle = "border border-black p-2";
const tableStyle2 = "bg-white p-2";
const tableCellStyle = `${inputStyle}  w-10 wrap-text  break-words`;
const ViewDiscountModal: React.FC<Props> = ({
  closeModal,
  record,
  refreshData,
}) => {
  const [editableRecord, setEditableRecord] = useState(record);
  const [newData, setNewData] = useState<Item[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editedDate, setEditedDate] = useState("");
  const [editedApprovers, setEditedApprovers] = useState<number>(
    record.approvers_id
  );
  const [loading, setLoading] = useState(false);
  const [approvers, setApprovers] = useState<Approver[]>([]);
  const [fetchingApprovers, setFetchingApprovers] = useState(false);
  const [savedSuccessfully, setSavedSuccessfully] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [notedBy, setNotedBy] = useState<Approver[]>([]);
  const [approvedBy, setApprovedBy] = useState<Approver[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showAddCustomModal, setShowAddCustomModal] = useState(false);
  const [customApprovers, setCustomApprovers] = useState<any>(null);
  const [isFetchingApprovers, setisFetchingApprovers] = useState(false);
  const [isFetchingUser, setisFetchingUser] = useState(false);
  const [user, setUser] = useState<any>({});
  const [attachmentUrl, setAttachmentUrl] = useState<string[]>([]);
  const [printWindow, setPrintWindow] = useState<Window | null>(null);
  const [newAttachments, setNewAttachments] = useState<File[]>([]);
  const [originalAttachments, setOriginalAttachments] = useState<string[]>([]);
  const [removedAttachments, setRemovedAttachments] = useState<
    Array<string | number>
  >([]);
  const [branchList, setBranchList] = useState<any[]>([]);
  const [branchMap, setBranchMap] = useState<Map<number, string>>(new Map());
  const hasDisapprovedInNotedBy = notedBy.some(
    (user) => user.status === "Disapproved"
  );
  const hasDisapprovedInApprovedBy = approvedBy.some(
    (user) => user.status === "Disapproved"
  );

  useEffect(() => {
    const fetchBranchData = async () => {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_BASE_URL}/view-branch`
        );
        const branches = response.data.data;

        // Create a mapping of id to branch_name
        const branchMapping = new Map<number, string>(
          branches.map((branch: { id: number; branch_code: string }) => [
            branch.id,
            branch.branch_code,
          ])
        );

        setBranchList(branches);
        setBranchMap(branchMapping);
      } catch (error) {
        console.error("Error fetching branch data:", error);
      }
    };

    fetchBranchData();
  }, []);
  // Get branch ID from record
  const branchId = parseInt(record.form_data[0].branch, 10);
  // Get branch name or default to "Unknown"
  const branchName = branchMap.get(branchId) || "Unknown";

  useEffect(() => {
    const currentUserId = localStorage.getItem("id");
    const attachments = JSON.parse(record.attachment);
    const userId = currentUserId ? parseInt(currentUserId) : 0;
    setNotedBy(editableRecord.noted_by);
    setApprovedBy(editableRecord.approved_by);
    setNewData(record.form_data[0].items.map((item) => ({ ...item })));
    setEditableRecord(record);
    setEditedApprovers(record.approvers_id);
    if (currentUserId) {
      fetchUser(record.user_id);
    }
    try {
      if (typeof record.attachment === "string") {
        // Parse the JSON string if it contains the file path
        const parsedAttachment: string[] = JSON.parse(record.attachment);

        if (parsedAttachment.length > 0) {
          // Construct file URLs
          const fileUrls = parsedAttachment.map(
            (filePath) =>
              `${process.env.REACT_APP_URL_STORAGE}/${filePath.replace(/\\/g, "/")}`
          );
          setAttachmentUrl(fileUrls);
        }
      }
    } catch (error) {
      console.error("Error parsing attachment:", error);
    }
  }, [record]);
  const fetchUser = async (id: number) => {
    setisFetchingUser(true);
    setisFetchingApprovers(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Token is missing");
      }

      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/profile`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setUser(response.data);
    } catch (error) {
      console.error("Failed to fetch approvers:", error);
    } finally {
      setisFetchingUser(false);
      setisFetchingApprovers(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setAttachmentUrl(attachmentUrl);
    setNewAttachments([]); // Clear new attachments
    setRemovedAttachments([]); // Reset removed attachments
    // Reset newData to original values
    setNewData(record.form_data[0].items.map((item) => ({ ...item })));
    setEditedApprovers(record.approvers_id);
    setEditableRecord((prevState) => ({
      ...prevState,
      form_data: [
        {
          ...prevState.form_data[0],
          total_discount: record.form_data[0].total_discount,
          total_labor: record.form_data[0].total_labor,
          total_spotcash: record.form_data[0].total_spotcash,
        },
      ],
    }));
  };

  const handleEdit = () => {
    setEditedDate(editableRecord.form_data[0].date);

    setIsEditing(true);
  };
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setNewAttachments(Array.from(event.target.files));
    }
  };

  const handleRemoveAttachment = (index: number) => {
    // Get the path of the attachment to be removed
    const attachmentPath = attachmentUrl[index].split(
      "storage/attachments/"
    )[1];

    // Add the path to the removedAttachments state
    setRemovedAttachments((prevRemoved) => [...prevRemoved, attachmentPath]);

    // Remove the attachment from the current list
    setAttachmentUrl((prevUrls) => prevUrls.filter((_, i) => i !== index));
  };

  const getDayFromDate = (dateString: string): string => {
    const date = new Date(dateString);
    const days = ["Sun", "Mon", "Tue", "Wed", "Thur", "Fri", "Sat"];
    return days[date.getDay()];
  };

  const formatDate = (dateString: Date) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    return date.toLocaleDateString("en-US", options);
  };
  const formatDate2 = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    return date.toLocaleDateString("en-US", options);
  };
  if (!record) return null;

  const handleSaveChanges = async () => {
    // Simple validation
    if (
      !newData.every(
        (item) =>
          item.brand &&
          item.brand.trim() !== "" &&
          item.model &&
          item.model.trim() !== "" &&
          item.spotcash &&
          item.spotcash.trim() !== ""
      )
    ) {
      setErrorMessage("From, to and date cannot be empty.");
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        setErrorMessage("Token is missing");
        return;
      }

      const formData = new FormData();
      formData.append("updated_at", new Date().toISOString());

      const notedByIds = Array.isArray(notedBy)
        ? notedBy.map((person) => person.id)
        : [];
      const approvedByIds = Array.isArray(approvedBy)
        ? approvedBy.map((person) => person.id)
        : [];

      formData.append("noted_by", JSON.stringify(notedByIds));
      formData.append("approved_by", JSON.stringify(approvedByIds));

      // Calculate totals for labor, spotcash, and discount
      const totalLabor = newData.reduce(
        (sum, item) => sum + parseFloat(item.labor || "0"),
        0
      );
      const totalSpotcash = newData.reduce(
        (sum, item) => sum + parseFloat(item.spotcash || "0"),
        0
      );
      const totalDiscount = newData.reduce(
        (sum, item) => sum + parseFloat(item.discountedPrice || "0"),
        0
      );

      formData.append(
        "form_data",
        JSON.stringify([
          {
            branch: editableRecord.form_data[0].branch,
            date: editedDate !== "" ? editedDate : editableRecord.created_at,
            status: editableRecord.status,
            items: newData,
            total_labor: totalLabor,
            total_spotcash: totalSpotcash,
            total_discount: totalDiscount,
          },
        ])
      );

      // Append existing attachments
      attachmentUrl.forEach((url, index) => {
        const path = url.split("storage/attachments/")[1];
        formData.append(`attachment_url_${index}`, path);
      });

      // Append new attachments
      newAttachments.forEach((file, index) => {
        formData.append("new_attachments[]", file);
      });

      // Append removed attachments
      removedAttachments.forEach((path, index) => {
        formData.append("removed_attachments[]", String(path));
      });

      // Send the request
      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/update-request/${record.id}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setLoading(false);
      setIsEditing(false);
      setSavedSuccessfully(true);
      refreshData();
    } catch (error: any) {
      setLoading(false);

      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          "Failed to update Cash advance."
      );
    }
  };

  const handleItemChange = (
    index: number,
    field: keyof Item,
    value: string
  ) => {
    const newDataCopy = [...newData];
    newDataCopy[index] = { ...newDataCopy[index], [field]: value };
    setErrorMessage("");

    // Recalculate totals as numbers
    const totalLabor = newDataCopy.reduce(
      (sum, item) => sum + parseFloat(item.labor || "0"),
      0
    );
    const totalSpotcash = newDataCopy.reduce(
      (sum, item) => sum + parseFloat(item.spotcash || "0"),
      0
    );
    const totalDiscount = newDataCopy.reduce(
      (sum, item) => sum + parseFloat(item.discountedPrice || "0"),
      0
    );

    setNewData(newDataCopy);

    // Update totals and other form data in editableRecord as numbers
    setEditableRecord((prevState) => ({
      ...prevState,
      form_data: [
        {
          ...prevState.form_data[0],
          date: editedDate !== "" ? editedDate : prevState.form_data[0].date,
          total_labor: totalLabor, // Keep totals as numbers
          total_spotcash: totalSpotcash,
          total_discount: totalDiscount,
        },
      ],
      approvers_id: editedApprovers,
    }));
  };

  const fetchCustomApprovers = async (id: number) => {
    setisFetchingApprovers(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Token is missing");
      }

      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/request-forms/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const { notedby, approvedby } = response.data;
      setNotedBy(notedby);
      setApprovedBy(approvedby);
    } catch (error) {
      console.error("Failed to fetch approvers:", error);
    } finally {
      setisFetchingApprovers(false);
    }
  };
  const openAddCustomModal = () => {
    setIsModalOpen(true);
  };
  const closeAddCustomModal = () => {
    setIsModalOpen(false);
  };
  const closeModals = () => {
    setIsModalOpen(false);
  };
  const handleOpenAddCustomModal = () => {
    setShowAddCustomModal(true);
  };

  const handleCloseAddCustomModal = () => {
    setShowAddCustomModal(false);
  };

  const handleAddCustomData = (notedBy: Approver[], approvedBy: Approver[]) => {
    setNotedBy(notedBy);
    setApprovedBy(approvedBy);
  };
  const fetchApprovers = async (userId: number) => {
    setFetchingApprovers(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Token is missing");
      }

      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/custom-approvers/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const approversData = Array.isArray(response.data.data)
        ? response.data.data
        : [];
      setApprovers(approversData);
    } catch (error) {
      console.error("Failed to fetch approvers:", error);
    } finally {
      setFetchingApprovers(false);
    }
  };
  const handlePrint = () => {
    // Construct the data object to be passed
    const data = {
      id: record,
      approvedBy: approvedBy,
      notedBy: notedBy,
      user: user,
    };

    localStorage.setItem("printData", JSON.stringify(data));
    // Open a new window with PrintRefund component
    const newWindow = window.open(`/print-discount`, "_blank");

    // Optional: Focus the new window
    if (newWindow) {
      newWindow.focus();
    }
  };

  return (
    <div className="fixed top-0 left-0 z-50 flex items-center justify-center w-full h-full bg-black bg-opacity-50">
      <div className="relative z-10 w-full p-4 mx-10 overflow-scroll bg-white border-black shadow-lg md:mx-0 md:w-1/2 lg:w-2/3 space-y-auto h-4/5">
        <div className="sticky flex justify-end cursor-pointer top-2">
          <XMarkIcon
            className="w-8 h-8 p-1 text-black bg-white rounded-full "
            onClick={closeModal}
          />
        </div>
        <div className="flex flex-col items-start justify-start w-full space-y-4">
          {!fetchingApprovers && !isFetchingApprovers && (
            <>
              <button
                className="p-1 px-2 text-white bg-blue-600 rounded-md"
                onClick={handlePrint}
              >
                Print
              </button>
              {printWindow && (
                <PrintCash
                  data={{
                    id: record,
                    approvedBy: approvedBy,
                    notedBy: notedBy,
                    user: user,
                  }}
                />
              )}
            </>
          )}
          <div className="flex items-center justify-between w-full">
            <div>
              <h1 className="font-semibold text-[18px]">
                Discount Requisition Form
              </h1>
            </div>
            <div className="flex w-auto ">
              <p>Date: </p>
              <p className="pl-1 font-bold">
                {formatDate(editableRecord.created_at)}
              </p>
            </div>
          </div>
          <p className="font-medium text-[14px]">Request ID: {record.request_code}</p>
          <div className="flex w-full md:w-1/2 items-center">

            <p>Status:</p>
            <p
              className={`${
                record.status.trim() === "Pending"
                  ? "bg-yellow"
                  : record.status.trim() === "Approved"
                  ? "bg-green"
                  : record.status.trim() === "Disapproved"
                  ? "bg-pink"
                  : record.status.trim() === "Ongoing"
                  ? "bg-primary"
                  : "bg-blue-700"
              } rounded-lg  py-1 w-1/3
             font-medium text-[14px] text-center ml-2 text-white`}
            >
              {" "}
              {record.status}
            </p>
          </div>

          <div className="grid w-full grid-cols-1 gap-2 md:grid-cols-2">
            <div className="flex w-1/2 ">
              <h1 className="flex items-center">Branch: </h1>
              <p className="w-full pl-1 font-bold bg-white rounded-md ">
                {branchName}
              </p>
            </div>
          </div>
          <div className="w-full mt-4 overflow-x-auto">
            <div className="w-full border-collapse">
              <table className="w-full border border-collapse border-black lg:overflow-auto xl:table-fixed">
                <thead>
                  <tr>
                    <th className="border p-2 border-black bg-[#8EC7F7] w-1/12">
                      Brand
                    </th>
                    <th className="border border-black bg-[#8EC7F7] w-1/12">
                      Model
                    </th>
                    <th className="border border-black bg-[#8EC7F7] w-2/12">
                      Unit/Part/Job
                    </th>
                    <th className="border border-black bg-[#8EC7F7] w-2/12">
                      Part No./Job Order No.
                    </th>
                    <th className="border border-black bg-[#8EC7F7] w-2/12">
                      Labor Charge
                    </th>
                    <th className="border border-black bg-[#8EC7F7] w-2/12">
                      Net Spotcash
                    </th>
                    <th className="border border-black bg-[#8EC7F7] w-2/12">
                      Discounted Price
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {isEditing
                    ? newData.map((item, index) => (
                        <tr key={index}>
                          <td className="break-words border-2 border-black tableCellStyle">
                            <input
                              type="text"
                              value={item.brand}
                              onChange={(e) =>
                                handleItemChange(index, "brand", e.target.value)
                              }
                              className="w-full bg-white"
                            />
                          </td>
                          <td className="break-words border-2 border-black tableCellStyle">
                            <input
                              type="text"
                              value={item.model}
                              onChange={(e) =>
                                handleItemChange(index, "model", e.target.value)
                              }
                              className="w-full bg-white"
                            />
                          </td>
                          <td className="break-words border-2 border-black tableCellStyle">
                            <input
                              type="text"
                              value={item.unit}
                              onChange={(e) =>
                                handleItemChange(index, "unit", e.target.value)
                              }
                              className="w-full bg-white"
                            />
                          </td>
                          <td className="break-words border-2 border-black tableCellStyle">
                            <input
                              type="text"
                              value={item.partno}
                              onChange={(e) =>
                                handleItemChange(
                                  index,
                                  "partno",
                                  e.target.value
                                )
                              }
                              className="w-full bg-white"
                            />
                          </td>
                          <td className="break-words border-2 border-black tableCellStyle">
                            <input
                              type="number"
                              value={item.labor}
                              onChange={(e) =>
                                handleItemChange(index, "labor", e.target.value)
                              }
                              className="w-full bg-white"
                              min="0" // Prevent negative values
                              step="0.01" // Allows decimals if needed
                            />
                          </td>
                          <td className="break-words border-2 border-black tableCellStyle">
                            <input
                              type="number"
                              value={item.spotcash}
                              onChange={(e) =>
                                handleItemChange(
                                  index,
                                  "spotcash",
                                  e.target.value
                                )
                              }
                              className="w-full bg-white"
                              min="0"
                              step="0.01"
                            />
                          </td>
                          <td className="break-words border-2 border-black tableCellStyle">
                            <input
                              type="number"
                              value={item.discountedPrice}
                              onChange={(e) =>
                                handleItemChange(
                                  index,
                                  "discountedPrice",
                                  e.target.value
                                )
                              }
                              className="w-full bg-white"
                              min="0"
                              step="0.01"
                            />
                          </td>
                        </tr>
                      ))
                    : editableRecord.form_data[0].items.map((item, index) => (
                        <tr key={index}>
                          <td className={tableCellStyle}>{item.brand}</td>
                          <td className={tableCellStyle}>{item.model}</td>
                          <td className={tableCellStyle}>{item.unit}</td>
                          <td className={tableCellStyle}>{item.partno}</td>
                          <td className={tableCellStyle}>{item.labor}</td>
                          <td className={tableCellStyle}>{item.spotcash}</td>
                          <td className={tableCellStyle}>
                            {item.discountedPrice}
                          </td>
                        </tr>
                      ))}
                </tbody>
                <tfoot className="bg-gray-100">
                  <tr>
                    <td colSpan={4} className="p-2 font-bold text-right">
                      Totals:
                    </td>
                    <td className="p-2 font-bold text-center border border-black">
                      {editableRecord.form_data[0].total_labor.toFixed(2)}
                    </td>
                    <td className="p-2 font-bold text-center border border-black">
                      {editableRecord.form_data[0].total_spotcash.toFixed(2)}
                    </td>
                    <td className="p-2 font-bold text-center border border-black">
                      {editableRecord.form_data[0].total_discount.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {errorMessage && <p className="text-red-500">{errorMessage}</p>}

          {isEditing && (
            <div className="my-2">
              <button
                onClick={openAddCustomModal}
                className="p-2 text-white rounded bg-primary"
              >
                Edit Approver
              </button>
            </div>
          )}
          <div className="flex-col items-center justify-center w-full">
            {isFetchingApprovers ? (
              <div className="flex items-center justify-center w-full h-40">
                <h1>Fetching..</h1>
              </div>
            ) : (
              <div className="flex flex-wrap">
                <div className="mb-4 ml-5">
                  <h3 className="mb-3 font-bold">Requested By:</h3>
                  <ul className="flex flex-wrap gap-6">
                    <li className="relative flex flex-col items-center justify-center w-auto text-center">
                      <div className="relative flex flex-col items-center justify-center">
                        {/* Signature */}
                        {user.data?.signature && (
                          <div className="absolute -top-4">
                            <img
                              src={user.data?.signature}
                              alt="avatar"
                              width={120}
                              className="relative z-20 pointer-events-none"
                              draggable="false"
                              onContextMenu={(e) => e.preventDefault()}
                              style={{ filter: "blur(1px)" }} // Optional: Apply a blur
                            />
                          </div>
                        )}
                        {/* Name */}
                        <p className="relative z-10 inline-block mt-4 font-medium text-center uppercase">
                          <span className="relative z-10">
                            {user.data?.firstName} {user.data?.lastName}
                          </span>
                          <span className="absolute left-0 right-0 bottom-0 h-0.5 bg-black"></span>
                        </p>
                        {/* Position */}
                        <p className="font-bold text-[12px] text-center mt-1">
                          {user.data?.position}
                        </p>
                        {/* Status, if needed */}
                        {user.data?.status && (
                          <p
                            className={`font-bold text-[12px] text-center mt-1 ${
                              user.data?.status === "Approved"
                                ? "text-green"
                                : user.data?.status === "Pending"
                                ? "text-yellow"
                                : user.data?.status === "Rejected"
                                ? "text-red"
                                : ""
                            }`}
                          >
                            {user.data?.status}
                          </p>
                        )}
                      </div>
                    </li>
                  </ul>
                </div>

                <div className="mb-4 ml-5">
                  <h3 className="mb-3 font-bold">Noted By:</h3>
                  <ul className="flex flex-wrap gap-6">
                    {notedBy.map((user, index) => (
                      <li
                        className="relative flex flex-col items-center justify-center text-center"
                        key={index}
                      >
                        <div className="relative flex flex-col items-center justify-center text-center">
                          {/* Signature */}
                          {(user.status === "Approved" ||
                            (typeof user.status === "string" &&
                              user.status.split(" ")[0] === "Rejected")) && (
                            <div className="absolute -top-4">
                              <img
                              src={user.signature}
                              alt="avatar"
                              width={120}
                              className="relative z-20 pointer-events-none"
                              draggable="false"
                              onContextMenu={(e) => e.preventDefault()}
                              style={{ filter: "blur(1px)" }} // Optional: Apply a blur
                            />
                            </div>
                          )}
                          {/* Name */}
                          <p className="relative z-10 inline-block mt-4 font-medium text-center uppercase">
                            <span className="relative z-10">
                              {user.firstName} {user.lastName}
                            </span>
                            <span className="absolute left-0 right-0 bottom-0 h-0.5 bg-black"></span>
                          </p>
                          {/* Position */}
                          <p className="font-bold text-[12px] text-center mt-1">
                            {user.position}
                          </p>
                          {/* Status */}
                          {hasDisapprovedInApprovedBy ||
                          hasDisapprovedInNotedBy ? (
                            user.status === "Disapproved" ? (
                              <p className="font-bold text-[12px] text-center text-red-500 mt-1">
                                {user.status}
                              </p>
                            ) : null
                          ) : (
                            <p
                              className={`font-bold text-[12px] text-center mt-1 ${
                                user.status === "Approved"
                                  ? "text-green"
                                  : user.status === "Pending"
                                  ? "text-yellow"
                                  : ""
                              }`}
                            >
                              {user.status}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mb-4 ml-5">
                  <h3 className="mb-3 font-bold">Approved By:</h3>
                  <ul className="flex flex-wrap gap-6">
                    {approvedBy.map((user, index) => (
                      <li
                        className="relative flex flex-col items-center justify-center text-center"
                        key={index}
                      >
                        <div className="relative flex flex-col items-center justify-center text-center">
                          {/* Signature */}
                          {(user.status === "Approved" ||
                            (typeof user.status === "string" &&
                              user.status.split(" ")[0] === "Rejected")) && (
                            <div className="absolute -top-4">
                             <img
                              src={user.signature}
                              alt="avatar"
                              width={120}
                              className="relative z-20 pointer-events-none"
                              draggable="false"
                              onContextMenu={(e) => e.preventDefault()}
                              style={{ filter: "blur(1px)" }} // Optional: Apply a blur
                            />
                            </div>
                          )}
                          {/* Name */}
                          <p className="relative z-10 inline-block mt-4 font-medium text-center uppercase">
                            <span className="relative z-10">
                              {user.firstName} {user.lastName}
                            </span>
                            <span className="absolute left-0 right-0 bottom-0 h-0.5 bg-black"></span>
                          </p>
                          {/* Position */}
                          <p className="font-bold text-[12px] text-center mt-1">
                            {user.position}
                          </p>
                          {/* Status */}
                          {hasDisapprovedInApprovedBy ||
                          hasDisapprovedInNotedBy ? (
                            user.status === "Disapproved" ? (
                              <p className="font-bold text-[12px] text-center text-red-500 mt-1">
                                {user.status}
                              </p>
                            ) : null
                          ) : (
                            <p
                              className={`font-bold text-[12px] text-center mt-1 ${
                                user.status === "Approved"
                                  ? "text-green"
                                  : user.status === "Pending"
                                  ? "text-yellow"
                                  : ""
                              }`}
                            >
                              {user.status}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
          <div className="w-full">
            <h1 className="font-bold">Attachments:</h1>
            <div>
              {attachmentUrl
                .filter((_, index) => !removedAttachments.includes(index))
                .map((url, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500"
                    >
                      {url.split("/").pop()}
                    </a>
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(index)}
                        className="text-red-500"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}

              {/* Check if there are no attachments */}
              {attachmentUrl.filter(
                (_, index) => !removedAttachments.includes(index)
              ).length === 0 && (
                <p className="text-gray-500">No attachments available.</p>
              )}
            </div>

            {isEditing && (
              <div>
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="mt-2"
                />
              </div>
            )}
          </div>

          <div className="w-full">
            <h2 className="mb-2 text-lg font-bold">Comments</h2>

            {/* Check if there are no comments in both notedBy and approvedBy */}
            {notedBy.filter((user) => user.comment).length === 0 &&
            approvedBy.filter((user) => user.comment).length === 0 ? (
              <p className="text-gray-500">No comments yet.</p>
            ) : (
              <>
                {/* Render Noted By comments */}
                <ul className="flex flex-col w-full mb-4 space-y-4">
                  {notedBy
                    .filter((user) => user.comment)
                    .map((user, index) => (
                      <div className="flex" key={index}>
                        <div>
                          <img
                            alt="avatar"
                            className="hidden cursor-pointer sm:block"
                            src={Avatar}
                            height={35}
                            width={45}
                          />
                        </div>
                        <div className="flex flex-row w-full">
                          <li className="flex flex-col justify-between pl-2">
                            <h3 className="text-lg font-bold">
                              {user.firstName} {user.lastName}
                            </h3>
                            <p>{user.comment}</p>
                          </li>
                        </div>
                      </div>
                    ))}
                </ul>

                {/* Render Approved By comments */}
                <ul className="flex flex-col w-full mb-4 space-y-4">
                  {approvedBy
                    .filter((user) => user.comment)
                    .map((user, index) => (
                      <div className="flex" key={index}>
                        <div>
                          <img
                            alt="avatar"
                            className="hidden cursor-pointer sm:block"
                            src={Avatar}
                            height={35}
                            width={45}
                          />
                        </div>
                        <div className="flex flex-row w-full">
                          <li className="flex flex-col justify-between pl-2">
                            <h3 className="text-lg font-bold">
                              {user.firstName} {user.lastName}
                            </h3>
                            <p>{user.comment}</p>
                          </li>
                        </div>
                      </div>
                    ))}
                </ul>
              </>
            )}
          </div>

          <div className="items-center md:absolute right-20 top-2">
            {isEditing ? (
              <div>
                <button
                  className="items-center h-10 p-2 text-white bg-primary rounded-xl"
                  onClick={handleSaveChanges}
                >
                  {loading ? (
                    <BeatLoader color="white" size={10} />
                  ) : (
                    "Save Changes"
                  )}
                </button>
                <button
                  className="p-2 ml-2 text-white bg-red-600 rounded-xl"
                  onClick={handleCancelEdit}
                >
                  Cancel
                </button>
              </div>
            ) : (
              !fetchingApprovers &&
              !isFetchingApprovers &&
              (editableRecord.status === "Pending" || editableRecord.status === "Disapproved") && (
                <button
                  className="flex p-2 ml-2 text-white bg-blue-500 rounded-xl"
                  onClick={handleEdit}
                >
                  <PencilIcon className="w-6 h-6 mr-2" />
                  Edit
                </button>
              )
            )}
          </div>
        </div>
      </div>
      {savedSuccessfully && (
        <EditStockModalSuccess
          closeSuccessModal={closeModal}
          refreshData={refreshData}
        />
      )}
      <AddCustomModal
        modalIsOpen={isModalOpen}
        closeModal={closeModals}
        openCompleteModal={() => {}}
        entityType="Approver"
        initialNotedBy={notedBy}
        initialApprovedBy={approvedBy}
        refreshData={() => {}}
        handleAddCustomData={handleAddCustomData}
      />
    </div>
  );
};

export default ViewDiscountModal;
