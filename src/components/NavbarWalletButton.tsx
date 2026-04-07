import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Web3Providers } from './Web3Providers';

type NavbarWalletButtonProps = {
    mobile?: boolean;
};

export default function NavbarWalletButton({ mobile = false }: NavbarWalletButtonProps) {
    return (
        <Web3Providers>
            <div
                className={
                    mobile
                        ? 'mt-4 border-t border-[var(--border)] pt-4 [&_.iekbcc0]:!rounded-full [&_.iekbcc0]:!border [&_.iekbcc0]:!border-[var(--accent)] [&_.iekbcc0]:!bg-[var(--accent)] [&_.iekbcc0]:!px-4 [&_.iekbcc0]:!shadow-[0_0_14px_var(--gold-glow),0_0_32px_var(--gold-glow)] [&_.iekbcc0]:!font-[\'Inter\'] [&_.iekbcc0]:!font-bold [&_.iekbcc0]:!text-[var(--bg-primary)] [&_.ju367v7]:!font-[\'Inter\']'
                        : 'hidden sm:block [&_.iekbcc0]:!rounded-full [&_.iekbcc0]:!border [&_.iekbcc0]:!border-[var(--accent)] [&_.iekbcc0]:!bg-[var(--accent)] [&_.iekbcc0]:!px-4 [&_.iekbcc0]:!shadow-[0_0_14px_var(--gold-glow),0_0_32px_var(--gold-glow)] [&_.iekbcc0]:!font-[\'Inter\'] [&_.iekbcc0]:!font-bold [&_.iekbcc0]:!text-[var(--bg-primary)] [&_.iekbcc0]:hover:!shadow-[0_0_20px_rgba(240,192,48,0.35),0_0_48px_rgba(240,192,48,0.15)] [&_.iekbcc0]:!transition-shadow [&_.ju367v7]:!font-[\'Inter\']'
                }
            >
                <ConnectButton accountStatus="address" chainStatus="icon" showBalance={false} />
            </div>
        </Web3Providers>
    );
}
