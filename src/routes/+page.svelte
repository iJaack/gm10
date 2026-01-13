<script>
  import Navbar from '$lib/components/Navbar.svelte';
  import Hero from '$lib/components/Hero.svelte';
  import MetricsBar from '$lib/components/MetricsBar.svelte';
  import ValueProps from '$lib/components/ValueProps.svelte';
  import HowItWorks from '$lib/components/HowItWorks.svelte';
  import PortfolioPreview from '$lib/components/PortfolioPreview.svelte';
  import TokenInfo from '$lib/components/TokenInfo.svelte';
  import FinalCTA from '$lib/components/FinalCTA.svelte';
  import Footer from '$lib/components/Footer.svelte';
</script>

<svelte:head>
  <title>Ash Strategy - Tokenized Pokémon Card Fund</title>
  <meta name="description" content="Invest in Pokémon Card Alpha. Tokenized exposure to graded card market growth. Transparent. Liquid. On-chain." />
</svelte:head>

<div class="page-wrapper">
  <Navbar />
  <main>
    <Hero />
    <MetricsBar />
    <ValueProps />
    <HowItWorks />
    <PortfolioPreview />
    <TokenInfo />
    <FinalCTA />
  </main>
  <Footer />
</div>

<style>
  .page-wrapper {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  main {
    flex: 1;
  }

  :global(body) {
    margin: 0;
    padding: 0;
  }
</style>
