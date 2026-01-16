<script>
  import { page } from '$app/stores';
  import { onMount } from 'svelte';

  $: currentPath = $page.url.pathname;

  let scrolled = false;

  onMount(() => {
    const handleScroll = () => {
      scrolled = window.scrollY > 20;
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  });
</script>

<nav class="navbar" class:scrolled>
  <div class="navbar-container">
    <div class="navbar-brand">
      <a href="/">
        <div class="logo-wrapper">
          <span class="logo">⚡</span>
        </div>
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
      <!-- AppKit Button -->
      <w3m-button />
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
    background: transparent;
    backdrop-filter: blur(0px);
    border-bottom: 1px solid transparent;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .navbar.scrolled {
    background: rgba(10, 15, 28, 0.95);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.3);
  }

  .navbar-container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 1.25rem 2rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    transition: padding 0.3s ease;
  }

  .navbar.scrolled .navbar-container {
    padding: 0.875rem 2rem;
  }

  .navbar-brand a {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    text-decoration: none;
    color: white;
  }

  .logo-wrapper {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, rgba(230, 57, 70, 0.2) 0%, rgba(255, 107, 122, 0.1) 100%);
    border: 1px solid rgba(230, 57, 70, 0.3);
    border-radius: 10px;
    transition: all 0.3s ease;
  }

  .navbar-brand a:hover .logo-wrapper {
    background: linear-gradient(135deg, rgba(230, 57, 70, 0.3) 0%, rgba(255, 107, 122, 0.2) 100%);
    transform: scale(1.05);
    box-shadow: 0 0 20px rgba(230, 57, 70, 0.3);
  }

  .logo {
    font-size: 1.25rem;
  }

  .brand-name {
    font-size: 1.25rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    background: linear-gradient(135deg, #fff 0%, rgba(255, 255, 255, 0.8) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .navbar-links {
    display: flex;
    list-style: none;
    margin: 0;
    padding: 0;
    gap: 0.5rem;
  }

  .navbar-links li {
    position: relative;
  }

  .navbar-links a {
    color: rgba(255, 255, 255, 0.7);
    text-decoration: none;
    font-weight: 500;
    font-size: 0.95rem;
    transition: all 0.2s ease;
    padding: 0.6rem 1rem;
    border-radius: 8px;
    display: block;
  }

  .navbar-links a:hover {
    color: white;
    background: rgba(255, 255, 255, 0.08);
  }

  .navbar-links li.active a {
    color: white;
    background: rgba(230, 57, 70, 0.15);
  }

  .navbar-links li.active::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 20px;
    height: 2px;
    background: linear-gradient(90deg, #E63946, #ff6b7a);
    border-radius: 2px;
  }

  .navbar-cta .invest-btn {
    padding: 0.7rem 1.5rem;
    background: linear-gradient(135deg, #E63946 0%, #ff6b7a 100%);
    color: white;
    text-decoration: none;
    font-weight: 600;
    font-size: 0.9rem;
    border-radius: 10px;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    box-shadow: 0 4px 15px rgba(230, 57, 70, 0.3);
    position: relative;
    overflow: hidden;
  }

  .navbar-cta .invest-btn::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s ease;
  }

  .navbar-cta .invest-btn:hover {
    transform: translateY(-2px) scale(1.02);
    box-shadow: 0 8px 25px rgba(230, 57, 70, 0.4);
  }

  .navbar-cta .invest-btn:hover::before {
    left: 100%;
  }

  @media (max-width: 768px) {
    .navbar {
      background: rgba(10, 15, 28, 0.98);
      backdrop-filter: blur(20px);
    }

    .navbar-container {
      flex-wrap: wrap;
      padding: 1rem;
    }

    .navbar-links {
      order: 3;
      width: 100%;
      flex-direction: column;
      gap: 0.25rem;
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }

    .navbar-links a {
      padding: 0.75rem 1rem;
    }

    .navbar-cta {
      margin-left: auto;
      margin-top: 0; /* check this */
    }

    .logo-wrapper {
      width: 36px;
      height: 36px;
    }
  }
</style>
