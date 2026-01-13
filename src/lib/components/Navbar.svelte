<script>
  import { page } from '$app/stores';

  $: currentPath = $page.url.pathname;
</script>

<nav class="navbar">
  <div class="navbar-container">
    <div class="navbar-brand">
      <a href="/">
        <span class="logo">⚡</span>
        <span class="brand-name">Ash Strategy</span>
      </a>
    </div>

    <ul class="navbar-links">
      <li class:active={currentPath === '/'}>
        <a href="/">Home</a>
      </li>
      <li class:active={currentPath === '/portfolio'}>
        <a href="/portfolio">Portfolio</a>
      </li>
      <li class:active={currentPath === '/governance'}>
        <a href="/governance">Governance</a>
      </li>
    </ul>

    <div class="navbar-cta">
      <a href="/fundraising" class="invest-btn">Invest</a>
    </div>
  </div>
</nav>

<style>
  .navbar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 1000;
    background: rgba(26, 26, 36, 0.95);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid var(--border);
  }

  .navbar-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1rem 2rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .navbar-brand a {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    text-decoration: none;
    color: var(--text-primary);
  }

  .logo {
    font-size: 1.5rem;
  }

  .brand-name {
    font-size: 1.25rem;
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  .navbar-links {
    display: flex;
    list-style: none;
    margin: 0;
    padding: 0;
    gap: 2rem;
  }

  .navbar-links li {
    position: relative;
  }

  .navbar-links a {
    color: var(--text-secondary);
    text-decoration: none;
    font-weight: 500;
    font-size: 0.95rem;
    transition: color 0.2s ease;
  }

  .navbar-links a:hover {
    color: var(--text-primary);
  }

  .navbar-links li.active a {
    color: var(--text-primary);
  }

  .navbar-links li.active::after {
    content: '';
    position: absolute;
    bottom: -0.5rem;
    left: 0;
    right: 0;
    height: 2px;
    background: var(--accent-yellow);
  }

  .navbar-cta .invest-btn {
    padding: 0.6rem 1.5rem;
    background: var(--accent-yellow);
    color: var(--bg-dark);
    text-decoration: none;
    font-weight: 600;
    font-size: 0.95rem;
    border-radius: 4px;
    transition: all 0.2s ease;
    display: inline-block;
  }

  .navbar-cta .invest-btn:hover {
    background: #fde68a;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(252, 211, 77, 0.4);
  }

  @media (max-width: 768px) {
    .navbar-container {
      flex-wrap: wrap;
      padding: 1rem;
    }

    .navbar-links {
      order: 3;
      width: 100%;
      flex-direction: column;
      gap: 0.5rem;
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .navbar-cta {
      margin-left: auto;
    }
  }
</style>
