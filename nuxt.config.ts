import IconsResolver from "unplugin-icons/resolver";
import ViteComponents from "unplugin-vue-components/vite";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    compatibilityDate: "2025-07-15",
    devtools: { enabled: true },
    runtimeConfig: {
        public: {
            apiBase: import.meta.env.NUXT_PUBLIC_API_BASE,
        },
    },
    css: [
        // "~/assets/style/bulma.scss",
        "bootstrap/dist/css/bootstrap.css",
        "~/assets/style/index.css",
    ],
    modules: ["unplugin-icons/nuxt", "@nuxt/fonts"],
    fonts: {
        families: [
            { name: "Outfit", provider: "google", global: true },
            { name: "Barlow", provider: "google", global: true },
        ],
    },
    vite: {
        plugins: [
            ViteComponents({
                resolvers: [
                    IconsResolver({
                        prefix: "",
                        strict: true,
                    }),
                ],
                dts: true,
            }),
        ],
    },
});
