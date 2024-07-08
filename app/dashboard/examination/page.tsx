"use client";

import DashPageWrapper from "../_component/pageWrapper";

const ExaminationPage = () => {
  return (
    <DashPageWrapper
      breadcrumbLinks={[{ linkPage: "Dashboard", link: "/dashboard" }]}
      currentPage="Examination">
      <div>Examinations Page</div>
    </DashPageWrapper>
  );
};

export default ExaminationPage;
