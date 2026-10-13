import "./globals.css";
import type { Metadata } from "next";
export const metadata: Metadata={title:"UniRadar – Minden út a tudáshoz vezet",description:"Egyetemi képzéskereső, doktori iskolák, felnőttképzés és érettségi-tervező"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="hu"><body>{children}</body></html>}
