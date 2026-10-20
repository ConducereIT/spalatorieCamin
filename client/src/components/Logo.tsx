// lion logo from the old site, on an amber tile
export function Logo({ size = 36 }: { size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-[28%] bg-mine"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <img src="/logo.svg" alt="" width={size * 0.82} height={size * 0.68} draggable={false} />
    </span>
  );
}
