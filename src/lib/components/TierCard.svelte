<script>
  export let title = '';
  export let price = '';
  export let benefits = [];
  export let popular = false;
  export let ctaText = 'Select';
  export let onSelect = () => {};
</script>

<div class="tier-card" class:popular>
  {#if popular}
    <div class="popular-badge">⭐ Popular</div>
  {/if}

  <div class="tier-header">
    <h3 class="tier-title">{title}</h3>
    <div class="tier-price">{price}</div>
  </div>

  <ul class="tier-benefits">
    {#each benefits as benefit}
      <li>{benefit}</li>
    {/each}
  </ul>

  <button class="tier-cta" on:click={onSelect}>
    {ctaText}
  </button>
</div>

<style>
  .tier-card {
    background: var(--bg-card);
    border: 2px solid var(--border);
    border-radius: 12px;
    padding: 2rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    position: relative;
    transition: all 0.3s ease;
  }

  .tier-card:hover {
    border-color: var(--accent-yellow);
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(252, 211, 77, 0.15);
  }

  .tier-card.popular {
    border-color: var(--accent-yellow);
    background: linear-gradient(to bottom, var(--bg-elevated), var(--bg-card));
  }

  .popular-badge {
    position: absolute;
    top: -12px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--accent-yellow);
    color: var(--bg-dark);
    padding: 0.4rem 1rem;
    border-radius: 20px;
    font-size: 0.85rem;
    font-weight: 700;
    white-space: nowrap;
  }

  .tier-header {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding-top: 0.5rem;
  }

  .tier-title {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--text-primary);
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .tier-price {
    font-size: 2rem;
    font-weight: 800;
    color: var(--accent-yellow);
  }

  .tier-benefits {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    flex: 1;
  }

  .tier-benefits li {
    font-size: 0.95rem;
    color: var(--text-secondary);
    padding-left: 1.5rem;
    position: relative;
    line-height: 1.5;
  }

  .tier-benefits li::before {
    content: '▪';
    position: absolute;
    left: 0;
    color: var(--accent-yellow);
    font-size: 1.2rem;
  }

  .tier-cta {
    padding: 0.85rem 2rem;
    background: var(--bg-elevated);
    color: var(--text-primary);
    border: 2px solid var(--accent-yellow);
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s ease;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .tier-cta:hover {
    background: var(--accent-yellow);
    color: var(--bg-dark);
    transform: translateY(-2px);
  }

  .tier-card.popular .tier-cta {
    background: var(--accent-yellow);
    color: var(--bg-dark);
  }

  .tier-card.popular .tier-cta:hover {
    background: #fde68a;
  }

  @media (max-width: 640px) {
    .tier-card {
      padding: 1.5rem;
    }

    .tier-title {
      font-size: 1.25rem;
    }

    .tier-price {
      font-size: 1.75rem;
    }

    .tier-benefits li {
      font-size: 0.9rem;
    }

    .tier-cta {
      padding: 0.75rem 1.5rem;
      font-size: 0.95rem;
    }
  }
</style>
