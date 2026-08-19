import { Conversation } from '@elevenlabs/client';
import './style.css';

const agentId = import.meta.env.VITE_ELEVENLABS_AGENT_ID || 'agent_2201m07k477kepfsq9p5h8bh4x1g';
const modal = document.querySelector('.modal');
const copy = document.querySelector('.modal-copy');
const start = document.querySelector('.start');
const stop = document.querySelector('.stop');
const error = document.querySelector('.error');
const status = document.querySelector('.status strong');
const menuButton = document.querySelector('.menu-toggle');
let conversation = null;

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!reducedMotion) {
  const revealSelectors = [
    'main .eyebrow', 'main h2', '.section-lead', '.steps > div > p:not(.eyebrow)',
    '.operation-copy > p:not(.eyebrow)', '.section-heading > p', '.scenario-grid article',
    '.steps li', '.operation-visuals figure', '.architecture-flow article',
    '.protection-grid article', '.incident-grid article', '.source-list a',
    '.faq-list details', '.footer-main > div', '.partner-block > div', '.footer-bottom span'
  ];
  const revealItems = document.querySelectorAll(revealSelectors.join(','));
  const staggerGroups = document.querySelectorAll(
    '.scenario-grid,.steps ol,.operation-visuals,.architecture-flow,.protection-grid,.incident-grid,.source-list,.faq-list,.footer-main,.partner-logos'
  );
  const bentoGroups = document.querySelectorAll(
    '.scenario-grid,.operation-visuals,.architecture-flow,.protection-grid,.incident-grid'
  );
  const bentoCards = [];

  revealItems.forEach((element) => element.classList.add('reveal'));
  staggerGroups.forEach((group) => [...group.children].forEach((child, index) => {
    child.style.setProperty('--reveal-delay', `${Math.min(index, 7) * 70}ms`);
  }));
  bentoGroups.forEach((group) => {
    group.classList.add('bento-stack');
    [...group.children].forEach((card, index) => {
      card.classList.add('bento-card');
      card.style.setProperty('--bento-index', index);
      card.style.setProperty('--stack-top', `${92 + Math.min(index, 6) * 6}px`);
      card.style.setProperty('--stack-progress', '0');
      card.style.setProperty('--stack-offset', '28px');
      card.style.setProperty('--stack-scale', '.965');
      card.style.setProperty('--stack-shadow-y', '12px');
      card.style.setProperty('--stack-shadow-blur', '26px');
      card.style.setProperty('--stack-shadow-alpha', '.12');
      bentoCards.push(card);

      card.addEventListener('pointermove', (event) => {
        if (!window.matchMedia('(min-width: 700px) and (hover: hover)').matches) return;
        const rect = card.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
        card.style.setProperty('--tilt-x', `${(0.5 - y) * 4}deg`);
        card.style.setProperty('--tilt-y', `${(x - 0.5) * 5}deg`);
        card.style.setProperty('--glow-x', `${x * 100}%`);
        card.style.setProperty('--glow-y', `${y * 100}%`);
        card.classList.add('is-pointer-active');
      });
      card.addEventListener('pointerleave', () => {
        card.style.setProperty('--tilt-x', '0deg');
        card.style.setProperty('--tilt-y', '0deg');
        card.classList.remove('is-pointer-active');
      });
    });
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -9% 0px', threshold: 0.08 });

  revealItems.forEach((element) => observer.observe(element));
  document.body.classList.add('motion-ready');

  const progress = document.createElement('div');
  progress.className = 'scroll-progress';
  progress.setAttribute('aria-hidden', 'true');
  document.body.prepend(progress);

  const hero = document.querySelector('.hero');
  let ticking = false;
  const updateScrollEffects = () => {
    const scrollTop = window.scrollY;
    const scrollRange = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.transform = `scaleX(${scrollRange > 0 ? scrollTop / scrollRange : 0})`;
    if (hero && scrollTop < hero.offsetHeight + 160) {
      hero.style.setProperty('--hero-parallax', `${Math.min(scrollTop * 0.1, 72)}px`);
    }
    const mobileStack = window.innerWidth < 700;
    bentoCards.forEach((card) => {
      if (!mobileStack) {
        card.style.setProperty('--stack-progress', '1');
        card.style.setProperty('--stack-offset', '0px');
        card.style.setProperty('--stack-scale', '1');
        return;
      }
      const stickyTop = Number.parseFloat(card.style.getPropertyValue('--stack-top')) || 92;
      const distanceToStack = card.getBoundingClientRect().top - stickyTop;
      const stackProgress = Math.max(0, Math.min(1, 1 - distanceToStack / 150));
      card.style.setProperty('--stack-progress', stackProgress.toFixed(3));
      card.style.setProperty('--stack-offset', `${((1 - stackProgress) * 28).toFixed(2)}px`);
      card.style.setProperty('--stack-scale', (.965 + stackProgress * .035).toFixed(4));
      card.style.setProperty('--stack-shadow-y', `${(12 + stackProgress * 10).toFixed(2)}px`);
      card.style.setProperty('--stack-shadow-blur', `${(26 + stackProgress * 18).toFixed(2)}px`);
      card.style.setProperty('--stack-shadow-alpha', (.12 + stackProgress * .12).toFixed(3));
    });
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(updateScrollEffects);
  }, { passive: true });
  window.addEventListener('resize', updateScrollEffects, { passive: true });
  updateScrollEffects();
}

copy.textContent = agentId
  ? "Décrivez votre situation. Si un danger est détecté, le bot vous dira immédiatement d'appeler le 112."
  : "Le parcours vocal sera activé après validation de l'agent et des scénarios de sécurité. Le contenu et l'architecture sont déjà prêts pour les tests."
start.disabled = !agentId;
if (!agentId) start.textContent = 'Agent de test en préparation';

function toggle(open) {
  modal.classList.toggle('open', open);
  modal.setAttribute('aria-hidden', String(!open));
}

document.querySelectorAll('.call-trigger').forEach((button) => button.addEventListener('click', () => toggle(true)));
document.querySelector('.close').addEventListener('click', () => toggle(false));
document.querySelector('.backdrop').addEventListener('click', () => toggle(false));
menuButton.addEventListener('click', () => {
  const open = document.body.classList.toggle('menu-open');
  menuButton.setAttribute('aria-expanded', String(open));
});
document.querySelectorAll('.site-header nav a').forEach((link) => link.addEventListener('click', () => {
  document.body.classList.remove('menu-open');
  menuButton.setAttribute('aria-expanded', 'false');
}));

start.addEventListener('click', async () => {
  error.textContent = '';
  status.textContent = 'Connexion…';
  try {
    await navigator.mediaDevices.getUserMedia({ audio: true });
    conversation = await Conversation.startSession({
      agentId,
      connectionType: 'webrtc',
      dynamicVariables: { territory: 'belgium', channel: 'public_demo', knowledge_version: '2026.08.17-v0.1' },
      onConnect: () => { status.textContent = 'Le bot vous écoute'; start.hidden = true; stop.hidden = false; },
      onModeChange: ({ mode }) => { status.textContent = mode === 'speaking' ? 'Le bot vous répond' : 'Le bot vous écoute'; },
      onDisconnect: () => { conversation = null; status.textContent = 'Prêt'; start.hidden = false; stop.hidden = true; },
      onError: (message) => { error.textContent = String(message || 'Connexion impossible.'); }
    });
  } catch (exception) {
    status.textContent = 'Prêt';
    error.textContent = /permission|denied|notallowed/i.test(String(exception)) ? 'Autorisez le microphone puis réessayez.' : 'Connexion impossible. Réessayez.';
  }
});

stop.addEventListener('click', async () => {
  if (conversation) await conversation.endSession();
});
