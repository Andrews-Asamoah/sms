"use client";

import DashPageWrapper from "../_component/pageWrapper";

const Bills = () => {
  return (
    <DashPageWrapper
      currentPage="Accounts"
      breadcrumbLinks={[{ linkPage: "Dashboard", link: "/dashboard" }]}>
      <div>Bills Page</div>
    </DashPageWrapper>
  );
};

export default Bills;
