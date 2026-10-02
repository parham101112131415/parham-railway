import { cn } from "@/lib/utils";

export function RailLogo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "px-logo-glow grid place-items-center rounded-full bg-gradient-to-b from-red-500 to-red-900 font-heading text-xl font-black text-white",
        className ?? "h-5 w-5",
      )}
      aria-label="Parham Logo"
    >
      P
    </span>
  );
}
