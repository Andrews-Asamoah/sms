"use client";

import { useState } from "react";
import { FaTrash, FaRegEdit } from "react-icons/fa";
import { SubjectsColumn } from "./columns";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertModal } from "@/components/modals/alert-modal";
import { deleteClass } from "@/actions/registration";

interface cellActionProps {
  data: SubjectsColumn;
}

const CellAction = ({ data }: cellActionProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const onConfirm = async () => {
    await deleteClass(data.id)
      .then(() => {
        toast.success("Class deleted successfully");
        router.refresh();
      })
      .catch((error) => {
        toast.error(error);
      })
      .finally(() => {
        setLoading(false);
        setOpen(false);
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
            router.push(`/dashboard/registration/subject/${data.id}`)
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
