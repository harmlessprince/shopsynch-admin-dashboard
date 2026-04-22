<script setup>
import { useHead } from '#imports';

// Props to allow dynamic titles
const props = defineProps({
  title: {
    type: String,
    default: 'Shopsynch API: Power Custom E-Commerce Experiences Faster',
  },
});
const fullTitle = computed(() => `${props.title} - Shopsynch API: Power Custom E-Commerce Experiences Faster`);

// Compute full
// Set meta tags
useHead({
  title: fullTitle.value,
  meta: [
    { charset: 'UTF-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1, shrink-to-fit=no' },
    { name: 'description', content: "Build scalable, customizable storefronts with Shopsynch's powerful eCommerce API. Integrate products, carts, checkout, and more—fast, flexible, and built for developers." },
    {
      name: 'keywords',
      content: 'api as a service, ecommerce, api, backend, shopsynch, order, product, modern, multipurpose, marketplace, saas, software'
    },
    { name: 'author', content: 'Shopsynch' },
    { name: 'website', content: 'https://shopsynch.com' },
    { name: 'email', content: 'support@shopsynch.com' },
    { name: 'version', content: '2.2.0' },
    { 'http-equiv': 'X-UA-Compatible', content: 'IE=edge' }
  ],
  link: [
    { rel: 'shortcut icon', href: '/favicon.ico' },
    { rel: 'icon', href: '/favicon.ico' },
    { rel: 'apple-touch-icon', sizes: "180x180", href: '/apple-touch-icon.png' },
    { rel: 'icon', sizes: "32x32", href: '/favicon-32x32.png' },
    { rel: 'icon', sizes: "16x16", href: '/favicon-16x16.png' },
  ]
});
</script>

<template>
  <slot />
</template>
