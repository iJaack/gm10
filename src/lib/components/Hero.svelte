<section class="hero">
  <div class="hero-container">
    <div class="hero-content">
      <h1 class="hero-title">
        Invest in Pokémon<br />Card Alpha
      </h1>
      <p class="hero-subtitle">
        Tokenized exposure to graded card market growth.<br />
        Transparent. Liquid. On-chain.
      </p>
      <div class="hero-ctas">
        <a href="/fundraising" class="btn-primary">Invest Now</a>
        <a href="/portfolio" class="link-secondary">View Portfolio →</a>
      </div>
    </div>

    <div class="hero-image">
      <div class="cards-placeholder">
        <div class="card-visual card-1">
          <div class="card-grade">PSA 10</div>
        </div>
        <div class="card-visual card-2">
          <div class="card-grade">BGS 9.5</div>
        </div>
        <div class="card-visual card-3">
          <div class="card-grade">CGC 9</div>
        </div>
      </div>
    </div>
  </div>
</section>

<style>
  .hero {
    background: var(--blue-primary);
    color: var(--cream);
    padding: 8rem 2rem 6rem;
    position: relative;
    overflow: hidden;
  }

  .hero::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background:
      radial-gradient(circle at 20% 50%, rgba(69, 123, 157, 0.15) 0%, transparent 50%),
      radial-gradient(circle at 80% 50%, rgba(168, 218, 220, 0.1) 0%, transparent 50%);
    pointer-events: none;
  }

  .hero-container {
    max-width: 1200px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4rem;
    align-items: center;
    position: relative;
    z-index: 1;
  }

  .hero-content {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .hero-title {
    font-size: 3.5rem;
    font-weight: 800;
    line-height: 1.1;
    margin: 0;
    color: var(--white);
    letter-spacing: -0.02em;
  }

  .hero-subtitle {
    font-size: 1.25rem;
    line-height: 1.6;
    color: var(--cream);
    margin: 0;
    opacity: 0.95;
  }

  .hero-ctas {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }

  .btn-primary {
    padding: 1rem 2.5rem;
    background: var(--red-primary);
    color: var(--white);
    text-decoration: none;
    font-weight: 700;
    font-size: 1.1rem;
    border-radius: 6px;
    transition: all 0.3s ease;
    display: inline-block;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  .btn-primary:hover {
    background: var(--red-dark);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(230, 57, 70, 0.4);
  }

  .link-secondary {
    color: var(--cream);
    text-decoration: none;
    font-weight: 600;
    font-size: 1rem;
    transition: all 0.2s ease;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }

  .link-secondary:hover {
    color: var(--white);
    transform: translateX(4px);
  }

  .hero-image {
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .cards-placeholder {
    position: relative;
    width: 100%;
    max-width: 400px;
    height: 500px;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .card-visual {
    position: absolute;
    width: 220px;
    height: 320px;
    background: linear-gradient(135deg, var(--blue-light) 0%, var(--blue-pale) 100%);
    border-radius: 12px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
    border: 3px solid rgba(255, 255, 255, 0.2);
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding: 1rem;
    transition: transform 0.3s ease;
  }

  .card-visual:hover {
    transform: translateY(-10px) scale(1.05);
    z-index: 10;
  }

  .card-1 {
    transform: rotate(-8deg) translateX(-40px);
    z-index: 3;
  }

  .card-2 {
    transform: rotate(0deg);
    z-index: 2;
  }

  .card-3 {
    transform: rotate(8deg) translateX(40px);
    z-index: 1;
  }

  .card-grade {
    background: rgba(255, 255, 255, 0.95);
    color: var(--blue-primary);
    padding: 0.5rem 1rem;
    border-radius: 4px;
    font-weight: 700;
    font-size: 0.9rem;
  }

  @media (max-width: 968px) {
    .hero {
      padding: 6rem 1.5rem 4rem;
    }

    .hero-container {
      grid-template-columns: 1fr;
      gap: 3rem;
    }

    .hero-title {
      font-size: 2.5rem;
    }

    .hero-subtitle {
      font-size: 1.1rem;
    }

    .cards-placeholder {
      height: 400px;
      max-width: 300px;
    }

    .card-visual {
      width: 180px;
      height: 260px;
    }
  }

  @media (max-width: 640px) {
    .hero-title {
      font-size: 2rem;
    }

    .hero-ctas {
      width: 100%;
    }

    .btn-primary {
      width: 100%;
      text-align: center;
    }
  }
</style>
