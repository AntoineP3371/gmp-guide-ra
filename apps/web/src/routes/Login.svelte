<script lang="ts">
  import { login } from "../lib/auth.svelte";

  let email = $state("");
  let password = $state("");
  let err = $state("");
  let busy = $state(false);

  async function submit(e: Event) {
    e.preventDefault();
    busy = true;
    err = "";
    try {
      await login(email, password);
    } catch {
      err = "Identifiants invalides.";
    } finally {
      busy = false;
    }
  }
</script>

<div class="wrap">
  <form class="panel" onsubmit={submit}>
    <h1>GMP Guide RA</h1>
    <p class="muted">Interface de préparation des guides machine.</p>
    <div class="field">
      <label for="email">E-mail</label>
      <input id="email" type="email" bind:value={email} required autocomplete="username" />
    </div>
    <div class="field">
      <label for="pw">Mot de passe</label>
      <input id="pw" type="password" bind:value={password} required autocomplete="current-password" />
    </div>
    {#if err}<p class="error">{err}</p>{/if}
    <button class="primary" type="submit" disabled={busy}>
      {busy ? "Connexion…" : "Se connecter"}
    </button>
  </form>
</div>

<style>
  .wrap {
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: 1.5rem;
  }
  form {
    width: 340px;
  }
  h1 {
    margin: 0 0 0.25rem;
  }
</style>
