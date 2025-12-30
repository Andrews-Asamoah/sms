"use client";

import { useAcademicYearModal } from "@/hooks/use-academicYear-modal";
import Modal from "./modal";

const AcademicYearModal = () => {
  const academicYearModal = useAcademicYearModal();

  return (
    <Modal
      title="Create Academic Year"
      description="Add a new Academic year to manage school activities"
      isOpen={academicYearModal.isOpen}
      onClose={academicYearModal.onClose}></Modal>
  );
};

export default AcademicYearModal;
