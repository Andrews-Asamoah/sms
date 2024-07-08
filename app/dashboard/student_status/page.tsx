"use client";
import DashPageWrapper from "../_component/pageWrapper";

const StudentStatus = () => {
  return (
    <DashPageWrapper
      breadcrumbLinks={[{ linkPage: "Dashboard", link: "/dashboard" }]}
      currentPage="Student's Status">
      <div>Students Status Page</div>
    </DashPageWrapper>
  );
};

export default StudentStatus;
