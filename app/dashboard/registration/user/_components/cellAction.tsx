"use client";

import { useState } from "react";
import { FaTrash, FaRegEdit } from "react-icons/fa";
import { UsersColumn } from "./columns";
// import { AlertModal } from "@/components/modals/alert-modal";
// import useRegisterModal from "@/hooks/useRegisterModal";
// import { deleteUser } from "@/actions/user";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface cellActionProps {
  data: UsersColumn;
}

const CellAction = ({ data }: cellActionProps) => {
  const [open, setOpen] = useState(false);
  // const registerModal = useRegisterModal();
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const onConfirm = async () => {
    // await deleteUser(data.id)
    //   .then(() => {
    //     toast.success("User deleted successfully");
    //     router.refresh();
    //   })
    //   .catch(() => {})
    //   .finally(() => {
    //     setLoading(false);
    //     setOpen(false);
    //   });
  };

  return (
    <>
      {/* <AlertModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={onConfirm}
        loading={loading}
      /> */}
      <div className="flex w-full items-center gap-3 justify-center">
        <div
          className="cursor-pointer p-2 w-fit rounded-md bg-blue-500/10"
          onClick={() => router.push(`/registration/user/${data.id}`)}>
          <FaRegEdit className="text-xl text-blue-500" />
        </div>
        {/* <div
          className="cursor-pointer p-2 w-fit rounded-md bg-green-500/10"
          onClick={() => navigator.clipboard.writeText(data.id)}>
          Copy Id
        </div> */}
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
