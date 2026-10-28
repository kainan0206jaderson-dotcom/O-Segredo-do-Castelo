# Magia & Bruxaria: O Segredo do Castelo

Aventura em pixel art 2D top-down (Phaser 3 + TypeScript + Vite).

## Rodar

```bash
npm install
npm run dev        # abre em http://localhost:5173
npm test           # testes unitários
npm run build      # gera dist/ para publicar
```

## Trocar arte provisória por definitiva

O código nunca cita arquivos de imagem. Ele pede chaves (`player.aprendiz`, `prop.vela`,
`tiles.castelo`) e `public/assets/manifest.json` diz qual PNG atende cada chave, o tamanho
de quadro e quais quadros formam cada animação. Para trocar uma arte, substitua o PNG
(ou aponte a chave para um novo) mantendo os nomes das animações. `npm test` confere se
todos os quadros citados existem na imagem.

A arte atual é provisória e gerada por `tools/gen_placeholder_assets.py`.

## Controles

- PC: WASD ou setas para andar; E, Espaço ou Enter para a ação.
- Celular (só na horizontal): toque e arraste na metade esquerda para andar; botão de estrela para a ação.

## Estado

- Etapa 0: personagem animado, colisão, câmera, AssetRegistry.
- Etapa 1: três salas conectadas (Recepção, Grande Salão, Cozinha Bruxa) com portas,
  transição, nome da sala, joystick e botão de ação no celular, aviso para girar a tela.
- Etapa 2: tela inicial (Continuar / Novo jogo), salvamento automático, NPCs (Trinco e
  Dom Moldura), diálogos com escolhas, primeira missão e objetivo na tela.

## Conteúdo do jogo

Textos, diálogos, missões e itens ficam em `content/` como JSON, sem código:

- `content/dialogues/*.json`: falas, escolhas, condições (`when`) e efeitos (`effects`).
- `content/quests.json`: missões e etapas, com o objetivo mostrado na tela.
- `content/items.json`: itens que podem ser recebidos.

`npm test` verifica se toda fala, item, missão e diálogo citado existe.
