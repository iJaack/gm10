'use client'

import React, { ReactNode } from 'react'
import { config, projectId, networks } from '@/config'
import { createMetadata } from '@/config'
import { createAppKit } from '@reown/appkit/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { State, WagmiProvider } from 'wagmi'

const queryClient = new QueryClient()

if (!projectId) {
    throw new Error('Project ID is not defined')
}

const metadata = {
    name: 'Ash Strategy',
    description: 'Tokenized Pokemon Card Fund',
    url: 'https://ashstrategy.com',
    icons: ['https://assets.reown.com/reown-profile-pic.png']
}

createAppKit({
    adapters: [config], // AppKit expects the Wagmi adapter/config depending on version, checking docs... adapter logic
    // Actually for @reown/appkit/react + wagmi adapter, we pass the wagmiAdapter instance usually or the config.
    // Docs say: adapters: [wagmiAdapter]
    networks,
    projectId,
    metadata,
    features: {
        analytics: true
    }
})

// Correct setup:
import { wagmiAdapter } from '@/config'

createAppKit({
    adapters: [wagmiAdapter],
    networks,
    projectId,
    metadata,
    features: {
        analytics: true
    }
})

export default function Web3ModalProvider({
    children,
    initialState
}: {
    children: ReactNode
    initialState?: State
}) {
    return (
        <WagmiProvider config={config} initialState={initialState}>
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </WagmiProvider>
    )
}
