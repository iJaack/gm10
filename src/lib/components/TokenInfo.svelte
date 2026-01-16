<script>
  export let totalSupply = '100,000';
  export let circulating = '42,350';
  export let price = '$1.24';
  export let contractAddress = '0x...';
</script>

<section class="token-info">
  <div class="bg-orb orb-1"></div>
  <div class="bg-orb orb-2"></div>

  <div class="token-container">
    <div class="token-content">
      <span class="section-badge">Token</span>
      <h2 class="token-title">The <span class="gradient-text">$CATCH</span> Token</h2>
      <p class="token-description">
        Your liquid stake in curated Pokemon card alpha. Fully backed by real assets.
      </p>
      <ul class="token-features">
        <li>
          <div class="feature-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
          </div>
          <div class="feature-text">
            <span class="feature-title">Proportional NAV</span>
            <span class="feature-desc">Token value tied to portfolio</span>
          </div>
        </li>
        <li>
          <div class="feature-icon governance">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div class="feature-text">
            <span class="feature-title">DAO Governance</span>
            <span class="feature-desc">Vote on buy/sell decisions</span>
          </div>
        </li>
        <li>
          <div class="feature-icon chain">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <path d="M3 9h18M9 21V9"/>
            </svg>
          </div>
          <div class="feature-text">
            <span class="feature-title">On-chain Tracking</span>
            <span class="feature-desc">Full transparency on Avalanche</span>
          </div>
        </li>
        <li>
          <div class="feature-icon reports">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
          </div>
          <div class="feature-text">
            <span class="feature-title">Quarterly Reports</span>
            <span class="feature-desc">Detailed performance updates</span>
          </div>
        </li>
      </ul>
    </div>

    <div class="token-metrics">
      <div class="metrics-header">
        <h3 class="metrics-title">Token Metrics</h3>
        <span class="chain-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
          Avalanche
        </span>
      </div>
      <div class="metrics-grid">
        <div class="metric-card">
          <span class="metric-label">Total Supply</span>
          <span class="metric-value">{totalSupply}</span>
        </div>
        <div class="metric-card">
          <span class="metric-label">Circulating</span>
          <span class="metric-value">{circulating}</span>
        </div>
        <div class="metric-card highlight">
          <span class="metric-label">Price</span>
          <span class="metric-value price">{price}</span>
        </div>
        <div class="metric-card">
          <span class="metric-label">Backing</span>
          <span class="metric-value">100% cards</span>
        </div>
      </div>
      <div class="contract-info">
        <span class="contract-label">Contract Address</span>
        <div class="contract-value">
          <code>{contractAddress}</code>
          <button class="copy-btn" aria-label="Copy address">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</section>

