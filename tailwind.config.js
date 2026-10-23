/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            screens: {
                // Regular-width layouts. The unfolded iPhone Duo sits in this
                // band; the query is width, not a device or orientation check.
                wide: '600px',
            },
        },
    },
    plugins: [],
}
