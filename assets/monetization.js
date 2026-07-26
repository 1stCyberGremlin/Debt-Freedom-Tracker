(() => {
  const KEY = 'dft_premium_test';
  const premium = () => localStorage.getItem(KEY) === 'on';
  const locked = ['Payoff Simulator', 'Goals', 'Charts', 'Annual Review'];

  function showPremium(message) {
    document.querySelector('#premium-test-sheet')?.remove();
    const sheet = document.createElement('div');
    sheet.id = 'premium-test-sheet';
    sheet.className = 'premium-overlay';
    sheet.innerHTML = `<section class="premium-sheet"><h2>Debt Freedom Tracker Premium</h2><p class="sub">${message || 'Unlock advanced tools and remove ads.'}</p><div class="premium-benefits"><div>Unlimited tracking</div><div>Advanced payoff plans and charts</div><div>Goals, annual review, advanced exports</div><div>No ads</div></div><div class="price-grid"><div class="price-option"><span>Monthly</span><strong>$2.99</strong></div><div class="price-option recommended"><span>Annual</span><strong>$19.99</strong></div></div><div class="premium-actions"><button class="premium-action primary" id="unlock-test">Unlock Premium for Testing</button><button class="premium-action secondary" id="restore-test">Restore Purchases</button><button class="premium-action link" id="close-test">Not now</button></div><p class="premium-note">Test controls only. Google Play Billing will replace them before release.</p></section>`;
    document.body.appendChild(sheet);
    sheet.querySelector('#close-test').onclick = () => sheet.remove();
    sheet.querySelector('#restore-test').onclick = () => alert('Restore Purchases will be connected after the Google Play products are created.');
    sheet.querySelector('#unlock-test').onclick = () => { localStorage.setItem(KEY, 'on'); sheet.remove(); location.reload(); };
  }

  function enhance() {
    const title = document.querySelector('.screen-title')?.textContent?.trim();
    const actions = document.querySelector('.top-actions');
    if (actions && !actions.querySelector('.monetization-chip')) {
      const chip = document.createElement('button');
      chip.className = 'monetization-chip' + (premium() ? ' is-premium' : '');
      chip.textContent = premium() ? 'Premium' : 'Free';
      chip.onclick = () => showPremium(premium() ? 'Premium testing mode is active.' : 'Upgrade to remove ads and unlock advanced tools.');
      actions.prepend(chip);
    }

    document.querySelectorAll('button').forEach((button) => {
      const label = button.childNodes[button.childNodes.length - 1]?.textContent?.trim() || button.textContent.trim();
      if (!premium() && locked.includes(label) && !button.dataset.premiumLock) {
        button.dataset.premiumLock = '1';
        const badge = document.createElement('span');
        badge.className = 'premium-lock-badge';
        badge.textContent = 'PREMIUM';
        button.appendChild(badge);
        button.addEventListener('click', (event) => { event.preventDefault(); event.stopImmediatePropagation(); showPremium(label + ' is a Premium feature.'); }, true);
      }
    });

    document.querySelectorAll('.test-ad').forEach((item) => item.remove());
    if (!premium() && ['Dashboard', 'Payment Calendar', 'More'].includes(title)) {
      const content = document.querySelector('.content');
      if (content) {
        const ad = document.createElement('aside');
        ad.className = 'test-ad';
        ad.innerHTML = '<strong>Advertisement · Test placement</strong>AdMob banner will appear here in the release version.';
        content.appendChild(ad);
      }
    }

    if (title === 'More') {
      const content = document.querySelector('.content');
      if (content && !content.querySelector('.premium-card')) {
        const card = document.createElement('section');
        card.className = 'premium-card';
        card.innerHTML = premium() ? '<h3>Premium active</h3><p>Advanced features are unlocked and ads are hidden.</p><button class="premium-open" id="disable-premium-test">Disable test mode</button>' : '<h3>Upgrade to Premium</h3><p>Get advanced payoff tools, charts, goals, annual reviews, unlimited tracking, and no ads.</p><button class="premium-open" id="open-premium-test">View Premium</button>';
        content.prepend(card);
        card.querySelector('#open-premium-test')?.addEventListener('click', () => showPremium());
        card.querySelector('#disable-premium-test')?.addEventListener('click', () => { localStorage.removeItem(KEY); location.reload(); });
      }
    }
  }

  new MutationObserver(() => requestAnimationFrame(enhance)).observe(document.documentElement, { childList: true, subtree: true });
  setTimeout(enhance, 300);
})();