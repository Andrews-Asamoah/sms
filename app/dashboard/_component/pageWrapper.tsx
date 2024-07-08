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
    <div className="grid gap-5">
      <BreadCrumb links={breadcrumbLinks} currentPage={currentPage} />
      <div className="">{children}</div>
    </div>
  );
};

export default DashPageWrapper;
