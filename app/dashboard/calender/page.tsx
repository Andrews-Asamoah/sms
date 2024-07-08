"use client";

import DashPageWrapper from "../_component/pageWrapper";

const Calender = () => {
  return (
    <DashPageWrapper
      breadcrumbLinks={[{ linkPage: "Dashboard", link: "/dashboard" }]}
      currentPage="Academic Calender">
      <div>Academic Calender Page</div>
    </DashPageWrapper>
  );
};

export default Calender;
