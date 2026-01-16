<section class="value-props">
  <div class="bg-glow glow-1"></div>
  <div class="bg-glow glow-2"></div>

  <div class="value-container">
    <div class="section-header">
      <span class="section-badge">Market Opportunity</span>
      <h2 class="section-title">Why <span class="gradient-text">Pokémon Cards</span>? Why Now?</h2>
      <p class="section-subtitle">The collectibles market is experiencing unprecedented institutional adoption</p>
    </div>

    <div class="props-grid">
      <div class="prop-card">
        <div class="card-glow"></div>
        <div class="prop-icon-wrapper">
          <div class="prop-icon">📈</div>
        </div>
        <div class="prop-stat">35%+ CAGR</div>
        <div class="prop-period">2020-2024</div>
        <p class="prop-description">
          Graded cards outperform S&P 500
        </p>
        <div class="prop-footer">
          <span class="trend positive">Outperforming</span>
        </div>
      </div>

      <div class="prop-card featured">
        <div class="card-glow"></div>
        <div class="featured-badge">Highlighted</div>
        <div class="prop-icon-wrapper">
          <div class="prop-icon">💎</div>
        </div>
        <div class="prop-stat">$3B+ Market</div>
        <div class="prop-period">Size</div>
        <p class="prop-description">
          Growing 20%+ annually
        </p>
        <div class="prop-footer">
          <span class="trend positive">Expanding</span>
        </div>
      </div>

      <div class="prop-card">
        <div class="card-glow"></div>
        <div class="prop-icon-wrapper">
          <div class="prop-icon">🏛️</div>
        </div>
        <div class="prop-stat">Institutional</div>
        <div class="prop-period">Adoption</div>
        <p class="prop-description">
          Courtyard, CollectorCrate enabling tokenization
        </p>
        <div class="prop-footer">
          <span class="trend positive">Growing</span>
        </div>
      </div>
    </div>
  </div>
</section>

<style>
  .value-props {
    background: linear-gradient(180deg, #0d1117 0%, #111827 50%, #0f172a 100%);
    padding: 6rem 2rem;
    position: relative;
    overflow: hidden;
  }

  .bg-glow {
    position: absolute;
    border-radius: 50%;
    filter: blur(100px);
    pointer-events: none;
  }

  .glow-1 {
    width: 500px;
    height: 500px;
    background: radial-gradient(circle, rgba(230, 57, 70, 0.15) 0%, transparent 70%);
    top: -100px;
    left: -100px;
  }

  .glow-2 {
    width: 400px;
    height: 400px;
    background: radial-gradient(circle, rgba(69, 123, 157, 0.15) 0%, transparent 70%);
    bottom: -100px;
    right: -100px;
  }

  .value-container {
    max-width: 1200px;
    margin: 0 auto;
    position: relative;
    z-index: 1;
  }

  .section-header {
    text-align: center;
    margin-bottom: 4rem;
  }

  .section-badge {
    display: inline-block;
    padding: 0.5rem 1rem;
    background: linear-gradient(135deg, rgba(230, 57, 70, 0.15) 0%, rgba(230, 57, 70, 0.05) 100%);
    border: 1px solid rgba(230, 57, 70, 0.2);
    border-radius: 50px;
    font-size: 0.85rem;
    font-weight: 600;
    color: #ff6b7a;
    margin-bottom: 1.5rem;
    letter-spacing: 0.05em;
  }

  .section-title {
    font-size: 3rem;
    font-weight: 800;
    color: white;
    margin: 0 0 1rem 0;
    letter-spacing: -0.02em;
  }

  .gradient-text {
    background: linear-gradient(135deg, #ff6b7a 0%, #ffd93d 50%, #6bcf7f 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .section-subtitle {
    font-size: 1.15rem;
    color: rgba(255, 255, 255, 0.6);
    margin: 0;
    max-width: 500px;
    margin: 0 auto;
  }

  .props-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 2rem;
  }

  .prop-card {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
    padding: 2.5rem 2rem;
    border-radius: 20px;
    text-align: center;
    border: 1px solid rgba(255, 255, 255, 0.08);
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    position: relative;
    overflow: hidden;
    backdrop-filter: blur(10px);
  }

  .card-glow {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 100%;
    background: radial-gradient(ellipse 80% 50% at 50% -20%, rgba(230, 57, 70, 0.15) 0%, transparent 60%);
    opacity: 0;
    transition: opacity 0.4s ease;
    pointer-events: none;
  }

  .prop-card:hover .card-glow {
    opacity: 1;
  }

  .prop-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #E63946 0%, #ffd93d 50%, #6bcf7f 100%);
    transform: scaleX(0);
    transition: transform 0.4s ease;
  }

  .prop-card:hover {
    transform: translateY(-10px);
    border-color: rgba(255, 255, 255, 0.15);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
  }

  .prop-card:hover::before {
    transform: scaleX(1);
  }

  .prop-card.featured {
    background: linear-gradient(135deg, rgba(230, 57, 70, 0.1) 0%, rgba(255, 107, 122, 0.05) 100%);
    border-color: rgba(230, 57, 70, 0.2);
    transform: scale(1.02);
  }

  .prop-card.featured:hover {
    transform: scale(1.02) translateY(-10px);
  }

  .featured-badge {
    position: absolute;
    top: 1rem;
    right: 1rem;
    padding: 0.25rem 0.75rem;
    background: linear-gradient(135deg, #E63946 0%, #ff6b7a 100%);
    border-radius: 50px;
    font-size: 0.7rem;
    font-weight: 700;
    color: white;
    letter-spacing: 0.05em;
  }

  .prop-icon-wrapper {
    width: 80px;
    height: 80px;
    margin: 0 auto 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .prop-icon {
    font-size: 2.5rem;
    line-height: 1;
  }

  .prop-stat {
    font-size: 2rem;
    font-weight: 800;
    color: white;
    margin-bottom: 0.25rem;
    line-height: 1.2;
  }

  .prop-period {
    font-size: 1rem;
    color: rgba(255, 255, 255, 0.5);
    font-weight: 600;
    margin-bottom: 1rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .prop-description {
    font-size: 0.95rem;
    color: rgba(255, 255, 255, 0.7);
    line-height: 1.6;
    margin: 0 0 1.5rem 0;
  }

  .prop-footer {
    padding-top: 1rem;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }

  .trend {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.85rem;
    font-weight: 600;
    padding: 0.35rem 0.75rem;
    border-radius: 50px;
  }

  .trend.positive {
    background: rgba(107, 207, 127, 0.15);
    color: #6bcf7f;
  }

  @media (max-width: 968px) {
    .value-props {
      padding: 4rem 1.5rem;
    }

    .section-title {
      font-size: 2.25rem;
    }

    .section-header {
      margin-bottom: 3rem;
    }

    .props-grid {
      grid-template-columns: 1fr;
      gap: 1.5rem;
      max-width: 400px;
      margin: 0 auto;
    }

    .prop-card {
      padding: 2rem 1.5rem;
    }

    .prop-card.featured {
      transform: none;
    }

    .prop-card.featured:hover {
      transform: translateY(-10px);
    }
  }

  @media (max-width: 640px) {
    .section-title {
      font-size: 1.85rem;
    }

    .section-subtitle {
      font-size: 1rem;
    }

    .prop-icon-wrapper {
      width: 70px;
      height: 70px;
    }

    .prop-icon {
      font-size: 2rem;
    }

    .prop-stat {
      font-size: 1.75rem;
    }
  }
</style>
