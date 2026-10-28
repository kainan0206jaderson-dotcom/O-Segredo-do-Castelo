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
- Etapa 3: bolsa e itens coletáveis, feitiços (Lumen) com troca rápida, caldeirão com
  receitas reais da casa, grimório com abas (Bolsa, Feitiços, Receitas, Missões),
  segunda missão (Luz na Cozinha, com a fada cozinheira Dona Brasa) e o primeiro
  desafio opcional (Velas do Salão), que ensina o feitiço extra Fogos Bruxos.
- Etapa 4: Ato 1 completo. Novas salas (Corredor dos Quadros, Gabinete do Diretor,
  Hall da Escada), o Ministro da Magia Bartholomeu Bonfatt e a escolha da casa com capa própria, Levitar,
  estátuas para empurrar, sombrinhas para espantar, pedestais das quatro pedras,
  aparições rápidas de Morgana, níveis com vida, energia e poder, tutoriais curtos,
  ficha do aprendiz no grimório, missão secundária (Dama do Chá) e a Corrida de
  Levitação. Depois do fim do ato o castelo fica livre para explorar.
- Etapa 5: Atos 2 e 3 e o final. Biblioteca, Aula de Criaturas Espectrais (desafio de
  três levas), Estufa, Observatório, Galeria dos Quadros, quatro quadros-provas e o Coração
  do Castelo. Feitiços Revelar, Escudo e Abrir; cartas da Amélia; duelo em duas fases com a
  Morgana; cerimônia, créditos e jogo livre depois do final. Elenco do castelo: fantasmas
  Booh, Mister Addam e Dona Lágrima, gnomos Mary, Mish Mish e Wish Wish (missão do
  esconde-esconde) e a lenda do castelo escondido em São Paulo.

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
