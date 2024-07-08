"use client";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface BreadCrumbProps {
  links?: { linkPage: string; link: string }[];
  currentPage: string;
}
const BreadCrumb = ({ currentPage, links = [] }: BreadCrumbProps) => {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        {links.map((linkItem, index) => (
          <BreadcrumbItem key={index}>
            <BreadcrumbLink href={linkItem.link}>
              {linkItem.linkPage}
            </BreadcrumbLink>
            {index < links.length - 1 && <BreadcrumbSeparator />}
          </BreadcrumbItem>
        ))}
        {links.length > 0 && <BreadcrumbSeparator />}
        <BreadcrumbItem>
          <BreadcrumbPage>{currentPage}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
};

export default BreadCrumb;
