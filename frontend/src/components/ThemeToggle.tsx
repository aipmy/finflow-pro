import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const KEY = "finapp:theme";

export function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    return (localStorage.getItem(KEY) as "light" | "dark") || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  });
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem(KEY, theme);
  }, [theme]);
  return { theme, toggle: () => setTheme(t => (t === "dark" ? "light" : "dark")) };
}

export function ThemeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      className={cn(
        "relative w-[58px] h-[32px] rounded-full p-[5px] transition-all duration-500 ease-in-out focus:outline-none border shadow-[inset_0_2px_4px_rgba(0,0,0,0.15)] flex items-center cursor-pointer select-none",
        theme === "dark"
          ? "bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 border-slate-800"
          : "bg-gradient-to-r from-sky-400 via-sky-300 to-sky-400 border-sky-200"
      )}
      aria-label="Ganti tema"
    >
      {/* Decorative background details */}
      <div className="absolute inset-0 overflow-hidden rounded-full pointer-events-none">
        {/* Stars for Dark Mode */}
        <span
          className={cn(
            "absolute w-[2px] h-[2px] rounded-full bg-white/80 transition-all duration-500",
            theme === "dark" ? "opacity-100 top-[6px] left-[12px] scale-100" : "opacity-0 top-0 left-[12px] scale-0"
          )}
        />
        <span
          className={cn(
            "absolute w-[3px] h-[3px] rounded-full bg-white/95 transition-all duration-700 delay-100",
            theme === "dark" ? "opacity-100 top-[16px] left-[18px] scale-100" : "opacity-0 top-0 left-[18px] scale-0"
          )}
        />
        <span
          className={cn(
            "absolute w-[1.5px] h-[1.5px] rounded-full bg-white/70 transition-all duration-300",
            theme === "dark" ? "opacity-100 top-[8px] left-[24px] scale-100" : "opacity-0 top-0 left-[24px] scale-0"
          )}
        />

        {/* Clouds for Light Mode */}
        <span
          className={cn(
            "absolute rounded-full bg-white/40 blur-[1px] transition-all duration-500",
            theme === "light" ? "opacity-100 w-6 h-2 top-[16px] right-[8px] translate-x-0" : "opacity-0 w-6 h-2 top-[24px] right-[8px] translate-x-4"
          )}
        />
        <span
          className={cn(
            "absolute rounded-full bg-white/60 blur-[0.5px] transition-all duration-700 delay-75",
            theme === "light" ? "opacity-100 w-4 h-3 top-[8px] right-[12px] translate-x-0" : "opacity-0 w-4 h-3 top-[24px] right-[12px] translate-x-4"
          )}
        />
      </div>

      {/* Sliding Thumb */}
      <div
        className={cn(
          "h-[22px] w-[22px] rounded-full flex items-center justify-center transition-all duration-500 transform",
          theme === "dark"
            ? "translate-x-[26px] bg-gradient-to-b from-indigo-100 to-indigo-300 shadow-[0_2px_4px_rgba(0,0,0,0.4),inset_0_-1px_2px_rgba(0,0,0,0.2)]"
            : "translate-x-0 bg-gradient-to-b from-amber-100 to-amber-300 shadow-[0_2px_4px_rgba(0,0,0,0.2),inset_0_-1px_2px_rgba(255,255,255,0.6)]"
        )}
        style={{ transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)" }}
      >
        {/* Animated Icons inside the thumb */}
        <div className="relative w-full h-full flex items-center justify-center">
          <Sun
            className={cn(
              "h-3.5 w-3.5 text-amber-600 absolute transition-all duration-500 ease-in-out",
              theme === "light" ? "scale-100 rotate-0 opacity-100" : "scale-0 rotate-[180deg] opacity-0"
            )}
          />
          <Moon
            className={cn(
              "h-3.5 w-3.5 text-indigo-900 absolute transition-all duration-500 ease-in-out",
              theme === "dark" ? "scale-100 rotate-0 opacity-100" : "scale-0 -rotate-[180deg] opacity-0"
            )}
          />
        </div>
      </div>
    </button>
  );
}
