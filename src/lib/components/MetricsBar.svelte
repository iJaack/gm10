<script>
  export let aum = '$127,450';
  export let nav = '$1.24';
  export let ytd = '+18.4%';
  export let cardsCount = '23';
</script>

<section class="metrics-bar">
  <div class="metrics-container">
    <div class="metrics-grid">
      <div class="metric">
        <div class="metric-label">AUM</div>
        <div class="metric-value">{aum}</div>
      </div>

      <div class="metric">
        <div class="metric-label">NAV</div>
        <div class="metric-value">{nav}</div>
        <div class="metric-sublabel">per CATCH</div>
      </div>

      <div class="metric">
        <div class="metric-label">YTD</div>
        <div class="metric-value positive">{ytd}</div>
      </div>

      <div class="metric">
        <div class="metric-label">Cards</div>
        <div class="metric-value">{cardsCount}</div>
        <div class="metric-sublabel">Holdings</div>
      </div>
    </div>

    <div class="trust-logos">
      <div class="trust-label">Trusted by</div>
      <div class="logos">
        <span class="logo-badge">PSA</span>
        <span class="logo-badge">BGS</span>
        <span class="logo-badge">CGC</span>
        <span class="logo-badge">Courtyard</span>
        <span class="logo-badge">Ethereum</span>
      </div>
    </div>
  </div>
</section>

<style>
  .metrics-bar {
    background: var(--white);
    padding: 3rem 2rem;
    border-bottom: 1px solid rgba(29, 53, 87, 0.1);
  }

  .metrics-container {
    max-width: 1200px;
    margin: 0 auto;
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 2rem;
    margin-bottom: 3rem;
  }

  .metric {
    text-align: center;
    padding: 1.5rem;
    border-radius: 8px;
    background: linear-gradient(135deg, var(--cream) 0%, var(--white) 100%);
    border: 1px solid var(--blue-pale);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  .metric:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(29, 53, 87, 0.1);
  }

  .metric-label {
    font-size: 0.85rem;
    color: var(--blue-light);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.5rem;
  }

  .metric-value {
    font-size: 2rem;
    font-weight: 800;
    color: var(--blue-primary);
    margin-bottom: 0.25rem;
  }

  .metric-value.positive {
    color: #10b981;
  }

  .metric-sublabel {
    font-size: 0.75rem;
    color: var(--blue-light);
    opacity: 0.8;
  }

  .trust-logos {
    text-align: center;
  }

  .trust-label {
    font-size: 0.85rem;
    color: var(--blue-light);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 1rem;
  }

  .logos {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-wrap: wrap;
    gap: 1.5rem;
  }

  .logo-badge {
    display: inline-block;
    padding: 0.5rem 1rem;
    background: var(--cream);
    color: var(--blue-primary);
    font-weight: 700;
    font-size: 0.9rem;
    border-radius: 4px;
    border: 1px solid var(--blue-pale);
    transition: all 0.2s ease;
  }

  .logo-badge:hover {
    background: var(--blue-pale);
    transform: scale(1.05);
  }

  @media (max-width: 968px) {
    .metrics-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: 1.5rem;
    }
  }

  @media (max-width: 640px) {
    .metrics-bar {
      padding: 2rem 1rem;
    }

    .metrics-grid {
      grid-template-columns: 1fr;
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .metric {
      padding: 1rem;
    }

    .metric-value {
      font-size: 1.5rem;
    }

    .logos {
      gap: 1rem;
    }

    .logo-badge {
      font-size: 0.8rem;
      padding: 0.4rem 0.8rem;
    }
  }
</style>