<style>
  .token-info {
    background: linear-gradient(180deg, #0a0f1c 0%, #111827 50%, #0f172a 100%);
    color: white;
    padding: 6rem 2rem;
    position: relative;
    overflow: hidden;
  }

  .bg-orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(100px);
    pointer-events: none;
  }

  .orb-1 {
    width: 500px;
    height: 500px;
    background: radial-gradient(circle, rgba(230, 57, 70, 0.15) 0%, transparent 70%);
    top: -150px;
    left: -100px;
  }

  .orb-2 {
    width: 400px;
    height: 400px;
    background: radial-gradient(circle, rgba(107, 207, 127, 0.1) 0%, transparent 70%);
    bottom: -100px;
    right: -100px;
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

  .section-badge {
    display: inline-block;
    padding: 0.5rem 1rem;
    background: linear-gradient(135deg, rgba(107, 207, 127, 0.15) 0%, rgba(107, 207, 127, 0.05) 100%);
    border: 1px solid rgba(107, 207, 127, 0.2);
    border-radius: 50px;
    font-size: 0.85rem;
    font-weight: 600;
    color: #6bcf7f;
    width: fit-content;
    letter-spacing: 0.05em;
  }

  .token-title {
    font-size: 3rem;
    font-weight: 800;
    color: white;
    margin: 0;
    letter-spacing: -0.02em;
  }

  .gradient-text {
    background: linear-gradient(135deg, #ff6b7a 0%, #ffd93d 50%, #6bcf7f 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .token-description {
    font-size: 1.15rem;
    line-height: 1.7;
    color: rgba(255, 255, 255, 0.7);
    margin: 0;
  }

  .token-features {
    list-style: none;
    padding: 0;
    margin: 1rem 0 0 0;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .token-features li {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    padding: 1rem;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    transition: all 0.3s ease;
  }

  .token-features li:hover {
    border-color: rgba(255, 255, 255, 0.15);
    transform: translateX(4px);
  }

  .feature-icon {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, rgba(230, 57, 70, 0.15) 0%, rgba(230, 57, 70, 0.05) 100%);
    border-radius: 10px;
    color: #ff6b7a;
    flex-shrink: 0;
  }

  .feature-icon.governance {
    background: linear-gradient(135deg, rgba(69, 123, 157, 0.15) 0%, rgba(69, 123, 157, 0.05) 100%);
    color: #6ba3c7;
  }

  .feature-icon.chain {
    background: linear-gradient(135deg, rgba(255, 217, 61, 0.15) 0%, rgba(255, 217, 61, 0.05) 100%);
    color: #ffd93d;
  }

  .feature-icon.reports {
    background: linear-gradient(135deg, rgba(107, 207, 127, 0.15) 0%, rgba(107, 207, 127, 0.05) 100%);
    color: #6bcf7f;
  }

  .feature-text {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .feature-title {
    font-weight: 700;
    color: white;
    font-size: 0.95rem;
  }

  .feature-desc {
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.5);
  }

  .token-metrics {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 20px;
    padding: 2rem;
  }

  .metrics-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .metrics-title {
    font-size: 1.1rem;
    font-weight: 700;
    color: white;
    margin: 0;
  }

  .chain-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.4rem 0.75rem;
    background: linear-gradient(135deg, rgba(232, 65, 66, 0.15) 0%, rgba(232, 65, 66, 0.05) 100%);
    border: 1px solid rgba(232, 65, 66, 0.2);
    border-radius: 50px;
    font-size: 0.75rem;
    font-weight: 600;
    color: #e84142;
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .metric-card {
    padding: 1.25rem;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, transparent 100%);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .metric-card.highlight {
    background: linear-gradient(135deg, rgba(107, 207, 127, 0.1) 0%, rgba(107, 207, 127, 0.02) 100%);
    border-color: rgba(107, 207, 127, 0.15);
  }

  .metric-label {
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.5);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 600;
  }

  .metric-value {
    font-size: 1.5rem;
    font-weight: 800;
    color: white;
  }

  .metric-value.price {
    background: linear-gradient(135deg, #6bcf7f 0%, #4ecdc4 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .contract-info {
    padding-top: 1rem;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }

  .contract-label {
    display: block;
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.5);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 600;
    margin-bottom: 0.5rem;
  }

  .contract-value {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 8px;
  }

  .contract-value code {
    flex: 1;
    font-family: var(--font-mono);
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.8);
    background: none;
    padding: 0;
  }

  .copy-btn {
    background: none;
    border: none;
    padding: 0.5rem;
    cursor: pointer;
    color: rgba(255, 255, 255, 0.5);
    border-radius: 6px;
    transition: all 0.2s ease;
  }

  .copy-btn:hover {
    color: white;
    background: rgba(255, 255, 255, 0.1);
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
      font-size: 2.25rem;
    }

    .token-description {
      font-size: 1.05rem;
    }

    .token-metrics {
      padding: 1.5rem;
    }
  }

  @media (max-width: 640px) {
    .token-title {
      font-size: 1.85rem;
    }

    .token-features li {
      padding: 0.875rem;
    }

    .feature-icon {
      width: 36px;
      height: 36px;
    }

    .metrics-grid {
      grid-template-columns: 1fr;
    }

    .metric-value {
      font-size: 1.35rem;
    }
  }
</style>
