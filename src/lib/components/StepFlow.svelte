<script>
  export let steps = [];
  // steps format: [{ number: 1, title: 'Step', description: 'Description' }, ...]
</script>

<div class="step-flow">
  {#each steps as step, i}
    <div class="step">
      <div class="number">{step.number}</div>
      <h4 class="step-title">{step.title}</h4>
      <p class="step-description">{step.description}</p>
    </div>
    {#if i < steps.length - 1}
      <div class="arrow">▶</div>
    {/if}
  {/each}
</div>

<style>
  .step-flow {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-wrap: wrap;
    gap: 2rem;
    margin: 3rem 0;
  }

  .step {
    background: var(--cream);
    border: 2px solid var(--blue-pale);
    padding: 2rem 1.5rem;
    border-radius: 12px;
    text-align: center;
    flex: 0 1 200px;
    transition: all 0.3s ease;
  }

  .step:hover {
    transform: translateY(-8px);
    box-shadow: 0 12px 32px rgba(29, 53, 87, 0.15);
    border-color: var(--blue-light);
  }

  .number {
    width: 50px;
    height: 50px;
    background: var(--blue-primary);
    color: var(--white);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    font-size: 1.5rem;
    margin: 0 auto 1rem;
  }

  .step-title {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--blue-primary);
    margin: 0.5rem 0;
  }

  .step-description {
    font-size: 0.9rem;
    color: var(--blue-light);
    margin: 0;
    line-height: 1.5;
  }

  .arrow {
    font-size: 2rem;
    color: var(--blue-light);
    flex: 0 0 auto;
  }

  @media (max-width: 968px) {
    .step-flow {
      flex-direction: column;
      gap: 1.5rem;
    }

    .step {
      flex: 1 1 auto;
      width: 100%;
      max-width: 300px;
    }

    .arrow {
      transform: rotate(90deg);
    }
  }
</style>
