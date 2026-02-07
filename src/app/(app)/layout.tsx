import Navbar from "@/components/Navbar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </>
  );
}
