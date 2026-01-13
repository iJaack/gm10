<script>
  import { browser } from '$app/env';
  import { page } from '$app/stores';
  import '../app.css';

  // Only show header for legacy pages (about, todos)
  $: showLegacyHeader = !['/portfolio', '/fundraising', '/governance', '/'].includes($page.url.pathname);
</script>

{#if showLegacyHeader}
  <header>
    <nav>
      <ul>
        <li><a href="/">Home</a></li>
        <li><a href="/portfolio">Portfolio</a></li>
        <li><a href="/fundraising">Fundraising</a></li>
        <li><a href="/governance">Governance</a></li>
      </ul>
    </nav>
  </header>
  <main>
    <slot />
  </main>
{:else}
  <slot />
{/if}

<style>
	main {
		flex: 1;
		display: flex;
		flex-direction: column;
		padding: 1rem;
		width: 100%;
		max-width: 1024px;
		margin: 0 auto;
		box-sizing: border-box;
	}
</style>
