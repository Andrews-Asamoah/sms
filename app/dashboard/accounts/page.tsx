"use client";

import DashPageWrapper from "../_component/pageWrapper";

const AccountPage = () => {
  return (
    <DashPageWrapper
      currentPage="Accounts"
      breadcrumbLinks={[{ linkPage: "Dashboard", link: "/dashboard" }]}>
      <div>Accounts Page</div>
    </DashPageWrapper>
  );
};

export default AccountPage;
