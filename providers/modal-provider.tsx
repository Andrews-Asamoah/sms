"use client";

import AcademicYearModal from "@/components/modals/academicYear-modal";
import React, { useEffect, useState } from "react";

const ModalProvider = () => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }
  return (
    <>
      <AcademicYearModal />
    </>
  );
};

export default ModalProvider;
