"use client";
import AppShell from "@/components/AppShell";
import QuizFlow from "@/components/QuizFlow";

export default function QuizPage() {
  return (
    <AppShell title="Quiz">
      <QuizFlow type="Quiz" />
    </AppShell>
  );
}
