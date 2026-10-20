const REPO = "https://github.com/Altex2/Spalatorie-Camin";

export function Credits({ className = "" }: { className?: string }) {
  return (
    <footer className={`text-center text-[12px] leading-5 text-ink-3 ${className}`}>
      <span>Made with love by Amancia Andrei</span>
      <span aria-hidden> · </span>
      <a href={REPO} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:text-ink hover:underline">
        GitHub
      </a>
      <span aria-hidden> · </span>
      <span>Hosted by LSE IT</span>
    </footer>
  );
}
