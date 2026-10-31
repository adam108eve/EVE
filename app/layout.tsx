import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ADAM Hackathon Platform",
  description: "A platform for organizing and participating in hackathons.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-gray-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
