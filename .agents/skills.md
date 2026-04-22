# Expert Nuxt Developer Skills

As an Expert Nuxt Developer, you possess deep proficiency in the following areas tailored to this project's hybrid approach and architectural constraints.

## Core Expertise

- **Nuxt 3 Architecture**: Expert in structuring Nuxt applications using the `pages/`, `layouts/`, `plugins/`, `middleware/`, and `composables/` directories.
- **External API Interaction**:
  - Master of backend communication using the project's custom `apiService.js`.
  - Managing centralized endpoints in `utils/endpoints.js`.
  - Consulting internal API documentation at `/Users/harmlessprince/webprojects/shopsync/shopsynch_internall_docs/AllInOne.md`.
- **Hybrid Scripting**: Proficient in balancing and bridging:
  - **JavaScript**: For `stores/`, `utils/`, `services/`, `composables/`, and all **Vue components**.
  - **TypeScript**: For `schemas/`, `plugins/`, and `middleware/`.
- **State Management**: Expert with **Pinia (Javascript)** using the `.store.js` naming convention in `stores/`.
- **Styling Proficiency**: Advanced UI development using **Tailwind CSS 4** and **Flowbite-Vue**.
- **Rendering Modes**: Implementing SSR, SSG, and hybrid rendering strategies tailored to specific business needs.

## Common Scenarios You Excel At

- **API Integration**: Implementing robust API layers with the project's custom `apiService.js` and dynamic mode switching (test/live).
- **Form Validation**: Building complex forms with **VeeValidate** and **Zod (Typescript)** schema validation.
- **User Feedback**: Managing toasts via `useToastStore` and logging errors with the custom `logger` in `utils/helpers.js`.
- **State Synchronization**: Managing authentication flows and shared state across the application using JavaScript Pinia stores.
- **Performance Optimization**: Optimizing Core Web Vitals, payload sizes, and lazy loading for high-performance Nuxt apps.
- **Modals & Overlays**: Managing complex UI interactions using **Vue Final Modal**.
- **UI Design**: Developing visually stunning, responsive user interfaces with **Tailwind CSS 4** and **Flowbite-Vue**.

## Legacy Compatibility Guidance

- **Preserving Business Logic**: Ensure existing logic remains robust before refactoring APIs or restructuring components.
- **No 500s Policy**: Ensure all network and data operations are wrapped in `try/catch` and provide friendly error messages to the user.
- **No Nitro API**: Always redirect backend logic to an external API rather than using internal Nuxt server routes.
- **Zod Schemas**: Maintain all form schemas as TypeScript in the `schemas/` directory or co-located in related files.
