<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { invalidate } from '$app/navigation';
  import { createSupabaseBrowserClient } from '$lib/services/supabase';
  import { setSession } from '$lib/stores/auth';

  let { children, data } = $props();

  const supabase = createSupabaseBrowserClient();

  // Initialize session from server data
  $effect(() => {
    setSession(data.session);
  });

  onMount(() => {
    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.access_token !== data.session?.access_token) {
        invalidate('supabase:auth');
      }
      setSession(session);
    });

    return () => subscription.unsubscribe();
  });
</script>

<svelte:head>
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
</svelte:head>

{@render children()}
