/** @type {import('tailwindcss').Config} */
const plugin = require("tailwindcss/plugin");
module.exports = {
    content: [
        "./components/**/*.{js,vue,ts}",
        "./layouts/**/*.vue",
        "./pages/**/*.vue",
        "./plugins/**/*.{js,ts}",
        "./nuxt.config.{js,ts}",
        "./app.vue",
        "./node_modules/flowbite/**/*.js"
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                dashboard_text_color: "#616161",
                primary_color: "#003366",
                primary: "#003366",
                secondary: "#003366",
                
            },
            lineHeight: {

            },
            letterSpacing: {

            },
            borderRadius: {

            },
            backgroundImage: {

            }
        },
    },
    plugins: [require("@tailwindcss/forms"),
        require('flowbite/plugin'),
        plugin(function ({ addVariant }) {
            addVariant("current", "&.active");
        }),
    ],
};
