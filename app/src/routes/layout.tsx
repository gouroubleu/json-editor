import { component$, Slot } from '@builder.io/qwik';
import { routeLoader$ } from '@builder.io/qwik-city';

export const useSchemaEditorLayout = routeLoader$(async () => {
  return {
    title: 'Schema Editor',
    breadcrumbs: [
      { label: 'Admin', href: '/bo/' },
      { label: 'Schema Editor', href: '/' }
    ]
  };
});

export default component$(() => {
  return (
    <div class="header-offset-container" style="position: fixed; top: 0px; left: 0; right: 0; height: calc(100vh); overflow: auto;">
      <div style="position: relative; width: 100%; height: 100%;">
        <div class="schema-editor-layout">
          <Slot />
        </div>
      </div>
    </div>
  );
});