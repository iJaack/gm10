<section class="value-props">
  <div class="value-container">
    <h2 class="section-title">Why Pokémon Cards? Why Now?</h2>

    <div class="props-grid">
      <div class="prop-card">
        <div class="prop-icon">📈</div>
        <div class="prop-stat">35%+ CAGR</div>
        <div class="prop-period">2020-2024</div>
        <p class="prop-description">
          Graded cards outperform S&P 500
        </p>
      </div>

      <div class="prop-card">
        <div class="prop-icon">💎</div>
        <div class="prop-stat">$3B+ Market</div>
        <div class="prop-period">Size</div>
        <p class="prop-description">
          Growing 20%+ annually
        </p>
      </div>

      <div class="prop-card">
        <div class="prop-icon">🏛️</div>
        <div class="prop-stat">Institutional</div>
        <div class="prop-period">Adoption</div>
        <p class="prop-description">
          Courtyard, CollectorCrate enabling tokenization
        </p>
      </div>
    </div>
  </div>
</section>

<style>
  .value-props {
    background: var(--cream);
    padding: 5rem 2rem;
  }

  .value-container {
    max-width: 1200px;
    margin: 0 auto;
  }

  .section-title {
    font-size: 2.5rem;
    font-weight: 800;
    color: var(--blue-primary);
    text-align: center;
    margin: 0 0 4rem 0;
    letter-spacing: -0.02em;
  }

  .props-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 3rem;
  }

  .prop-card {
    background: var(--white);
    padding: 3rem 2rem;
    border-radius: 12px;
    text-align: center;
    border: 2px solid var(--blue-pale);
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
  }

  .prop-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, var(--red-primary) 0%, var(--blue-light) 100%);
    transform: scaleX(0);
    transition: transform 0.3s ease;
  }

  .prop-card:hover {
    transform: translateY(-8px);
    box-shadow: 0 12px 40px rgba(29, 53, 87, 0.15);
    border-color: var(--blue-light);
  }

  .prop-card:hover::before {
    transform: scaleX(1);
  }

  .prop-icon {
    font-size: 3rem;
    margin-bottom: 1.5rem;
    line-height: 1;
  }

  .prop-stat {
    font-size: 2rem;
    font-weight: 800;
    color: var(--blue-primary);
    margin-bottom: 0.5rem;
    line-height: 1.2;
  }

  .prop-period {
    font-size: 1.1rem;
    color: var(--blue-light);
    font-weight: 600;
    margin-bottom: 1rem;
  }

  .prop-description {
    font-size: 1rem;
    color: var(--blue-primary);
    line-height: 1.6;
    margin: 0;
    opacity: 0.8;
  }

  @media (max-width: 968px) {
    .value-props {
      padding: 4rem 1.5rem;
    }

    .section-title {
      font-size: 2rem;
      margin-bottom: 3rem;
    }

    .props-grid {
      grid-template-columns: 1fr;
      gap: 2rem;
    }

    .prop-card {
      padding: 2rem 1.5rem;
    }
  }

  @media (max-width: 640px) {
    .section-title {
      font-size: 1.75rem;
    }

    .prop-icon {
      font-size: 2.5rem;
      margin-bottom: 1rem;
    }

    .prop-stat {
      font-size: 1.5rem;
    }
  }
</style>
