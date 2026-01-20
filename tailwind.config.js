/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'blue-primary': '#1d3557',
                'blue-light': '#457b9d',
                'blue-pale': '#a8dadc',
                'cream': '#f1faee',
                'red-primary': '#e63946',
                'white': '#ffffff',
            },
            backgroundImage: {
                // Custom gradients
            },
        },
    },
    plugins: [],
}
