<script>
  export let icon = '📊';
  export let title = '';
  export let subtitle = '';
</script>

<section class="page-hero">
  <div class="hero-container">
    <div class="icon">{icon}</div>
    <h1 class="title">{title}</h1>
    <p class="subtitle">{subtitle}</p>
  </div>
</section>

<style>
  .page-hero {
    background: var(--blue-primary);
    color: var(--cream);
    padding: 8rem 2rem 4rem;
    text-align: center;
    position: relative;
    overflow: hidden;
  }

  .page-hero::before {
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
    max-width: 800px;
    margin: 0 auto;
    position: relative;
    z-index: 1;
  }

  .icon {
    font-size: 4rem;
    margin-bottom: 1rem;
    display: inline-block;
    animation: float 3s ease-in-out infinite;
  }

  @keyframes float {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-10px);
    }
  }

  .title {
    font-size: 3rem;
    font-weight: 800;
    color: var(--white);
    margin: 0 0 1rem 0;
    letter-spacing: -0.02em;
  }

  .subtitle {
    font-size: 1.25rem;
    color: var(--cream);
    margin: 0;
    opacity: 0.95;
    line-height: 1.6;
  }

  @media (max-width: 968px) {
    .page-hero {
      padding: 6rem 1.5rem 3rem;
    }

    .icon {
      font-size: 3rem;
    }

    .title {
      font-size: 2.5rem;
    }

    .subtitle {
      font-size: 1.1rem;
    }
  }

  @media (max-width: 640px) {
    .page-hero {
      padding: 5rem 1rem 2.5rem;
    }

    .icon {
      font-size: 2.5rem;
    }

    .title {
      font-size: 2rem;
    }

    .subtitle {
      font-size: 1rem;
    }
  }
</style>
