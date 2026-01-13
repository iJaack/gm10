<script>
  export let steps = [];
  // steps format: [{ number: 1, label: 'Connect', subtitle: 'Wallet' }]
</script>

<div class="step-flow">
  {#each steps as step, index}
    <div class="step">
      <div class="step-circle">{step.number || index + 1}</div>
      <div class="step-content">
        <div class="step-label">{step.label}</div>
        {#if step.subtitle}
          <div class="step-subtitle">{step.subtitle}</div>
        {/if}
      </div>
    </div>
    {#if index < steps.length - 1}
      <div class="step-arrow">▶</div>
    {/if}
  {/each}
</div>

<style>
  .step-flow {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 2rem;
    flex-wrap: wrap;
    padding: 2rem 0;
  }

  .step {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    max-width: 150px;
  }

  .step-circle {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: var(--bg-elevated);
    border: 2px solid var(--accent-yellow);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--accent-yellow);
  }

  .step-content {
    text-align: center;
  }

  .step-label {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 0.25rem;
  }

  .step-subtitle {
    font-size: 0.9rem;
    color: var(--text-secondary);
  }

  .step-arrow {
    font-size: 1.5rem;
    color: var(--accent-yellow);
    flex-shrink: 0;
  }

  @media (max-width: 768px) {
    .step-flow {
      flex-direction: column;
      gap: 1rem;
    }

    .step-arrow {
      transform: rotate(90deg);
    }

    .step {
      max-width: 100%;
    }
  }

  @media (max-width: 640px) {
    .step-circle {
      width: 50px;
      height: 50px;
      font-size: 1.25rem;
    }

    .step-label {
      font-size: 1rem;
    }

    .step-subtitle {
      font-size: 0.85rem;
    }
  }
</style>
