<script>
  import Navbar from '$lib/components/Navbar.svelte';
  import Footer from '$lib/components/Footer.svelte';
  import { page } from '$app/stores';
  import '../app.css';
</script>

<Navbar />

<main>
  <slot />
</main>

<Footer />



<style>
  main {
    flex: 1;
    display: flex;
    flex-direction: column;
    width: 100%;
    min-height: 100vh;
    padding-top: 80px;
  }

</style>
