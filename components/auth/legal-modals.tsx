"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export function PrivacyModal() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="hover:text-white transition-colors">Privacy</button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Privacy Policy</DialogTitle>
          <DialogDescription>
            Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6 text-sm text-slate-700 dark:text-slate-300">
            <section>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">1. Information We Collect</h3>
              <p className="mt-2">When you use the Edu-MS platform, we collect various types of information to provide and improve our services to you. This includes:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li><strong>Personal Identification:</strong> Name, email address, phone number, and account credentials.</li>
                <li><strong>Educational Data:</strong> Student records, attendance, academic performance, and institutional details provided by authorized school administrators.</li>
                <li><strong>Usage Data:</strong> Information on how the Service is accessed and used, including device information and IP addresses.</li>
              </ul>
            </section>
            
            <section>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">2. How We Use Your Information</h3>
              <p className="mt-2">The information we collect is used for various purposes, including:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>To provide, maintain, and secure the Edu-MS platform.</li>
                <li>To manage user accounts and authenticate access.</li>
                <li>To process payments and manage institutional subscriptions.</li>
              </ul>
            </section>
            
            <section>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">3. Data Security</h3>
              <p className="mt-2">We implement strict, industry-standard security measures to protect your personal and educational data from unauthorized access, alteration, disclosure, or destruction.</p>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export function TermsModal() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="hover:text-white transition-colors">Terms</button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Terms of Service</DialogTitle>
          <DialogDescription>
            Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6 text-sm text-slate-700 dark:text-slate-300">
            <section>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">1. Acceptance of Terms</h3>
              <p className="mt-2">By accessing or using the Edu-MS platform, you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not access the service.</p>
            </section>
            
            <section>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">2. Description of Service</h3>
              <p className="mt-2">Edu-MS provides a comprehensive school management system designed to assist educational institutions with administration, finance, student management, and communication.</p>
            </section>
            
            <section>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">3. User Responsibilities</h3>
              <p className="mt-2">When you create an account with us, you must provide accurate information. You are responsible for safeguarding your password and any activities under your account.</p>
            </section>
            
            <section>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">4. Institutional Data</h3>
              <p className="mt-2">If you are an administrator, you warrant that you have the necessary authority to upload student and staff data. Edu-MS acts solely as a data processor.</p>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
