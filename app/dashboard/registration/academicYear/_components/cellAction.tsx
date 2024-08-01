"use client";

import { useState } from "react";
import { FaTrash, FaRegEdit } from "react-icons/fa";
import { AcademicYearColumn } from "./columns";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertModal } from "@/components/modals/alert-modal";
import { deleteAcademicYear } from "@/actions/registration";

interface cellActionProps {
  data: AcademicYearColumn;
}

const CellAction = ({ data }: cellActionProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const onConfirm = async () => {
    setLoading(true);
    await deleteAcademicYear(data.id)
      .then((res) => {
        if (res.error) {
          toast.error(res.error);
        } else {
          toast.success("Academic Year deleted successfully");
          router.refresh();
          setOpen(false);
        }
      })
      .catch(() => {
        toast.error("An unexpected error occurred");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <>
      <AlertModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={onConfirm}
        loading={loading}
      />
      <div className="flex w-full items-center gap-3 justify-center">
        <div
          className="cursor-pointer p-2 w-fit rounded-md bg-blue-500/10"
          onClick={() =>
            router.push(`/dashboard/registration/academicYear/${data.id}`)
          }>
          <FaRegEdit className="text-xl text-blue-500" />
        </div>
        <div
          className="cursor-pointer p-2 w-fit rounded-md bg-red-500/10"
          onClick={() => setOpen(true)}>
          <FaTrash className="text-xl text-red-500" />
        </div>
      </div>
    </>
  );
};

export default CellAction;
