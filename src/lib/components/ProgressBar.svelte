<script>
  export let current = 0;
  export let total = 100;
  export let label = '';
  export let showPercentage = true;
  export let color = 'var(--accent-green)';

  $: percentage = Math.min((current / total) * 100, 100);
</script>

<div class="progress-container">
  {#if label}
    <div class="progress-label">
      <span class="label-text">{label}</span>
      {#if showPercentage}
        <span class="label-percentage">{percentage.toFixed(1)}%</span>
      {/if}
    </div>
  {/if}
  <div class="progress-bar">
    <div class="progress-fill" style="width: {percentage}%; background: {color};"></div>
  </div>
</div>

<style>
  .progress-container {
    width: 100%;
  }

  .progress-label {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }

  .label-text {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .label-percentage {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--text-secondary);
  }

  .progress-bar {
    width: 100%;
    height: 12px;
    background: var(--bg-elevated);
    border-radius: 6px;
    overflow: hidden;
    border: 1px solid var(--border);
  }

  .progress-fill {
    height: 100%;
    background: var(--accent-green);
    transition: width 0.3s ease;
    border-radius: 6px;
  }

  @media (max-width: 640px) {
    .label-text {
      font-size: 0.9rem;
    }

    .label-percentage {
      font-size: 0.85rem;
    }

    .progress-bar {
      height: 10px;
    }
  }
</style>
