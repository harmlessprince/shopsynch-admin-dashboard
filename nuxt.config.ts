// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from "@tailwindcss/vite";
import {process} from "std-env";
import strip from '@rollup/plugin-strip';

export default defineNuxtConfig({
    app: {
        head: {
            link: [
                {
                    rel: 'stylesheet',
                    href: 'https://api.fontshare.com/v2/css?f[]=satoshi@1&display=swap',
                },
                {
                    rel: 'stylesheet',
                    href: 'https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+Antique&display=swap'
                },
                {
                    rel: 'stylesheet',
                    href: 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined'
                }
            ]
        }
    },
    compatibilityDate: '2024-11-01',
    devtools: {enabled: true,},
    vite: {
        plugins: [
            tailwindcss(),
        ],
        build: {
            rollupOptions: {
                plugins: process.env.APP_ENV === 'production' ? [
                    strip({
                        include: ['**/*.(js|ts|vue)'],
                        functions: ['console.log', 'console.debug'],
                    }),
                ] : [],
            }
        }
    },
    css: ['~/assets/css/main.css', 'vue-final-modal/style.css'],
    modules: [
        '@nuxt/eslint',
        '@nuxt/fonts',
        '@nuxt/icon',
        '@nuxt/image',
        '@nuxt/scripts',
        '@pinia/nuxt',
        'nuxt-toast'
    ],
    runtimeConfig: {
        public: {
            apiBase: process.env.NUXT_PUBLIC_API_TEST_BASE_URL || "#",
            testBaseUrl: process.env.NUXT_PUBLIC_API_TEST_BASE_URL,
            liveBaseUrl: process.env.NUXT_PUBLIC_API_LIVE_BASE_URL,
            appEnv: process.env.NUXT_PUBLIC_API_ENV,
        }
    },
    plugins: [
        '~/plugins/tooltip.ts',
        '~/plugins/click-outside.ts'
    ]

})