"use client";
import DashPageWrapper from "../_component/pageWrapper";

const StudentPage = () => {
  return (
    <DashPageWrapper
      breadcrumbLinks={[{ linkPage: "Dashboard", link: "/dashboard" }]}
      currentPage="Students">
      <div>Students Page</div>
    </DashPageWrapper>
  );
};

export default StudentPage;
