<script>
  import { onMount } from 'svelte';

  let mounted = false;
  onMount(() => {
    mounted = true;
  });
</script>

<section class="hero">
  <!-- Animated background elements -->
  <div class="hero-bg-orb orb-1"></div>
  <div class="hero-bg-orb orb-2"></div>
  <div class="hero-bg-orb orb-3"></div>
  <div class="hero-glow"></div>

  <div class="hero-container">
    <div class="hero-content" class:mounted>
      <div class="hero-badge">
        <span class="badge-icon">⚡</span>
        <span>Built on Avalanche</span>
      </div>
      <h1 class="hero-title">
        Invest in <span class="gradient-text">Pokémon</span><br />Card Alpha
      </h1>
      <p class="hero-subtitle">
        Tokenized exposure to graded card market growth.<br />
        Transparent. Liquid. On-chain.
      </p>
      <div class="hero-ctas">
        <a href="/fundraising" class="btn-primary">
          <span>Invest Now</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </a>
        <a href="/portfolio" class="link-secondary">View Portfolio →</a>
      </div>
      <div class="hero-stats">
        <div class="stat">
          <span class="stat-value">$127K+</span>
          <span class="stat-label">AUM</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat">
          <span class="stat-value">23</span>
          <span class="stat-label">Cards</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat">
          <span class="stat-value">+18.4%</span>
          <span class="stat-label">YTD</span>
        </div>
      </div>
    </div>

    <div class="hero-image" class:mounted>
      <div class="cards-showcase">
        <!-- PSA 10 Charizard 1st Edition Base Set -->
        <div class="graded-card card-1">
          <div class="card-glow psa-glow"></div>
          <div class="card-frame psa-frame">
            <div class="card-inner">
              <img
                src="https://images.pokemontcg.io/base1/4_hires.png"
                alt="Charizard 1st Edition Base Set"
                class="card-image"
                loading="eager"
              />
            </div>
            <div class="grade-label psa-label">
              <span class="grader-name">PSA</span>
              <span class="grade-score">GEM MT 10</span>
            </div>
          </div>
          <div class="card-info-tag">
            <span class="card-name">Charizard</span>
            <span class="card-set">1st Ed. Base Set</span>
          </div>
        </div>

        <!-- TAG 10 Pikachu Illustrator -->
        <div class="graded-card card-2">
          <div class="card-glow tag-glow"></div>
          <div class="card-frame tag-frame">
            <div class="card-inner">
              <img
                src="https://images.pokemontcg.io/basep/4_hires.png"
                alt="Pikachu Illustrator"
                class="card-image"
                loading="eager"
              />
            </div>
            <div class="grade-label tag-label">
              <span class="grader-name">TAG</span>
              <span class="grade-score">PRISTINE 10</span>
            </div>
          </div>
          <div class="card-info-tag">
            <span class="card-name">Pikachu</span>
            <span class="card-set">Illustrator Promo</span>
          </div>
        </div>

        <!-- CGC 10 Pristine Mewtwo -->
        <div class="graded-card card-3">
          <div class="card-glow cgc-glow"></div>
          <div class="card-frame cgc-frame">
            <div class="card-inner">
              <img
                src="https://images.pokemontcg.io/base1/10_hires.png"
                alt="Mewtwo Base Set"
                class="card-image"
                loading="eager"
              />
            </div>
            <div class="grade-label cgc-label">
              <span class="grader-name">CGC</span>
              <span class="grade-score">PRISTINE 10</span>
            </div>
          </div>
          <div class="card-info-tag">
            <span class="card-name">Mewtwo</span>
            <span class="card-set">Base Set Holo</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<style>
  .hero {
    background: linear-gradient(135deg, #0a0f1c 0%, #1a1f3c 50%, #0d1829 100%);
    color: var(--cream);
    padding: 8rem 2rem 6rem;
    position: relative;
    overflow: hidden;
    min-height: 100vh;
    display: flex;
    align-items: center;
  }

  /* Animated background orbs */
  .hero-bg-orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
    opacity: 0.5;
    animation: float 20s ease-in-out infinite;
  }

  .orb-1 {
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, rgba(230, 57, 70, 0.4) 0%, transparent 70%);
    top: -200px;
    right: -100px;
    animation-delay: 0s;
  }

  .orb-2 {
    width: 500px;
    height: 500px;
    background: radial-gradient(circle, rgba(69, 123, 157, 0.5) 0%, transparent 70%);
    bottom: -150px;
    left: -100px;
    animation-delay: -7s;
  }

  .orb-3 {
    width: 400px;
    height: 400px;
    background: radial-gradient(circle, rgba(168, 218, 220, 0.3) 0%, transparent 70%);
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    animation-delay: -14s;
  }

  .hero-glow {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background:
      radial-gradient(ellipse 80% 50% at 50% 0%, rgba(230, 57, 70, 0.15) 0%, transparent 50%),
      radial-gradient(ellipse 60% 40% at 80% 100%, rgba(69, 123, 157, 0.2) 0%, transparent 50%);
    pointer-events: none;
  }

  @keyframes float {
    0%, 100% { transform: translate(0, 0) scale(1); }
    25% { transform: translate(30px, -30px) scale(1.05); }
    50% { transform: translate(-20px, 20px) scale(0.95); }
    75% { transform: translate(-30px, -20px) scale(1.02); }
  }

  .hero-container {
    max-width: 1400px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 1fr 1.2fr;
    gap: 4rem;
    align-items: center;
    position: relative;
    z-index: 1;
    width: 100%;
  }

  .hero-content {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    opacity: 0;
    transform: translateY(30px);
    transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .hero-content.mounted {
    opacity: 1;
    transform: translateY(0);
  }

  .hero-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    background: linear-gradient(135deg, rgba(230, 57, 70, 0.2) 0%, rgba(230, 57, 70, 0.1) 100%);
    border: 1px solid rgba(230, 57, 70, 0.3);
    padding: 0.5rem 1rem;
    border-radius: 50px;
    font-size: 0.85rem;
    font-weight: 600;
    color: #ff6b7a;
    width: fit-content;
    backdrop-filter: blur(10px);
  }

  .badge-icon {
    font-size: 1rem;
  }

  .hero-title {
    font-size: 4rem;
    font-weight: 800;
    line-height: 1.05;
    margin: 0;
    color: var(--white);
    letter-spacing: -0.03em;
  }

  .gradient-text {
    background: linear-gradient(135deg, #ff6b7a 0%, #ffd93d 50%, #6bcf7f 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .hero-subtitle {
    font-size: 1.25rem;
    line-height: 1.7;
    color: rgba(255, 255, 255, 0.7);
    margin: 0;
  }

  .hero-ctas {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    align-items: center;
    margin-top: 0.5rem;
  }

  .btn-primary {
    padding: 1rem 2rem;
    background: linear-gradient(135deg, #E63946 0%, #ff6b7a 100%);
    color: var(--white);
    text-decoration: none;
    font-weight: 700;
    font-size: 1.1rem;
    border-radius: 12px;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    display: inline-flex;
    align-items: center;
    gap: 0.75rem;
    box-shadow:
      0 4px 15px rgba(230, 57, 70, 0.4),
      0 0 40px rgba(230, 57, 70, 0.2);
    position: relative;
    overflow: hidden;
  }

  .btn-primary::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s ease;
  }

  .btn-primary:hover {
    transform: translateY(-3px) scale(1.02);
    box-shadow:
      0 8px 30px rgba(230, 57, 70, 0.5),
      0 0 60px rgba(230, 57, 70, 0.3);
  }

  .btn-primary:hover::before {
    left: 100%;
  }

  .link-secondary {
    color: rgba(255, 255, 255, 0.8);
    text-decoration: none;
    font-weight: 600;
    font-size: 1rem;
    transition: all 0.3s ease;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem 1.5rem;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.15);
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(10px);
  }

  .link-secondary:hover {
    color: var(--white);
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.3);
    transform: translateX(4px);
  }

  .hero-stats {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    margin-top: 1.5rem;
    padding: 1.25rem 1.5rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    width: fit-content;
  }

  .stat {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .stat-value {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--white);
    background: linear-gradient(135deg, #fff 0%, rgba(255, 255, 255, 0.8) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .stat-label {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.5);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-weight: 600;
  }

  .stat-divider {
    width: 1px;
    height: 40px;
    background: linear-gradient(180deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  }

  .hero-image {
    display: flex;
    justify-content: center;
    align-items: center;
    opacity: 0;
    transform: translateY(30px);
    transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.2s;
  }

  .hero-image.mounted {
    opacity: 1;
    transform: translateY(0);
  }

  .cards-showcase {
    position: relative;
    width: 100%;
    max-width: 550px;
    height: 580px;
    display: flex;
    justify-content: center;
    align-items: center;
    perspective: 1000px;
  }

  .graded-card {
    position: absolute;
    transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
    cursor: pointer;
  }

  .card-glow {
    position: absolute;
    width: 100%;
    height: 100%;
    border-radius: 12px;
    filter: blur(30px);
    opacity: 0.6;
    transition: all 0.5s ease;
  }

  .psa-glow {
    background: linear-gradient(135deg, #ff4757 0%, #ff6b81 100%);
  }

  .tag-glow {
    background: linear-gradient(135deg, #ffd93d 0%, #ffb347 100%);
  }

  .cgc-glow {
    background: linear-gradient(135deg, #6bcf7f 0%, #4ecdc4 100%);
  }

  .card-frame {
    position: relative;
    width: 200px;
    padding: 12px;
    border-radius: 12px;
    background: linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 100%);
    box-shadow:
      0 25px 80px rgba(0, 0, 0, 0.5),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }

  .psa-frame {
    background: linear-gradient(180deg, #c41e3a 0%, #8b1528 50%, #5a0f1a 100%);
    border: 2px solid #ff4757;
  }

  .tag-frame {
    background: linear-gradient(180deg, #d4af37 0%, #b8860b 50%, #8b6914 100%);
    border: 2px solid #ffd93d;
  }

  .cgc-frame {
    background: linear-gradient(180deg, #228b22 0%, #1a6b1a 50%, #0f4f0f 100%);
    border: 2px solid #6bcf7f;
  }

  .card-inner {
    background: linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%);
    border-radius: 6px;
    overflow: hidden;
    aspect-ratio: 2.5/3.5;
  }

  .card-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.5s ease;
  }

  .graded-card:hover .card-image {
    transform: scale(1.05);
  }

  .grade-label {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 8px 0 4px;
    text-align: center;
  }

  .grader-name {
    font-size: 0.9rem;
    font-weight: 800;
    letter-spacing: 0.15em;
    color: white;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  }

  .grade-score {
    font-size: 0.7rem;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.9);
    letter-spacing: 0.1em;
  }

  .card-info-tag {
    position: absolute;
    bottom: -45px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(10px);
    padding: 8px 16px;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    opacity: 0;
    transition: all 0.3s ease;
    white-space: nowrap;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .graded-card:hover .card-info-tag {
    opacity: 1;
    bottom: -50px;
  }

  .card-name {
    font-weight: 700;
    font-size: 0.9rem;
    color: white;
  }

  .card-set {
    font-size: 0.7rem;
    color: rgba(255, 255, 255, 0.6);
  }

  /* Card positions */
  .card-1 {
    transform: rotate(-12deg) translateX(-120px) translateY(20px);
    z-index: 3;
  }

  .card-2 {
    transform: rotate(0deg) translateY(-20px);
    z-index: 4;
  }

  .card-3 {
    transform: rotate(12deg) translateX(120px) translateY(20px);
    z-index: 2;
  }

  /* Hover effects */
  .graded-card:hover {
    z-index: 10 !important;
  }

  .card-1:hover {
    transform: rotate(-5deg) translateX(-100px) translateY(-20px) scale(1.1);
  }

  .card-1:hover .card-glow {
    opacity: 1;
    filter: blur(40px);
  }

  .card-2:hover {
    transform: rotate(0deg) translateY(-50px) scale(1.15);
  }

  .card-2:hover .card-glow {
    opacity: 1;
    filter: blur(40px);
  }

  .card-3:hover {
    transform: rotate(5deg) translateX(100px) translateY(-20px) scale(1.1);
  }

  .card-3:hover .card-glow {
    opacity: 1;
    filter: blur(40px);
  }

  @media (max-width: 1200px) {
    .hero-container {
      grid-template-columns: 1fr 1fr;
      gap: 3rem;
    }

    .hero-title {
      font-size: 3.2rem;
    }

    .cards-showcase {
      max-width: 450px;
      height: 500px;
    }

    .card-frame {
      width: 170px;
    }

    .card-1 {
      transform: rotate(-12deg) translateX(-100px) translateY(20px);
    }

    .card-3 {
      transform: rotate(12deg) translateX(100px) translateY(20px);
    }
  }

  @media (max-width: 968px) {
    .hero {
      padding: 6rem 1.5rem 4rem;
      min-height: auto;
    }

    .hero-container {
      grid-template-columns: 1fr;
      gap: 3rem;
    }

    .hero-content {
      text-align: center;
      align-items: center;
    }

    .hero-title {
      font-size: 2.8rem;
    }

    .hero-subtitle {
      font-size: 1.1rem;
    }

    .hero-ctas {
      justify-content: center;
    }

    .hero-stats {
      margin-left: auto;
      margin-right: auto;
    }

    .cards-showcase {
      height: 450px;
      max-width: 400px;
    }

    .card-frame {
      width: 150px;
      padding: 10px;
    }

    .card-1 {
      transform: rotate(-10deg) translateX(-85px) translateY(15px);
    }

    .card-3 {
      transform: rotate(10deg) translateX(85px) translateY(15px);
    }

    .grader-name {
      font-size: 0.8rem;
    }

    .grade-score {
      font-size: 0.6rem;
    }
  }

  @media (max-width: 640px) {
    .hero {
      padding: 5rem 1rem 3rem;
    }

    .hero-title {
      font-size: 2.2rem;
    }

    .hero-subtitle br {
      display: none;
    }

    .hero-ctas {
      flex-direction: column;
      width: 100%;
    }

    .btn-primary {
      width: 100%;
      justify-content: center;
    }

    .link-secondary {
      width: 100%;
      justify-content: center;
    }

    .hero-stats {
      width: 100%;
      justify-content: center;
    }

    .cards-showcase {
      height: 380px;
      max-width: 320px;
    }

    .card-frame {
      width: 120px;
      padding: 8px;
    }

    .card-1 {
      transform: rotate(-10deg) translateX(-65px) translateY(10px);
    }

    .card-2 {
      transform: rotate(0deg) translateY(-15px);
    }

    .card-3 {
      transform: rotate(10deg) translateX(65px) translateY(10px);
    }

    .card-info-tag {
      display: none;
    }

    .orb-1, .orb-2, .orb-3 {
      display: none;
    }
  }
</style>
