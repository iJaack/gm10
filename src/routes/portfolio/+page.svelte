<script>
</script>

<svelte:head>
  <title>Portfolio - Ash Strategy</title>
  <meta name="description" content="Ash Strategy portfolio holdings" />
</svelte:head>

<section>
  <h1>Fund Portfolio</h1>
  <p>Track our Pokemon card investments in real-time</p>

  <div class="portfolio-stats">
    <div class="stat">
      <h3>Total Cards</h3>
      <p class="number">0</p>
      <p>Coming soon</p>
    </div>

    <div class="stat">
      <h3>Portfolio Value</h3>
      <p class="number">$0</p>
      <p>Pending fundraising</p>
    </div>

    <div class="stat">
      <h3>Avg Grade</h3>
      <p class="number">-</p>
      <p>Professional grading</p>
    </div>
  </div>

  <h2>Grading Companies</h2>
  <p>We acquire from all major graders:</p>
  <div class="graders">
    <div class="grader">PSA</div>
    <div class="grader">BGS</div>
    <div class="grader">CGC</div>
    <div class="grader">SGC</div>
  </div>

  <h2>Portfolio Diversification</h2>
  <p>Strategy focuses on:</p>
  <ul>
    <li>Base set and original release cards</li>
    <li>High-grade specimens (8.0+)</li>
    <li>High-demand vintage Pokemon (Charizard, Blastoise, Venusaur)</li>
    <li>Promotional and first editions</li>
  </ul>

  <div class="cta">
    <a href="/">Back to Home</a>
  </div>
</section>

<style>
  section {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    flex: 1;
    padding: 2rem 1rem;
  }

  h1 {
    color: #ff3e00;
    font-size: 2.5rem;
    margin: 1rem 0;
    text-align: center;
  }

  h2 {
    font-size: 1.8rem;
    margin: 2rem 0 1rem 0;
    text-align: center;
  }

  p {
    text-align: center;
    margin: 0.5rem 0;
  }

  .portfolio-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 2rem;
    margin: 2rem 0;
    width: 100%;
    max-width: 800px;
  }

  .stat {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 1.5rem;
    border-radius: 12px;
    color: white;
    text-align: center;
  }

  .stat h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1rem;
  }

  .number {
    font-size: 2rem;
    font-weight: bold;
    margin: 0.5rem 0;
  }

  .graders {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
    gap: 1rem;
    max-width: 600px;
    margin: 1.5rem auto;
  }

  .grader {
    background: #f0f0f0;
    padding: 1rem;
    text-align: center;
    border-radius: 8px;
    font-weight: bold;
    border: 2px solid #667eea;
  }

  ul {
    max-width: 600px;
    margin: 1rem auto;
    text-align: left;
  }

  li {
    margin: 0.75rem 0;
  }

  .cta {
    display: flex;
    gap: 1rem;
    margin: 2rem 0;
    justify-content: center;
  }

  .cta a {
    padding: 0.75rem 1.5rem;
    background: #ff3e00;
    color: white;
    text-decoration: none;
    border-radius: 6px;
    font-weight: bold;
    transition: background 0.3s ease;
  }

  .cta a:hover {
    background: #e63800;
  }

  @media (max-width: 768px) {
    h1 {
      font-size: 2rem;
    }

    .portfolio-stats {
      grid-template-columns: 1fr;
    }
  }
</style>
