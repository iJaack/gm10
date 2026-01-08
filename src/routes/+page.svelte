<script>
  import Counter from '$lib/Counter.svelte';
</script>

<svelte:head>
  <title>Ash Strategy - Pokemon Card Tokenization</title>
  <meta name="description" content="Ash Strategy: Tokenized Pokemon Trading Card Fund" />
</svelte:head>

<section>
  <h1>
    <span class="welcome">Ash Strategy</span>
  </h1>
  <p>Tokenizing the Pokemon Card Market Growth</p>
  <p>A blockchain-backed fund investing in graded Pokemon trading cards</p>

  <h2>Why Ash Strategy?</h2>
  <p>The Pokemon Trading Card market is experiencing exponential growth:</p>
  <ul>
    <li><strong>CAGR (2020-2024): 35%+</strong> - Outpacing traditional collectibles</li>
    <li><strong>Market Size:</strong> $3B+ and growing annually</li>
    <li><strong>High-grade cards:</strong> Appreciating 40-60% year-over-year</li>
    <li><strong>Institutional demand:</strong> Major platforms (Courtyard, CollectorCrate) enabling on-chain tokenization</li>
  </ul>

  <h2>The Strategy</h2>
  <p>Ash Strategy tokenizes Pokemon card investments through four phases:</p>

  <div class="phases">
    <div class="phase">
      <h3>Phase 1: Fundraising</h3>
      <p>Target: $1M minimum</p>
      <p>80% → Card Acquisition | 20% → Project Operations</p>
      <p>Issue $CATCH tokens to investors</p>
    </div>

    <div class="phase">
      <h3>Phase 2: Acquisition</h3>
      <p>Purchase graded cards from PSA, BGS, CGC</p>
      <p>Both on-chain (via Courtyard) and off-chain vaults</p>
      <p>Build diversified portfolio across eras</p>
    </div>

    <div class="phase">
      <h3>Phase 3: Tokenization</h3>
      <p>ERC-721 tokens represent each card position</p>
      <p>$CATCH holders own the tokenized assets</p>
      <p>Transparent on-chain portfolio</p>
    </div>

    <div class="phase">
      <h3>Phase 4: Governance</h3>
      <p>$CATCH token holders vote on card trades</p>
      <p>Buy/sell decisions based on market analysis</p>
      <p>Participate in fund growth</p>
    </div>
  </div>

  <h2>The $CATCH Token</h2>
  <p>Your entry ticket to Pokemon card appreciation:</p>
  <ul>
    <li>Represents proportional ownership in the fund</li>
    <li>Governance rights via DAO voting</li>
    <li>Direct exposure to card market growth</li>
    <li>Transparent, on-chain portfolio tracking</li>
  </ul>

  <div class="cta">
    <a href="/fundraising">Join the Fundraising</a>
    <a href="/portfolio">View Portfolio</a>
    <a href="/governance">Governance</a>
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
    width: 100%;
    text-align: center;
    font-size: 2.5rem;
    margin: 1rem 0;
  }

  .welcome {
    display: block;
    position: relative;
    width: 100%;
    height: auto;
	margin-top: 2rem;
    color: #ff3e00;
    font-weight: bold;
  }

  h2 {
    font-size: 1.8rem;
    margin: 2rem 0 1rem 0;
    text-align: center;
  }

  p {
    text-align: center;
    margin: 0.5rem 0;
    max-width: 600px;
  }

  ul {
    max-width: 600px;
    margin: 1rem auto;
  }

  li {
    margin: 0.5rem 0;
    text-align: left;
  }

  .phases {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 2rem;
    max-width: 1000px;
    margin: 2rem auto;
    padding: 0 1rem;
  }

  .phase {
background: rgba(180, 100, 220, 0.6);		backdrop-filter: blur(10px) saturate(180%);
		border: 1px solid rgba(255, 255, 255, 0.18);
		box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border-radius: 12px;
    padding: 1.5rem;
    color: white;

  }

  .phase h3 {
    margin-top: 0;
    margin-bottom: 1rem;
    font-size: 1.3rem;
  }

  .phase p {
    margin: 0.75rem 0;
    text-align: left;
    color: white;
  }

  .cta {
    display: flex;
    gap: 1rem;
    margin: 2rem 0;
    flex-wrap: wrap;
    justify-content: center;
  }

  .cta a {
    padding: 0.75rem 1.5rem;
    background: #ff3e00;
    color: white;
    text-decoration: none;
    		background: rgba(255, 62, 0, 0.2);
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

    h2 {
      font-size: 1.4rem;
    }

    .phases {
      grid-template-columns: 1fr;
    }

    .cta a {
      width: 100%;
      text-align: center;
    }
  }
</style>
