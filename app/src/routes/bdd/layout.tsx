import { component$, Slot } from '@builder.io/qwik';
import { routeLoader$ } from '@builder.io/qwik-city';

export const useBddLayout = routeLoader$(async () => {
  return {
    title: 'Base de Données - Entités',
    breadcrumbs: [
      { label: 'Admin', href: '/bo/' },
      { label: 'Schema Editor', href: '/bo/schemaEditor/' },
      { label: 'Base de Données', href: '/bo/schemaEditor/bdd/' }
    ]
  };
});

export default component$(() => {
  return (
    <div class="layout-bdd">
      <div class="bdd-container">
        <Slot />
      </div>
    </div>
  );
});