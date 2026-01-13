<script>
  const topHoldings = [
    {
      name: 'Charizard',
      set: 'Base Set',
      grade: 'PSA 9',
      value: '$12,400',
      ytd: '+24%'
    },
    {
      name: 'Pikachu',
      set: 'Illustrator',
      grade: 'CGC 8.5',
      value: '$8,200',
      ytd: '+31%'
    },
    {
      name: 'Umbreon',
      set: 'Gold Star',
      grade: 'BGS 9.5',
      value: '$6,800',
      ytd: '+18%'
    }
  ];
</script>

<section class="portfolio-preview">
  <div class="portfolio-container">
    <h2 class="section-title">Current Portfolio Highlights</h2>

    <div class="cards-grid">
      {#each topHoldings as card}
        <div class="card-item">
          <div class="card-image-placeholder">
            <div class="card-grade-badge">{card.grade}</div>
          </div>
          <div class="card-info">
            <h3 class="card-name">{card.name}</h3>
            <p class="card-set">{card.set}</p>
            <div class="card-stats">
              <div class="card-value">{card.value}</div>
              <div class="card-ytd positive">{card.ytd} YTD</div>
            </div>
          </div>
        </div>
      {/each}
    </div>

    <div class="view-more">
      <a href="/portfolio" class="view-link">View Full Portfolio →</a>
    </div>
  </div>
</section>

<style>
  .portfolio-preview {
    background: var(--white);
    padding: 5rem 2rem;
  }

  .portfolio-container {
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

  .cards-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 2.5rem;
    margin-bottom: 3rem;
  }

  .card-item {
    background: var(--cream);
    border-radius: 12px;
    overflow: hidden;
    border: 2px solid var(--blue-pale);
    transition: all 0.3s ease;
    cursor: pointer;
  }

  .card-item:hover {
    transform: translateY(-8px);
    box-shadow: 0 16px 48px rgba(29, 53, 87, 0.2);
    border-color: var(--blue-light);
  }

  .card-image-placeholder {
    position: relative;
    width: 100%;
    height: 280px;
    background: linear-gradient(135deg, var(--blue-light) 0%, var(--blue-pale) 100%);
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding: 1rem;
  }

  .card-grade-badge {
    background: rgba(255, 255, 255, 0.95);
    color: var(--blue-primary);
    padding: 0.5rem 1rem;
    border-radius: 6px;
    font-weight: 700;
    font-size: 0.9rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .card-info {
    padding: 1.5rem;
  }

  .card-name {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--blue-primary);
    margin: 0 0 0.25rem 0;
  }

  .card-set {
    font-size: 0.95rem;
    color: var(--blue-light);
    margin: 0 0 1rem 0;
  }

  .card-stats {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 1rem;
    border-top: 1px solid var(--blue-pale);
  }

  .card-value {
    font-size: 1.25rem;
    font-weight: 800;
    color: var(--blue-primary);
  }

  .card-ytd {
    font-size: 0.95rem;
    font-weight: 700;
    padding: 0.4rem 0.8rem;
    border-radius: 4px;
    background: rgba(16, 185, 129, 0.1);
  }

  .card-ytd.positive {
    color: #10b981;
  }

  .view-more {
    text-align: center;
  }

  .view-link {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--blue-primary);
    text-decoration: none;
    transition: all 0.2s ease;
  }

  .view-link:hover {
    color: var(--red-primary);
    transform: translateX(4px);
  }

  @media (max-width: 968px) {
    .portfolio-preview {
      padding: 4rem 1.5rem;
    }

    .section-title {
      font-size: 2rem;
      margin-bottom: 3rem;
    }

    .cards-grid {
      grid-template-columns: 1fr;
      gap: 2rem;
      max-width: 400px;
      margin-left: auto;
      margin-right: auto;
    }

    .card-image-placeholder {
      height: 240px;
    }
  }

  @media (max-width: 640px) {
    .section-title {
      font-size: 1.75rem;
    }

    .card-name {
      font-size: 1.25rem;
    }

    .card-value {
      font-size: 1.1rem;
    }

    .card-ytd {
      font-size: 0.85rem;
    }
  }
</style>
