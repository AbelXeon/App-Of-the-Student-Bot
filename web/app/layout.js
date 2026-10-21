import "./globals.css";
import SWRegister from "@/components/SWRegister";

export const metadata = {
  title: "Study Bot",
  description: "Ask questions, take quizzes and exams, and review flashcards from your course material.",
  manifest: "/manifest.json",
  applicationName: "Study Bot",
  appleWebApp: { capable: true, title: "Study Bot", statusBarStyle: "black-translucent" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/icon-192.png" },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b1220",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <SWRegister />
      </body>
    </html>
  );
}
