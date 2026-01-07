<script>
</script>

<svelte:head>
  <title>Fundraising - Ash Strategy</title>
  <meta name="description" content="Join the Ash Strategy fundraising round" />
</svelte:head>

<section>
  <h1>Join the Fundraising Round</h1>
  <p>Be part of the Pokemon card tokenization revolution</p>

  <div class="fundraising-info">
    <div class="metric">
      <h3>Target Raise</h3>
      <p class="amount">$1,000,000</p>
      <p>Minimum to launch</p>
    </div>

    <div class="metric">
      <h3>Fund Allocation</h3>
      <p class="amount">80%</p>
      <p>Card Acquisition</p>
      <p class="amount" style="font-size: 1.2rem;">20%</p>
      <p>Operations</p>
    </div>

    <div class="metric">
      <h3>Participation</h3>
      <p class="amount">Buy $CATCH</p>
      <p>Tokens representing fund shares</p>
    </div>
  </div>

  <h2>Fundraising Benefits</h2>
  <ul>
    <li>Direct exposure to high-growth Pokemon card market</li>
    <li>Diversified portfolio across all major grading companies</li>
    <li>Governance rights via $CATCH token voting</li>
    <li>Transparent on-chain portfolio tracking</li>
    <li>Professional acquisition strategy with expert selection</li>
  </ul>

  <div class="cta">
    <a href="/">Back to Home</a>
    <button>Interested? Coming Soon</button>
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

  .fundraising-info {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 2rem;
    margin: 2rem 0;
    width: 100%;
    max-width: 1000px;
  }

  .metric {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 2rem;
    border-radius: 12px;
    color: white;
    text-align: center;
  }

  .metric h3 {
    margin-top: 0;
    margin-bottom: 1rem;
    font-size: 1.2rem;
  }

  .metric p {
    margin: 0.5rem 0;
  }

  .amount {
    font-size: 1.8rem;
    font-weight: bold;
    margin: 0.5rem 0;
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
    flex-wrap: wrap;
    justify-content: center;
  }

  .cta a, .cta button {
    padding: 0.75rem 1.5rem;
    background: #ff3e00;
    color: white;
    text-decoration: none;
    border: none;
    border-radius: 6px;
    font-weight: bold;
    cursor: pointer;
    transition: background 0.3s ease;
  }

  .cta a:hover, .cta button:hover {
    background: #e63800;
  }

  @media (max-width: 768px) {
    h1 {
      font-size: 2rem;
    }

    .fundraising-info {
      grid-template-columns: 1fr;
    }
  }
</style>
