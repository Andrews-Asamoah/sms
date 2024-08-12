"use client";

import BreadCrumb from "./breadCrumb";

interface PageWrapperProps {
  children: React.ReactNode;
  breadcrumbLinks?: { linkPage: string; link: string }[];
  currentPage: string;
}

const DashPageWrapper = ({
  children,
  currentPage,
  breadcrumbLinks = [],
}: PageWrapperProps) => {
  return (
    <div className="flex flex-col h-full w-full gap-3">
      <BreadCrumb links={breadcrumbLinks} currentPage={currentPage} />
      <div className=" h-full w-full overflow-hidden overflow-y-auto">{children}</div>
    </div>
  );
};

export default DashPageWrapper;
