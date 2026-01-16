<script>
  const topHoldings = [
    {
      name: 'Charizard',
      set: 'Base Set 1st Ed.',
      grade: 'PSA 10',
      grader: 'psa',
      value: '$12,400',
      ytd: '+24%',
      image: 'https://images.pokemontcg.io/base1/4_hires.png'
    },
    {
      name: 'Pikachu',
      set: 'Illustrator Promo',
      grade: 'TAG 10',
      grader: 'tag',
      value: '$8,200',
      ytd: '+31%',
      image: 'https://images.pokemontcg.io/basep/4_hires.png'
    },
    {
      name: 'Umbreon',
      set: 'Gold Star',
      grade: 'BGS 9.5',
      grader: 'bgs',
      value: '$6,800',
      ytd: '+18%',
      image: 'https://images.pokemontcg.io/pop5/17_hires.png'
    }
  ];
</script>

<section class="portfolio-preview">
  <div class="bg-glow"></div>

  <div class="portfolio-container">
    <div class="section-header">
      <span class="section-badge">Portfolio</span>
      <h2 class="section-title">Current <span class="gradient-text">Holdings</span></h2>
      <p class="section-subtitle">Top-graded cards from our curated collection</p>
    </div>

    <div class="cards-grid">
      {#each topHoldings as card, index}
        <div class="card-item" style="--delay: {index * 0.1}s">
          <div class="card-image-wrapper">
            <div class="card-glow {card.grader}"></div>
            <div class="card-frame {card.grader}">
              <img src={card.image} alt={card.name} class="card-image" loading="lazy" />
            </div>
            <div class="card-grade-badge {card.grader}">{card.grade}</div>
          </div>
          <div class="card-info">
            <h3 class="card-name">{card.name}</h3>
            <p class="card-set">{card.set}</p>
            <div class="card-stats">
              <div class="card-value">{card.value}</div>
              <div class="card-ytd positive">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                </svg>
                {card.ytd}
              </div>
            </div>
          </div>
        </div>
      {/each}
    </div>

    <div class="view-more">
      <a href="/portfolio" class="view-link">
        <span>View Full Portfolio</span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      </a>
    </div>
  </div>
</section>

<style>
  .portfolio-preview {
    background: linear-gradient(180deg, #111827 0%, #0f172a 100%);
    padding: 6rem 2rem;
    position: relative;
    overflow: hidden;
  }

  .bg-glow {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 1000px;
    height: 1000px;
    background: radial-gradient(circle, rgba(255, 217, 61, 0.05) 0%, transparent 50%);
    pointer-events: none;
  }

  .portfolio-container {
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
    background: linear-gradient(135deg, rgba(255, 217, 61, 0.15) 0%, rgba(255, 217, 61, 0.05) 100%);
    border: 1px solid rgba(255, 217, 61, 0.2);
    border-radius: 50px;
    font-size: 0.85rem;
    font-weight: 600;
    color: #ffd93d;
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
  }

  .cards-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 2rem;
    margin-bottom: 3rem;
  }

  .card-item {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
    border-radius: 20px;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.08);
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    cursor: pointer;
    animation: fadeIn 0.6s ease-out var(--delay) both;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .card-item:hover {
    transform: translateY(-12px);
    box-shadow: 0 25px 80px rgba(0, 0, 0, 0.4);
    border-color: rgba(255, 255, 255, 0.15);
  }

  .card-image-wrapper {
    position: relative;
    padding: 2rem;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 320px;
    background: linear-gradient(180deg, rgba(0, 0, 0, 0.2) 0%, transparent 100%);
  }

  .card-glow {
    position: absolute;
    width: 200px;
    height: 280px;
    border-radius: 12px;
    filter: blur(40px);
    opacity: 0.4;
    transition: all 0.4s ease;
  }

  .card-item:hover .card-glow {
    opacity: 0.7;
    filter: blur(50px);
  }

  .card-glow.psa { background: linear-gradient(135deg, #ff4757, #ff6b81); }
  .card-glow.tag { background: linear-gradient(135deg, #ffd93d, #ffb347); }
  .card-glow.bgs { background: linear-gradient(135deg, #457B9D, #6ba3c7); }

  .card-frame {
    position: relative;
    width: 160px;
    padding: 8px;
    border-radius: 10px;
    z-index: 1;
  }

  .card-frame.psa {
    background: linear-gradient(180deg, #c41e3a 0%, #8b1528 100%);
    border: 2px solid #ff4757;
  }

  .card-frame.tag {
    background: linear-gradient(180deg, #d4af37 0%, #8b6914 100%);
    border: 2px solid #ffd93d;
  }

  .card-frame.bgs {
    background: linear-gradient(180deg, #2c5282 0%, #1a365d 100%);
    border: 2px solid #457B9D;
  }

  .card-image {
    width: 100%;
    border-radius: 4px;
    transition: transform 0.4s ease;
  }

  .card-item:hover .card-image {
    transform: scale(1.05);
  }

  .card-grade-badge {
    position: absolute;
    bottom: 1rem;
    left: 50%;
    transform: translateX(-50%);
    padding: 0.5rem 1rem;
    border-radius: 8px;
    font-weight: 700;
    font-size: 0.85rem;
    backdrop-filter: blur(10px);
    z-index: 2;
  }

  .card-grade-badge.psa {
    background: rgba(255, 71, 87, 0.9);
    color: white;
  }

  .card-grade-badge.tag {
    background: rgba(255, 217, 61, 0.9);
    color: #1a1a1a;
  }

  .card-grade-badge.bgs {
    background: rgba(69, 123, 157, 0.9);
    color: white;
  }

  .card-info {
    padding: 1.5rem;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }

  .card-name {
    font-size: 1.35rem;
    font-weight: 800;
    color: white;
    margin: 0 0 0.25rem 0;
  }

  .card-set {
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.5);
    margin: 0 0 1rem 0;
  }

  .card-stats {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 1rem;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }

  .card-value {
    font-size: 1.25rem;
    font-weight: 800;
    color: white;
  }

  .card-ytd {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.9rem;
    font-weight: 700;
    padding: 0.4rem 0.8rem;
    border-radius: 8px;
  }

  .card-ytd.positive {
    background: rgba(107, 207, 127, 0.15);
    color: #6bcf7f;
  }

  .view-more {
    text-align: center;
  }

  .view-link {
    display: inline-flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 1.05rem;
    font-weight: 700;
    color: white;
    text-decoration: none;
    padding: 1rem 2rem;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    transition: all 0.3s ease;
  }

  .view-link:hover {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.08) 100%);
    border-color: rgba(255, 255, 255, 0.2);
    transform: translateX(4px);
  }

  @media (max-width: 968px) {
    .portfolio-preview {
      padding: 4rem 1.5rem;
    }

    .section-title {
      font-size: 2.25rem;
    }

    .section-header {
      margin-bottom: 3rem;
    }

    .cards-grid {
      grid-template-columns: 1fr;
      gap: 1.5rem;
      max-width: 380px;
      margin-left: auto;
      margin-right: auto;
    }

    .card-image-wrapper {
      min-height: 280px;
      padding: 1.5rem;
    }

    .card-frame {
      width: 140px;
    }
  }

  @media (max-width: 640px) {
    .section-title {
      font-size: 1.85rem;
    }

    .section-subtitle {
      font-size: 1rem;
    }

    .card-name {
      font-size: 1.2rem;
    }

    .card-value {
      font-size: 1.1rem;
    }

    .card-ytd {
      font-size: 0.85rem;
    }

    .view-link {
      width: 100%;
      justify-content: center;
    }
  }
</style>
