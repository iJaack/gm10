import { useWaitForTransactionReceipt } from 'wagmi';
import { EXPLORER_TX_BASE_URL } from '../addresses';
import { AdminButton } from './AdminPrimitives';

type TxButtonProps = {
    onClick: () => void;
    txHash?: `0x${string}`;
    isPending?: boolean;
    disabled?: boolean;
    children: React.ReactNode;
    className?: string;
};

export function TxButton({ onClick, txHash, isPending, disabled, children, className = '' }: TxButtonProps) {
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
        hash: txHash,
    });

    const isActive = isPending || isConfirming;

    let label: React.ReactNode = children;
    if (isConfirming) label = 'Confirming…';
    else if (isPending) label = 'Submitting…';
    else if (isSuccess && txHash) label = '✓ Done';

    return (
        <AdminButton
            onClick={onClick}
            disabled={disabled || isActive}
            variant={isSuccess && txHash ? 'success' : 'primary'}
            className={className}
        >
            {label}
        </AdminButton>
    );
}

type TxResultProps = {
    hash?: `0x${string}`;
    error?: Error | null;
};

export function TxResult({ hash, error }: TxResultProps) {
    if (error) {
        return (
            <p className="mt-2 rounded-md border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs leading-5 text-red-100">
                {error.message.slice(0, 200)}
            </p>
        );
    }
    if (hash) {
        return (
            <p className="mt-2 text-xs text-gray-400">
                Tx:{' '}
                <a
                    href={`${EXPLORER_TX_BASE_URL}/${hash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#4fa8e0] underline"
                >
                    {hash.slice(0, 10)}…{hash.slice(-6)}
                </a>
            </p>
        );
    }
    return null;
}
