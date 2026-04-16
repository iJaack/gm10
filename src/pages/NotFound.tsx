import { Link } from 'react-router-dom';
import Page from '../components/Page';

export default function NotFound() {
    return (
        <Page containerClassName="max-w-2xl mx-auto text-center">
            <div className="py-20">
                <div className="text-8xl font-extrabold text-[var(--text-tertiary)] mb-6">404</div>
                <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-4">Page not found</h1>
                <p className="text-[1rem] text-[var(--text-secondary)] mb-8">
                    The page you're looking for doesn't exist or has been moved.
                </p>
                <Link
                    to="/"
                    className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-[var(--text-primary)] border border-[var(--accent)]/40 bg-[var(--bg-secondary)] hover:border-[var(--accent)] transition-all"
                >
                    ← Back to Home
                </Link>
            </div>
        </Page>
    );
}
