'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false)
    const pathname = usePathname()

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20)
        }
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    return (
        <nav
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b border-transparent ${scrolled
                    ? 'bg-[#0a0f1c]/95 backdrop-blur-xl border-white/10 shadow-lg'
                    : 'bg-transparent backdrop-blur-none'
                }`}
        >
            <div className={`max-w-[1400px] mx-auto flex items-center justify-between transition-all duration-300 ${scrolled ? 'py-4 px-8' : 'py-6 px-8'}`}>
                <div className="flex items-center gap-3">
                    <Link href="/" className="flex items-center gap-3 no-underline text-white hover:opacity-90 transition-opacity group">
                        <div className="w-10 h-10 flex items-center justify-center bg-red-primary/20 border border-red-primary/30 rounded-xl transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_0_20px_rgba(230,57,70,0.3)]">
                            <span className="text-xl">⚡</span>
                        </div>
                        <span className="text-xl font-bold tracking-tight bg-gradient-to-br from-white to-white/80 bg-clip-text text-transparent">
                            Ash Strategy
                        </span>
                    </Link>
                </div>

                <ul className="hidden md:flex items-center gap-2 m-0 p-0 list-none">
                    <li>
                        <Link
                            href="/"
                            className={`px-4 py-2 rounded-lg text-[0.95rem] font-medium transition-all duration-200 ${pathname === '/'
                                    ? 'text-white bg-red-primary/15'
                                    : 'text-white/70 hover:text-white hover:bg-white/10'
                                }`}
                        >
                            Home
                        </Link>
                    </li>
                    <li>
                        <Link
                            href="/portfolio"
                            className={`px-4 py-2 rounded-lg text-[0.95rem] font-medium transition-all duration-200 ${pathname === '/portfolio'
                                    ? 'text-white bg-red-primary/15'
                                    : 'text-white/70 hover:text-white hover:bg-white/10'
                                }`}
                        >
                            Portfolio
                        </Link>
                    </li>
                    <li>
                        <Link
                            href="/governance"
                            className={`px-4 py-2 rounded-lg text-[0.95rem] font-medium transition-all duration-200 ${pathname === '/governance'
                                    ? 'text-white bg-red-primary/15'
                                    : 'text-white/70 hover:text-white hover:bg-white/10'
                                }`}
                        >
                            Governance
                        </Link>
                    </li>
                </ul>

                <div>
                    {/* @ts-ignore */}
                    <w3m-button />
                </div>
            </div>
        </nav>
    )
}
