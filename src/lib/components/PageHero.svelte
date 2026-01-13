<script>
  export let icon = '';
  export let title = '';
  export let subtitle = '';
</script>

<section class="page-hero">
  <div class="hero-container">
    {#if icon}
      <div class="hero-icon">{icon}</div>
    {/if}
    <h1 class="hero-title">{title}</h1>
    {#if subtitle}
      <p class="hero-subtitle">{subtitle}</p>
    {/if}
  </div>
</section>

<style>
  .page-hero {
    background: linear-gradient(to bottom, var(--bg-elevated), var(--bg-dark));
    padding: 4rem 2rem 3rem;
    border-bottom: 1px solid var(--border);
  }

  .hero-container {
    max-width: 1200px;
    margin: 0 auto;
    text-align: center;
  }

  .hero-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  .hero-title {
    font-size: 2.5rem;
    font-weight: 800;
    color: var(--text-primary);
    margin: 0 0 1rem 0;
    line-height: 1.2;
  }

  .hero-subtitle {
    font-size: 1.15rem;
    color: var(--text-secondary);
    margin: 0;
    max-width: 600px;
    margin-left: auto;
    margin-right: auto;
    line-height: 1.6;
  }

  @media (max-width: 768px) {
    .page-hero {
      padding: 3rem 1.5rem 2rem;
    }

    .hero-icon {
      font-size: 2.5rem;
    }

    .hero-title {
      font-size: 2rem;
    }

    .hero-subtitle {
      font-size: 1rem;
    }
  }

  @media (max-width: 640px) {
    .page-hero {
      padding: 2rem 1rem 1.5rem;
    }

    .hero-icon {
      font-size: 2rem;
    }

    .hero-title {
      font-size: 1.75rem;
    }

    .hero-subtitle {
      font-size: 0.95rem;
    }
  }
</style>
