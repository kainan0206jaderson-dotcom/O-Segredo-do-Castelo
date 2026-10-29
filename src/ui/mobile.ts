/**
 * No celular o jogo roda só na horizontal. Assim que o celular fica deitado, aparece o
 * botão "Tocar para jogar": o navegador só deixa entrar em tela cheia depois de um toque,
 * então esse toque já põe o jogo na tela toda e trava a orientação (Android).
 * No iPhone o Safari não tem tela cheia para páginas: o botão só fecha o aviso e explica
 * como pôr o jogo na Tela de Início, que abre em tela cheia (manifest.webmanifest).
 */
export function setupMobileScreen(): void {
  if (!window.matchMedia('(pointer: coarse)').matches) return;
  const box = document.getElementById('tela-cheia');
  const hint = box?.querySelector('small');
  if (!box || !hint) return;

  const nav = navigator as Navigator & { standalone?: boolean };
  const installed = nav.standalone === true || window.matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches;
  const canFullscreen = typeof document.documentElement.requestFullscreen === 'function';
  let iosHintSeen = false;
  if (!canFullscreen) hint.textContent = 'Dica: para jogar em tela cheia no iPhone, toque em Compartilhar e depois em "Adicionar à Tela de Início".';

  const landscape = window.matchMedia('(orientation: landscape)');
  const refresh = () => {
    const need = canFullscreen ? !document.fullscreenElement : !installed && !iosHintSeen;
    box.classList.toggle('on', landscape.matches && need);
  };

  // o toque no aviso não pode chegar no jogo (senão ele aperta o "Novo jogo" que está embaixo)
  for (const ev of ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'touchstart', 'touchend']) {
    box.addEventListener(ev, (e) => e.stopPropagation());
  }
  box.querySelector('button')?.addEventListener('click', async () => {
    iosHintSeen = true;
    box.classList.remove('on');
    try {
      if (canFullscreen && !document.fullscreenElement) {
        await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
      }
      const orientation = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
      await orientation.lock?.('landscape');
    } catch {
      // navegador não deixou; o jogo continua normal na janela
    }
    refresh();
  });
  landscape.addEventListener('change', refresh);
  document.addEventListener('fullscreenchange', refresh);
  refresh();
}
