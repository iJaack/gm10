<script>
  export let image = '';
  export let name = '';
  export let set = '';
  export let grade = '';
  export let grader = '';
  export let price = '';
  export let performance = '';
  export let performanceValue = 0;
</script>

<div class="card-tile">
  <div class="card-image">
    {#if image}
      <img src={image} alt={name} />
    {:else}
      <div class="card-placeholder">🎴</div>
    {/if}
    <div class="card-grade" class:psa={grader === 'PSA'} class:bgs={grader === 'BGS'} class:cgc={grader === 'CGC'}>
      {grader} {grade}
    </div>
  </div>

  <div class="card-info">
    <h3 class="card-name">{name}</h3>
    <p class="card-set">{set}</p>

    <div class="card-stats">
      <div class="card-price">{price}</div>
      {#if performance}
        <div class="card-performance" class:positive={performanceValue >= 0} class:negative={performanceValue < 0}>
          {performance} {performanceValue >= 0 ? '▲' : '▼'}
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .card-tile {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 12px;
    overflow: hidden;
    transition: all 0.3s ease;
    cursor: pointer;
  }

  .card-tile:hover {
    border-color: var(--accent-yellow);
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(252, 211, 77, 0.15);
  }

  .card-image {
    position: relative;
    width: 100%;
    aspect-ratio: 3 / 4;
    background: var(--bg-elevated);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  .card-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .card-placeholder {
    font-size: 4rem;
    opacity: 0.3;
  }

  .card-grade {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    padding: 0.4rem 0.75rem;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(10px);
    border-radius: 6px;
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--text-primary);
    border: 1px solid var(--border);
  }

  .card-grade.psa {
    border-color: #c41e3a;
    background: rgba(196, 30, 58, 0.2);
  }

  .card-grade.bgs {
    border-color: #ffd700;
    background: rgba(255, 215, 0, 0.2);
  }

  .card-grade.cgc {
    border-color: #1e90ff;
    background: rgba(30, 144, 255, 0.2);
  }

  .card-info {
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .card-name {
    font-size: 1.15rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0;
    line-height: 1.3;
  }

  .card-set {
    font-size: 0.9rem;
    color: var(--text-muted);
    margin: 0;
  }

  .card-stats {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 0.5rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--border);
  }

  .card-price {
    font-size: 1.25rem;
    font-weight: 800;
    color: var(--text-primary);
  }

  .card-performance {
    font-size: 0.95rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .card-performance.positive {
    color: var(--accent-green);
  }

  .card-performance.negative {
    color: var(--accent-red);
  }

  @media (max-width: 640px) {
    .card-info {
      padding: 1rem;
    }

    .card-name {
      font-size: 1rem;
    }

    .card-price {
      font-size: 1.1rem;
    }

    .card-performance {
      font-size: 0.85rem;
    }
  }
</style>
