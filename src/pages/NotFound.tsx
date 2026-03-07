import { Link } from 'react-router-dom';
import Page from '../components/Page';

export default function NotFound() {
    return (
        <Page containerClassName="max-w-2xl mx-auto text-center">
            <div className="py-20">
                <div className="text-8xl mb-6">🔍</div>
                <h1 className="text-5xl font-bold text-white mb-4">404</h1>
                <p className="text-xl text-gray-400 mb-8">
                    Page not found. The page you're looking for doesn't exist or has been moved.
                </p>
                <Link
                    to="/"
                    className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl font-bold text-white hover:opacity-90 transition-all"
                >
                    ← Back to Home
                </Link>
            </div>
        </Page>
    );
}
