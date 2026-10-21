"use client";
import AppShell from "@/components/AppShell";
import QuizFlow from "@/components/QuizFlow";

export default function ExamPage() {
  return (
    <AppShell title="Exam">
      <QuizFlow type="Exam" />
    </AppShell>
  );
}
