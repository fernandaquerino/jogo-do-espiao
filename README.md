# Jogo do Espião

Jogo de festa no estilo Spyfall, em português do Brasil. Todos menos o(s) espião(ões) descobrem um
lugar secreto; os jogadores se fazem perguntas, o espião tenta adivinhar o lugar e os demais tentam
descobrir quem é o espião antes do tempo acabar.

> Status: em desenvolvimento. O modo local (um celular passado de mão em mão) funciona; o modo online
> está sendo construído. Veja [docs/SPEC.md](docs/SPEC.md).

## Para quem é

Grupos de amigos e família jogando na mesma sala ou em videochamada.

## Como jogar

_(em breve: seção completa)_

## Stack

React 19 + Vite + TypeScript, pnpm workspaces. Em construção: NestJS + Socket.IO (servidor).

## Rodando localmente

Requisitos: Node.js 24 LTS (22+ funciona) e pnpm.

```bash
pnpm install
pnpm dev:web
```

## Testes

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Licença

[MIT](LICENSE)
