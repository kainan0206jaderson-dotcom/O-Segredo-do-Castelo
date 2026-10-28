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

## Estado

Etapa 0 (fundação): personagem animado andando no Grande Salão com colisão, câmera,
teclado e joystick de toque.
