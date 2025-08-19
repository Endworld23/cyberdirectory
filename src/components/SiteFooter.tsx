export function SiteFooter() {
  return (
    <footer className="border-t bg-white">
      <div className="container flex flex-col items-center justify-between gap-3 py-6 text-sm text-gray-500 md:flex-row">
        <p>© {new Date().getFullYear()} Cyber Directory</p>
        <p className="text-gray-400">
          Curated security resources • Built with Next.js + Supabase
        </p>
      </div>
    </footer>
  );
}