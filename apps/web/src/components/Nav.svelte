<script lang="ts">
  import { link } from "svelte-spa-router";
  import { auth, logout } from "../lib/auth.svelte";
</script>

<header>
  <a href="/" use:link class="brand">GMP&nbsp;Guide&nbsp;RA</a>
  <span class="muted">préparation</span>
  <span class="spacer"></span>
  {#if auth.user}
    <span class="muted">{auth.user.email}</span>
    <span class="pill">{auth.user.role}</span>
    <button class="ghost" onclick={logout}>Déconnexion</button>
  {/if}
</header>

<style>
  header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1.5rem;
    border-bottom: 1px solid var(--border);
    background: var(--panel);
  }
  .brand {
    font-weight: 700;
    text-decoration: none;
    color: var(--text);
  }
  .spacer {
    flex: 1;
  }
</style>
