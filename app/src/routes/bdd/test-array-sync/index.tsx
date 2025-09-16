import { component$ } from '@builder.io/qwik';
import { type DocumentHead } from '@builder.io/qwik-city';
import TestArraySyncValidation from '../test-array-sync-validation';

export default component$(() => {
  return <TestArraySyncValidation />;
});

export const head: DocumentHead = {
  title: 'Test Array Sync Validation - Schema Editor',
  meta: [
    {
      name: 'description',
      content: 'Test de validation pour vérifier que le problème de synchronisation des arrays est résolu',
    },
  ],
};