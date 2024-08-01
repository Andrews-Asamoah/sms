"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SummaryCard from "./_component/summary_card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Overview from "./_component/overview";
import RecentFees from "./_component/recent_fees";
import BreadCrumb from "./_component/breadCrumb";
import DashPageWrapper from "./_component/pageWrapper";
import StudentGenderChart from "./_component/studentGender";

const Dashboard = () => {
  return (
    <DashPageWrapper currentPage="Dashboard">
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="reports" disabled>
            Reports
          </TabsTrigger>
          <TabsTrigger value="notification" disabled>
            Notifications
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <SummaryCard />
            <SummaryCard />
            <SummaryCard />
            <SummaryCard />
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Overview</CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                <Overview />
              </CardContent>
            </Card>
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Recent Fees Paid</CardTitle>
                <CardDescription>
                  152 students has paid their fees this month
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RecentFees />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Overview</CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                <StudentGenderChart />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </DashPageWrapper>
  );
};

export default Dashboard;
