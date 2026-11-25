"use client"

import { useTheme } from "next-themes"
import { PiCheckCircle, PiInfo, PiSpinnerGap, PiWarning, PiXCircle } from "react-icons/pi"
import { Toaster as Sonner, type ToasterProps } from "sonner"

export function Toaster(props: ToasterProps) {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="bottom-right"
      className="toaster group font-body"
      icons={{
        success: <PiCheckCircle size={18} className="text-emerald-600" />,
        info: <PiInfo size={18} />,
        warning: <PiWarning size={18} />,
        error: <PiXCircle size={18} className="text-error" />,
        loading: <PiSpinnerGap size={18} className="animate-spin" />,
      }}
      style={{ "--border-radius": "1rem" } as React.CSSProperties}
      {...props}
    />
  )
}
