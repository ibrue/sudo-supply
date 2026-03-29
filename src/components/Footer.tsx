export function Footer() {
  return (
    <footer className="border-t border-border py-8 px-6">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-text-muted">
        <span>&copy; {new Date().getFullYear()} sudo.supply</span>
        <span>open-source hardware &middot; built for humans in the loop</span>
      </div>
    </footer>
  );
}
