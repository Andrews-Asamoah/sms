"use client";
import DashPageWrapper from "../_component/pageWrapper";

const TeachersPage = () => {
  return (
    <DashPageWrapper
      breadcrumbLinks={[{ linkPage: "Dashboard", link: "/dashboard" }]}
      currentPage="Teachers">
      <div>Teachers Page</div>
    </DashPageWrapper>
  );
};

export default TeachersPage;
