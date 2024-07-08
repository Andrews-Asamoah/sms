"use client";

import DashPageWrapper from "../_component/pageWrapper";
import DisplayResults from "./_components/display";

const Results = () => {
  return (
    <DashPageWrapper
      breadcrumbLinks={[
        { linkPage: "Dashboard", link: "/dashboard" },
        { linkPage: "Examination", link: "/dashboard/examination" },
      ]}
      currentPage="Results">
      <div>
        <DisplayResults />
      </div>
    </DashPageWrapper>
  );
};

export default Results;
