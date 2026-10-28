/**
 * No celular o jogo roda só na horizontal. No primeiro toque pedimos tela cheia
 * e travamos a orientação onde o navegador permite (Android). No iPhone, o aviso
 * "gire o celular" do index.html cobre o modo retrato.
 */
export function setupMobileScreen(): void {
  if (!window.matchMedia('(pointer: coarse)').matches) return;

  const goFullscreen = async () => {
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
      }
      const orientation = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
      await orientation.lock?.('landscape');
    } catch {
      // navegador não permite; o aviso de girar continua valendo
    }
  };
  window.addEventListener('pointerup', goFullscreen, { once: true });
}
