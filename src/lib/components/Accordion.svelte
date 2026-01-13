<script>
  export let items = [];
  // items format: [{ question: 'What is...?', answer: 'Answer...' }]

  let openIndex = -1;

  function toggle(index) {
    openIndex = openIndex === index ? -1 : index;
  }
</script>

<div class="accordion">
  {#each items as item, index}
    <div class="accordion-item" class:open={openIndex === index}>
      <button class="accordion-header" on:click={() => toggle(index)}>
        <span class="accordion-icon">{openIndex === index ? '▼' : '▶'}</span>
        <span class="accordion-question">{item.question}</span>
      </button>
      {#if openIndex === index}
        <div class="accordion-content">
          <p>{item.answer}</p>
        </div>
      {/if}
    </div>
  {/each}
</div>

<style>
  .accordion {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .accordion-item {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 8px;
    overflow: hidden;
    transition: all 0.2s ease;
  }

  .accordion-item.open {
    border-color: var(--accent-yellow);
  }

  .accordion-header {
    width: 100%;
    padding: 1.25rem 1.5rem;
    background: none;
    border: none;
    display: flex;
    align-items: center;
    gap: 1rem;
    cursor: pointer;
    text-align: left;
    transition: background 0.2s ease;
  }

  .accordion-header:hover {
    background: var(--bg-elevated);
  }

  .accordion-icon {
    color: var(--accent-yellow);
    font-size: 0.85rem;
    flex-shrink: 0;
    transition: transform 0.2s ease;
  }

  .accordion-question {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
    flex: 1;
  }

  .accordion-content {
    padding: 0 1.5rem 1.5rem 3.5rem;
    animation: slideDown 0.3s ease;
  }

  .accordion-content p {
    margin: 0;
    font-size: 0.95rem;
    color: var(--text-secondary);
    line-height: 1.6;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (max-width: 640px) {
    .accordion-header {
      padding: 1rem;
    }

    .accordion-question {
      font-size: 0.95rem;
    }

    .accordion-content {
      padding: 0 1rem 1rem 2.5rem;
    }

    .accordion-content p {
      font-size: 0.9rem;
    }
  }
</style>
