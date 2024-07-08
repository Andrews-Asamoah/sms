import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import React from "react";
import { FaDollarSign } from "react-icons/fa6";

const SummaryCard = () => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
        <FaDollarSign />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">462,318.22</div>
        <p className="texxt-xs text-muted-foreground">+20.1% from last month</p>
      </CardContent>
    </Card>
  );
};

export default SummaryCard;
