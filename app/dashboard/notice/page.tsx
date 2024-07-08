"use client";

import DashPageWrapper from "../_component/pageWrapper";

const Notice = () => {
  return (
    <DashPageWrapper
      breadcrumbLinks={[{ linkPage: "Dashboard", link: "/dashboard" }]}
      currentPage="Notice">
      <div>Notice Board Page</div>
    </DashPageWrapper>
  );
};

export default Notice;
