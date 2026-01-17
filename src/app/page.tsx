import Navbar from '@/components/Navbar'
import Hero from '@/components/Hero'

export default function Home() {
    return (
        <main className="min-h-screen bg-[#0a0f1c] text-white">
            <Navbar />
            <Hero />
            {/* Additional sections can be added here */}
            <footer className="py-8 text-center text-white/40 border-t border-white/5">
                <p>&copy; 2024 Ash Strategy. Built on Avalanche.</p>
            </footer>
        </main>
    )
}
