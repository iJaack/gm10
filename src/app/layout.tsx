import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Web3ModalProvider from '@/context/Web3Modal'
import { headers } from 'next/headers'
import { cookieToInitialState } from 'wagmi'
import { config } from '@/config'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'Ash Strategy - Pokemon Card Fund',
    description: 'Tokenized exposure to graded Pokemon cards.',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const initialState = cookieToInitialState(config, headers().get('cookie'))

    return (
        <html lang="en">
            <body className={inter.className}>
                <Web3ModalProvider initialState={initialState}>
                    {children}
                </Web3ModalProvider>
            </body>
        </html>
    )
}
