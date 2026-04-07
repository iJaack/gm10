/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                accent: '#4fa8e0',
                'accent-gold': '#f0c030',
            },
        },
    },
    plugins: [],
};
