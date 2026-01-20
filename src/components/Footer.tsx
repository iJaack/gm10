export default function Footer() {
    return (
        <footer className="py-8 text-center text-white/40 border-t border-white/5 bg-[#0a0f1c] relative z-10">
            <p>&copy; {new Date().getFullYear()} Ash Strategy. Built on Avalanche.</p>
        </footer>
    );
}
