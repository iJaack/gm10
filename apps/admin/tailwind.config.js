/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                accent: 'var(--accent)',
                'accent-gold': 'var(--accent)',
                'accent-blue': 'var(--accent-blue)',
                'accent-green': 'var(--accent-green)',
                'accent-red': 'var(--accent-red)',
            },
        },
    },
    plugins: [],
};
