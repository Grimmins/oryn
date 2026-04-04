import { createContext, useContext, useEffect, useState } from "react"
import { darkTheme, lightTheme, type Colors } from "../styles"

type Mode = "light" | "dark"

type ThemeCtx = {
  C: Colors
  mode: Mode
  toggle: () => void
}

const ThemeContext = createContext<ThemeCtx>({
  C: darkTheme,
  mode: "dark",
  toggle: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<Mode>(() =>
    (localStorage.getItem("oryn-theme") as Mode) ?? "dark"
  )

  const C = mode === "dark" ? darkTheme : lightTheme

  useEffect(() => {
    document.body.style.background = C.bg
    localStorage.setItem("oryn-theme", mode)
  }, [mode, C.bg])

  const toggle = () => setMode((m) => (m === "dark" ? "light" : "dark"))

  return (
    <ThemeContext.Provider value={{ C, mode, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
