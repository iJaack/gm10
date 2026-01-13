<script>
  export let current = 0;
  export let goal = 100;
  export let label = '';

  $: percentage = Math.min((current / goal) * 100, 100);
</script>

<div class="progress-wrapper">
  {#if label}
    <div class="progress-label">{label}</div>
  {/if}
  <div class="progress-bar">
    <div class="progress-fill" style="width: {percentage}%">
      <span class="progress-text">{percentage.toFixed(1)}%</span>
    </div>
  </div>
</div>

<style>
  .progress-wrapper {
    width: 100%;
  }

  .progress-label {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--blue-primary);
    margin-bottom: 0.75rem;
    text-align: center;
  }

  .progress-bar {
    width: 100%;
    height: 40px;
    background: var(--cream);
    border-radius: 20px;
    border: 2px solid var(--blue-pale);
    overflow: hidden;
    position: relative;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--red-primary) 0%, var(--red-dark) 100%);
    border-radius: 18px;
    transition: width 0.5s ease;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding-right: 1rem;
    position: relative;
  }

  .progress-text {
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--white);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  }

  @media (max-width: 640px) {
    .progress-bar {
      height: 35px;
    }

    .progress-text {
      font-size: 0.85rem;
    }
  }
</style>
