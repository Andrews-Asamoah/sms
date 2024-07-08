"use client";

import DashPageWrapper from "../_component/pageWrapper";

const Attendance = () => {
  return (
    <DashPageWrapper
      currentPage="Attendance"
      breadcrumbLinks={[{ linkPage: "Dashboard", link: "/dashboard" }]}>
      <div className="">Attendance</div>
    </DashPageWrapper>
  );
};

export default Attendance;
