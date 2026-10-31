# Magia & Bruxaria: O Segredo do Castelo

Aventura em pixel art 2D top-down (Phaser 3 + TypeScript + Vite).

## Rodar

```bash
npm install
npm run dev        # abre em http://localhost:5173
npm test           # testes unitários
npm run build      # gera dist/ para publicar
node tools/capturas.mjs capturas/antes      # com o dev rodando: uma captura por sala (PC 16:9 e celular deitado)
python3 tools/comparar.py capturas/antes capturas/depois capturas/lado-a-lado
```

`SALAS=biblioteca,cozinha node tools/capturas.mjs ...` captura só algumas salas.

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
- Etapa 3: bolsa e itens coletáveis, feitiços (Lumen) com troca rápida, caldeirão com
  receitas reais da casa, grimório com abas (Bolsa, Feitiços, Receitas, Missões),
  segunda missão (Luz na Cozinha, com a fada cozinheira Dona Brasa) e o primeiro
  desafio opcional (Velas do Salão), que ensina o feitiço extra Fogos Bruxos.
- Etapa 4: Ato 1 completo. Novas salas (Corredor dos Quadros, Gabinete do Diretor,
  Hall da Escada), o Ministro da Magia Baltazar Bonfatti e a escolha da casa com capa própria, Levitar,
  estátuas para empurrar, sombrinhas para espantar, pedestais das quatro pedras,
  aparições rápidas de Bellatrix, níveis com vida, energia e poder, tutoriais curtos,
  ficha do aprendiz no grimório, missão secundária (Dama do Chá) e a Corrida de
  Levitação. Depois do fim do ato o castelo fica livre para explorar.
- Etapa 5: Atos 2 e 3 e o final. Biblioteca, Aula de Seres Espectrais (desafio de
  três levas), Estufa, Observatório, Galeria dos Quadros, quatro quadros-provas e o Coração
  do Castelo. Feitiços Revelar, Escudo e Abrir; cartas da Amélia; duelo em duas fases com a
  Bellatrix; cerimônia, créditos e jogo livre depois do final. Elenco do castelo: fantasmas
  Booh, Mister Addam e Dona Lágrima, gnomos Mary, Mish Mish e Wish Wish (missão do
  esconde-esconde) e a lenda do castelo escondido em São Paulo.

## A história em uma página

- O castelo sempre existiu em São Paulo, escondido por bruxos antigos, e se revelou à cidade há 5 anos.
  Na primeira noite do aprendiz, uma Estrela Perdida o leva até lá e o castelo "acorda" para ele (prólogo).
- Nessa noite, a Diretora Merlina e os professores estavam em reunião na Ala dos Professores. A Bellatrix
  Lestrelle, ex-aluna do Ministro Bonfatti, apagou as velas e trancou a Ala e a escada com um selo de fuligem.
  Por isso, no Ato 1, só o Bonfatti (que se trancou no gabinete), o Trinco, a Dona Brasa e os quadros ajudam.
- O nome da vilã só aparece na cena do Hall. Quebrado o selo, os professores saem da Ala, mas a fuligem empurra
  de volta quem já é do castelo: só o aprendiz, que chegou hoje, passa. Os professores ajudam do seu jeito.
- As cartas brancas são do Bonfatti para a Bellatrix ("Querida B."). Ele pediu à Amélia que as entregasse; quando
  a Bellatrix chegou, a Amélia rasgou e escondeu os pedaços. No final, são elas que convencem a vilã.
- O Aristóteles ensina Seres Espectrais (sala ao lado da Biblioteca) e Literatura Mágica na Ala; nesta noite ele
  está na Biblioteca e deixou um bilhete na sala de Literatura.

## Conteúdo do jogo

Textos, diálogos, missões e itens ficam em `content/` como JSON, sem código:

- `content/dialogues/*.json`: falas, escolhas, condições (`when`) e efeitos (`effects`).
- `content/quests.json`: missões e etapas, com o objetivo mostrado na tela.
- `content/items.json`: itens (objetos, ingredientes e poções).
- `content/spells.json`: feitiços principais e extras, com o que cada um afeta.
- `content/recipes.json`: receitas do caldeirão (ingredientes e resultado).
- `content/challenges.json`: desafios opcionais de exploração, tempo, alvos e recompensa.
- `content/houses.json`: as quatro casas e a capa de cada uma.
- `content/progression.json`: níveis (experiência, vida, energia, poder) e recarga de energia.
- `content/tutorials.json`: tutoriais curtos que aparecem na primeira vez de cada coisa.

`npm test` verifica se toda fala, item, missão e diálogo citado existe.

## Qualidade visual (PRs #20 a #23)

- **Grade fixa de 16 px**: todo sprite, tile e móvel é desenhado na mesma densidade; nada é
  ampliado com escala quebrada. O mundo aparece 1,5x em todas as salas e aparelhos
  (`WORLD_SCALE` em `src/config/game.ts`), e `RENDER_ZOOM` é sempre par para isso cair em
  pixels inteiros. PC 16:9 e celular deitado mostram a mesma altura de sala.
- **HUD**: posições em `src/ui/hudLayout.ts`; `tests/hudLayout.test.ts` garante que nada se
  cobre nem corta de 480 a 640 de largura.
- **Luz e sombra**: `src/world/Lighting.ts` (sombra no chão, halo das velas, facho de luar com poeira,
  arandelas automáticas nas paredes) e `src/world/Darkness.ts` (camada de noite por sala com buracos e cor de luz).
  A força e a cor da noite de cada sala ficam em `src/world/ambiente.ts`, e mudam com a história (a cozinha só
  clareia depois que as velas acendem; depois do final, o castelo inteiro fica mais claro). Vinheta leve na câmera.
- **Cenário**: `tools/art_cenario.py` (estantes, tapetes, mesa de leitura, candelabro, globo,
  pilha de livros, relógio, atril). Peças com vários quadros variam pelo lugar na sala.
- **Progresso pelo EventBus** (`src/core/EventBus.ts`, `src/systems/progress.ts`): as regras
  viram eventos (`quest:started`, `quest:advanced`, `quest:done`, `item:got`,
  `spell:learned`, `level:up`, `dialogue:start`, `dialogue:end`). O HUD comemora cada etapa
  e o jogo salva na hora em que o progresso muda, não só ao trocar de sala.

### Problemas visuais restantes

- Personagens humanos e fantasmas têm 2 tiles (16x32, etapa 6), alongados com `stretch()` a
  partir das grades antigas; gnomos, Trinco e Fuxico seguem 16x16 de propósito. Uma passada à
  mão nos quadros de andar de lado deixaria o passo mais natural.
- Contorno dos personagens é "colorido" (tom escuro da cor vizinha), não preto puro; os móveis
  novos já usam contorno escuro.
- Assoalho de pedra igual em quase todas as salas; falta uma variação por ala (cozinha com
  ladrilho, gabinete com madeira escura).
- O contorno de destaque ao aproximar usa o brilho do WebGL; em aparelhos sem WebGL fica só
  o "!" e o pulinho.
- Painel da missão cobre um pedaço da sala no canto superior esquerdo quando o objetivo tem
  3 linhas; uma opção de recolher o painel ajudaria no celular.
- Halos das velas são iguais em todas as salas; salas escuras (porão, Quadro da Coragem)
  poderiam escurecer o resto para a luz contar mais.
- Transição entre salas é um escurecer/clarear (320 ms); um efeito próprio (cortina de
  estrelas) daria mais personalidade.
