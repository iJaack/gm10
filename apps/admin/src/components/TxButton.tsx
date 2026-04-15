import { useWaitForTransactionReceipt } from 'wagmi';
import { EXPLORER_TX_BASE_URL } from '../addresses';

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
        <button
            type="button"
            onClick={onClick}
            disabled={disabled || isActive}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
                isSuccess && txHash
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[#4fa8e0] text-[#0b0a14] hover:bg-[#70bce8]'
            } ${className}`}
        >
            {label}
        </button>
    );
}

type TxResultProps = {
    hash?: `0x${string}`;
    error?: Error | null;
};

export function TxResult({ hash, error }: TxResultProps) {
    if (error) {
        return (
            <p className="mt-2 rounded bg-red-900/30 px-3 py-2 text-xs text-red-400">
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
