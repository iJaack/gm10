const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export function isAddressLike(value) {
    return typeof value === 'string' && ADDRESS_RE.test(value);
}

export function sameAddress(left, right) {
    return isAddressLike(left) && isAddressLike(right) && left.toLowerCase() === right.toLowerCase();
}

export function resolveSafeAwareAdminAddress({
    safeAddress,
    connectedAddress,
    safeContextTimedOut = false,
    fallbackSafeAddress,
    fallbackSignerAddress,
}) {
    if (isAddressLike(safeAddress)) {
        return safeAddress;
    }

    if (
        safeContextTimedOut
        && sameAddress(connectedAddress, fallbackSignerAddress)
        && isAddressLike(fallbackSafeAddress)
    ) {
        return fallbackSafeAddress;
    }

    return isAddressLike(connectedAddress) ? connectedAddress : undefined;
}
