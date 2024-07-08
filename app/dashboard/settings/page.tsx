"use client";
import DashPageWrapper from "../_component/pageWrapper";

const Settings = () => {
  return (
    <DashPageWrapper
      breadcrumbLinks={[{ linkPage: "Dashboard", link: "/dashboard" }]}
      currentPage="Settings">
      <div>Settings Page</div>
    </DashPageWrapper>
  );
};

export default Settings;
