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
        <div class="metric-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
        </div>
        <div class="metric-content">
          <div class="metric-label">AUM</div>
          <div class="metric-value">{aum}</div>
        </div>
      </div>

      <div class="metric">
        <div class="metric-icon nav-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 6v6l4 2"/>
          </svg>
        </div>
        <div class="metric-content">
          <div class="metric-label">NAV</div>
          <div class="metric-value">{nav}</div>
          <div class="metric-sublabel">per CATCH</div>
        </div>
      </div>

      <div class="metric highlight">
        <div class="metric-icon ytd-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
            <polyline points="17 6 23 6 23 12"/>
          </svg>
        </div>
        <div class="metric-content">
          <div class="metric-label">YTD Return</div>
          <div class="metric-value positive">{ytd}</div>
        </div>
      </div>

      <div class="metric">
        <div class="metric-icon cards-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <path d="M3 9h18M9 21V9"/>
          </svg>
        </div>
        <div class="metric-content">
          <div class="metric-label">Cards</div>
          <div class="metric-value">{cardsCount}</div>
          <div class="metric-sublabel">Holdings</div>
        </div>
      </div>
    </div>

    <div class="trust-section">
      <div class="trust-label">Grading Partners & Infrastructure</div>
      <div class="logos">
        <div class="logo-badge psa">
          <span class="badge-name">PSA</span>
          <span class="badge-type">Grading</span>
        </div>
        <div class="logo-badge bgs">
          <span class="badge-name">BGS</span>
          <span class="badge-type">Grading</span>
        </div>
        <div class="logo-badge cgc">
          <span class="badge-name">CGC</span>
          <span class="badge-type">Grading</span>
        </div>
        <div class="logo-badge courtyard">
          <span class="badge-name">Courtyard</span>
          <span class="badge-type">Custody</span>
        </div>
        <div class="logo-badge avalanche">
          <span class="badge-name">Avalanche</span>
          <span class="badge-type">Chain</span>
        </div>
      </div>
    </div>
  </div>
</section>

<style>
  .metrics-bar {
    background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
    padding: 4rem 2rem;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .metrics-container {
    max-width: 1200px;
    margin: 0 auto;
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1.5rem;
    margin-bottom: 3rem;
  }

  .metric {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.5rem;
    border-radius: 16px;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
    border: 1px solid rgba(255, 255, 255, 0.08);
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .metric:hover {
    transform: translateY(-4px);
    border-color: rgba(255, 255, 255, 0.15);
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  }

  .metric.highlight {
    background: linear-gradient(135deg, rgba(107, 207, 127, 0.1) 0%, rgba(78, 205, 196, 0.05) 100%);
    border-color: rgba(107, 207, 127, 0.2);
  }

  .metric-icon {
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, rgba(230, 57, 70, 0.2) 0%, rgba(230, 57, 70, 0.1) 100%);
    border-radius: 12px;
    color: #ff6b7a;
    flex-shrink: 0;
  }

  .metric-icon.nav-icon {
    background: linear-gradient(135deg, rgba(69, 123, 157, 0.2) 0%, rgba(69, 123, 157, 0.1) 100%);
    color: #6ba3c7;
  }

  .metric-icon.ytd-icon {
    background: linear-gradient(135deg, rgba(107, 207, 127, 0.2) 0%, rgba(107, 207, 127, 0.1) 100%);
    color: #6bcf7f;
  }

  .metric-icon.cards-icon {
    background: linear-gradient(135deg, rgba(255, 217, 61, 0.2) 0%, rgba(255, 217, 61, 0.1) 100%);
    color: #ffd93d;
  }

  .metric-content {
    flex: 1;
    min-width: 0;
  }

  .metric-label {
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.5);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 0.25rem;
  }

  .metric-value {
    font-size: 1.75rem;
    font-weight: 800;
    color: white;
    line-height: 1.2;
  }

  .metric-value.positive {
    background: linear-gradient(135deg, #6bcf7f 0%, #4ecdc4 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .metric-sublabel {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.4);
    margin-top: 0.125rem;
  }

  .trust-section {
    text-align: center;
    padding-top: 2rem;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }

  .trust-label {
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.5);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 1.5rem;
  }

  .logos {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .logo-badge {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0.75rem 1.25rem;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    transition: all 0.3s ease;
    min-width: 100px;
  }

  .logo-badge:hover {
    transform: translateY(-2px);
    border-color: rgba(255, 255, 255, 0.2);
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%);
  }

  .badge-name {
    font-weight: 700;
    font-size: 0.95rem;
    color: white;
    margin-bottom: 0.125rem;
  }

  .badge-type {
    font-size: 0.7rem;
    color: rgba(255, 255, 255, 0.4);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .logo-badge.psa:hover { border-color: rgba(255, 71, 87, 0.4); }
  .logo-badge.bgs:hover { border-color: rgba(69, 123, 157, 0.4); }
  .logo-badge.cgc:hover { border-color: rgba(107, 207, 127, 0.4); }
  .logo-badge.courtyard:hover { border-color: rgba(255, 217, 61, 0.4); }
  .logo-badge.avalanche:hover { border-color: rgba(232, 65, 66, 0.4); }

  @media (max-width: 968px) {
    .metrics-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
    }

    .metric {
      padding: 1.25rem;
    }

    .metric-value {
      font-size: 1.5rem;
    }
  }

  @media (max-width: 640px) {
    .metrics-bar {
      padding: 2.5rem 1rem;
    }

    .metrics-grid {
      grid-template-columns: 1fr;
      gap: 0.75rem;
      margin-bottom: 2rem;
    }

    .metric {
      padding: 1rem;
    }

    .metric-icon {
      width: 40px;
      height: 40px;
    }

    .metric-value {
      font-size: 1.35rem;
    }

    .logos {
      gap: 0.75rem;
    }

    .logo-badge {
      padding: 0.6rem 1rem;
      min-width: 85px;
    }

    .badge-name {
      font-size: 0.85rem;
    }
  }
</style>
