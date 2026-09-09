<script lang="ts">
  import Router from "svelte-spa-router";
  import { auth } from "./lib/auth.svelte";
  import Login from "./routes/Login.svelte";
  import Machines from "./routes/Machines.svelte";
  import MachineDetail from "./routes/MachineDetail.svelte";
  import Nav from "./components/Nav.svelte";

  const routes = {
    "/": Machines,
    "/machine/:id": MachineDetail,
    "*": Machines,
  };
</script>

{#if !auth.user}
  <Login />
{:else}
  <Nav />
  <main class="container">
    <Router {routes} />
  </main>
{/if}
