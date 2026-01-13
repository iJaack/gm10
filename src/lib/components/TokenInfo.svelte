<script>
  export let totalSupply = '100,000';
  export let circulating = '42,350';
  export let price = '$1.24';
  export let contractAddress = '0x...';
</script>

<section class="token-info">
  <div class="token-container">
    <div class="token-content">
      <h2 class="token-title">The $CATCH Token</h2>
      <p class="token-description">
        Your liquid stake in curated Pokémon card alpha.
      </p>
      <ul class="token-features">
        <li>Proportional NAV</li>
        <li>DAO governance</li>
        <li>On-chain tracking</li>
        <li>Quarterly reports</li>
      </ul>
    </div>

    <div class="token-metrics">
      <h3 class="metrics-title">TOKEN METRICS</h3>
      <div class="metrics-grid">
        <div class="metric-row">
          <span class="metric-label">Total Supply:</span>
          <span class="metric-value">{totalSupply}</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">Circulating:</span>
          <span class="metric-value">{circulating}</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">Price:</span>
          <span class="metric-value">{price}</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">Backing:</span>
          <span class="metric-value">100% cards</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">Chain:</span>
          <span class="metric-value">Base/Ethereum</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">Contract:</span>
          <span class="metric-value contract">{contractAddress}</span>
        </div>
      </div>
    </div>
  </div>
</section>

<style>
  .token-info {
    background: var(--blue-primary);
    color: var(--cream);
    padding: 5rem 2rem;
    position: relative;
    overflow: hidden;
  }

  .token-info::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background:
      radial-gradient(circle at 30% 50%, rgba(69, 123, 157, 0.15) 0%, transparent 50%),
      radial-gradient(circle at 70% 50%, rgba(168, 218, 220, 0.1) 0%, transparent 50%);
    pointer-events: none;
  }

  .token-container {
    max-width: 1200px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4rem;
    align-items: center;
    position: relative;
    z-index: 1;
  }

  .token-content {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .token-title {
    font-size: 3rem;
    font-weight: 800;
    color: var(--white);
    margin: 0;
    letter-spacing: -0.02em;
  }

  .token-description {
    font-size: 1.25rem;
    line-height: 1.6;
    color: var(--cream);
    margin: 0;
    opacity: 0.95;
  }

  .token-features {
    list-style: none;
    padding: 0;
    margin: 1rem 0 0 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .token-features li {
    font-size: 1.1rem;
    color: var(--cream);
    padding-left: 1.5rem;
    position: relative;
  }

  .token-features li::before {
    content: '•';
    position: absolute;
    left: 0;
    color: var(--red-primary);
    font-weight: 900;
    font-size: 1.5rem;
  }

  .token-metrics {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 12px;
    padding: 2.5rem;
  }

  .metrics-title {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--white);
    letter-spacing: 0.1em;
    margin: 0 0 2rem 0;
    text-transform: uppercase;
  }

  .metrics-grid {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .metric-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 1rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.15);
  }

  .metric-row:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  .metric-label {
    font-size: 0.95rem;
    color: var(--cream);
    opacity: 0.9;
  }

  .metric-value {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--white);
  }

  .metric-value.contract {
    font-family: var(--font-mono);
    font-size: 0.9rem;
  }

  @media (max-width: 968px) {
    .token-info {
      padding: 4rem 1.5rem;
    }

    .token-container {
      grid-template-columns: 1fr;
      gap: 3rem;
    }

    .token-title {
      font-size: 2.5rem;
    }

    .token-description {
      font-size: 1.1rem;
    }

    .token-metrics {
      padding: 2rem;
    }
  }

  @media (max-width: 640px) {
    .token-title {
      font-size: 2rem;
    }

    .token-features li {
      font-size: 1rem;
    }

    .metric-row {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }
  }
</style>
