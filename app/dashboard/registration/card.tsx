import { Card, CardHeader } from "@/components/ui/card";
import React from "react";

type Props = {
  onClick: () => void;
  title: string;
};

export const RegisterCard = ({ onClick, title }: Props) => {
  return (
    <Card
      onClick={onClick}
      className="flex cursor-pointer items-center justify-center">
      <CardHeader>{title}</CardHeader>
    </Card>
  );
};
