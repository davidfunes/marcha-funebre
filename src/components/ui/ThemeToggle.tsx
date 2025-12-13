"use client"

import * as React from "react"
import { Moon, Sun, Monitor } from "lucide-react"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"

export function ThemeToggle({ className }: { className?: string }) {
    const { setTheme, theme } = useTheme()
    const [mounted, setMounted] = React.useState(false)
    const [isOpen, setIsOpen] = React.useState(false)

    // Avoid hydration mismatch
    React.useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return (
            <div className={cn("h-9 w-9 rounded-md border border-input bg-transparent", className)}></div>
        )
    }

    // Simple dropdown implementation
    return (
        <div className={cn("relative", className)}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
                aria-label="Toggle theme"
            >
                <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-36 rounded-md border bg-popover p-1 shadow-md z-50 animate-in fade-in slide-in-from-top-2">
                        <button
                            onClick={() => { setTheme("light"); setIsOpen(false); }}
                            className={cn(
                                "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                                theme === 'light' && "bg-accent/50"
                            )}
                        >
                            <Sun className="h-4 w-4" />
                            <span>Claro</span>
                        </button>
                        <button
                            onClick={() => { setTheme("dark"); setIsOpen(false); }}
                            className={cn(
                                "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                                theme === 'dark' && "bg-accent/50"
                            )}
                        >
                            <Moon className="h-4 w-4" />
                            <span>Oscuro</span>
                        </button>
                        <button
                            onClick={() => { setTheme("system"); setIsOpen(false); }}
                            className={cn(
                                "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                                theme === 'system' && "bg-accent/50"
                            )}
                        >
                            <Monitor className="h-4 w-4" />
                            <span>Sistema</span>
                        </button>
                    </div>
                </>
            )}
        </div>
    )
}
