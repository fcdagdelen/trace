<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { invalidate } from '$app/navigation';
  import { createSupabaseBrowserClient } from '$lib/services/supabase';
  import { setSession } from '$lib/stores/auth';
  import { setUserProfile } from '$lib/stores/user';

  let { children, data } = $props();

  const supabase = createSupabaseBrowserClient();

  // Initialize session and user profile from server data
  $effect(() => {
    setSession(data.session);
    setUserProfile(data.userProfile);
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
      // Clear user profile on logout
      if (!session) {
        setUserProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  });
</script>

<svelte:head>
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
</svelte:head>

{@render children()}
