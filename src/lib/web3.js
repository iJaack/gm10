
import { createAppKit } from '@reown/appkit/svelte'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { avalanche, mainnet } from '@reown/appkit/networks'

// 1. Get a project ID at https://cloud.reown.com
// TODO: Replace with your actual Project ID from Reown Cloud
export const projectId = 'YOUR_PROJECT_ID_HERE'

// 2. Set the networks
export const networks = [avalanche, mainnet]

// 3. Set up Wagmi Adapter
export const wagmiAdapter = new WagmiAdapter({
    projectId,
    networks
})

// 4. Create a metadata object
export const metadata = {
    name: 'Ash Strategy',
    description: 'Tokenized Pokemon Card Fund',
    url: 'https://ashstrategy.com', // origin must match your domain & subdomain
    icons: ['https://assets.reown.com/reown-profile-pic.png']
}

// 5. Create the AppKit instance
export const modal = createAppKit({
    adapters: [wagmiAdapter],
    networks,
    projectId,
    metadata,
    features: {
        analytics: true
    }
})

export const config = wagmiAdapter.wagmiConfig
