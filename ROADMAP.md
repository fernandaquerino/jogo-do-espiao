# Roadmap

Itens planejados depois da Fase 1 (modo online). **Nenhum deles está implementado.** Cada um também está descrito como issue pronta em [docs/ISSUES.md](docs/ISSUES.md).

| # | Item | Área |
|---|---|---|
| 1 | [Fase de votação](#1-fase-de-votação) | game |
| 2 | [Palpite do espião](#2-palpite-do-espião) | game |
| 3 | [Pontuação entre rodadas](#3-pontuação-entre-rodadas) | game |
| 4 | [Pacotes de lugares](#4-pacotes-de-lugares) | content |
| 5 | [Papéis por lugar](#5-papéis-por-lugar) | game |
| 6 | [RoomStore com Redis](#6-roomstore-com-redis) | infra |
| 7 | [Modo espectador para TV](#7-modo-espectador-para-tv) | feature |
| 8 | [Sons e vibração](#8-sons-e-vibração) | polish |
| 9 | [PWA instalável](#9-pwa-instalável) | platform |
| 10 | [Revisão de acessibilidade](#10-revisão-de-acessibilidade) | a11y |
| 11 | [Versão em inglês (i18n)](#11-versão-em-inglês--i18n) | platform |
| 12 | [Métricas anônimas de uso](#12-métricas-anônimas-de-uso) | infra |
| 13 | [Teste de carga com 200 salas](#13-teste-de-carga-com-200-salas) | infra |

## 1. Fase de votação

**Problema.** Hoje a rodada só termina pelo tempo ou quando o anfitrião encerra. Não há como o grupo decidir formalmente quem é o espião.

**Escopo.** Fase `voting` iniciada pelo anfitrião ou por maioria. Cada jogador vota em um suspeito (pode mudar até o fim). Quando a maioria absoluta aponta o mesmo jogador, a rodada termina; se não houver maioria até o tempo de votação acabar, a rodada termina sem acusado. O servidor valida e conta os votos; ninguém vê votos individuais até o fim.

**Critérios de aceite.**

- Só jogadores da sala votam, um voto ativo por jogador, não é possível votar em si mesmo.
- Maioria absoluta encerra a rodada e `round:ended` informa o acusado e se era espião.
- Votos individuais não são enviados antes do fim da votação.
- Testes de serviço (maioria, empate, troca de voto, saída de jogador durante a votação) e de gateway.
- Tela de votação mobile com alvos de toque grandes.

## 2. Palpite do espião

**Problema.** Na regra original o espião pode parar o relógio e tentar adivinhar o lugar; aqui ele só espera.

**Escopo.** Evento `round:guess { location }` enviado só pelo espião. O servidor pausa o relógio, compara o palpite com o lugar (ignorando maiúsculas e acentos) e encerra a rodada com vitória do espião ou dos demais. A lista de lugares possíveis é enviada ao espião durante a rodada.

**Critérios de aceite.**

- Apenas espiões podem palpitar; não espiões recebem `NOT_SPY`.
- Palpite certo encerra a rodada com vitória do espião; errado, com vitória do grupo.
- O relógio de todos para no momento do palpite.
- A lista de lugares chega só ao espião.
- Testes de serviço e de gateway cobrindo os dois resultados.

## 3. Pontuação entre rodadas

**Problema.** Cada rodada é isolada; não há placar para jogar várias seguidas.

**Escopo.** Placar por sala, mantido em memória, com pontos no estilo Spyfall (espião que escapa ou acerta o lugar, grupo que acusa corretamente, bônus ao acusador). Placar exibido no resultado e no lobby; botão para zerar. Depende de voto e palpite para ter vitórias bem definidas.

**Critérios de aceite.**

- Pontos calculados no servidor e documentados no README.
- O placar sobrevive a reconexões e some quando a sala expira.
- Jogador que sai perde sua linha; quem entra começa com zero.
- Testes de cálculo de pontos para cada resultado possível.

## 4. Pacotes de lugares

**Problema.** Existe uma lista única de 41 lugares; grupos diferentes (crianças, trabalho, viagem) querem temas diferentes.

**Escopo.** Dividir os lugares em pacotes (viagem, trabalho, infantil, além do básico) em `game-core`, cada lugar com `packId`. O anfitrião escolhe pacotes no lobby; os lugares personalizados continuam valendo. Mínimo de lugares para iniciar.

**Critérios de aceite.**

- Pelo menos 3 pacotes novos com 15 lugares cada, todos com dica.
- O anfitrião ativa e desativa pacotes; ao menos um pacote ou lugar personalizado precisa estar ativo.
- O sorteio só considera lugares dos pacotes ativos.
- O modo local também permite escolher pacotes.
- Testes de `game-core` para filtro por pacote e validação.

## 5. Papéis por lugar

**Problema.** Todos os não espiões são iguais, o que facilita para o espião se esconder em respostas genéricas.

**Escopo.** Cada lugar ganha uma lista opcional de papéis (por exemplo, Cinema: pipoqueiro, projecionista, bilheteira). O servidor sorteia um papel por jogador e o envia no `round:role` privado, sem repetir enquanto houver papéis livres.

**Critérios de aceite.**

- Pelo menos 10 lugares com 5 papéis ou mais.
- `round:role` inclui `characterRole` apenas para o dono.
- Lugares sem papéis continuam funcionando como hoje.
- Teste garantindo que papéis não vazam em `room:state` nem em `round:ended` antes do fim.

## 6. RoomStore com Redis

**Problema.** O estado fica na memória de um único processo: um reinício apaga todas as salas e não dá para rodar duas instâncias.

**Escopo.** Adaptador `RedisRoomStore` atrás da interface `RoomStore`, que hoje é síncrona e precisará ficar assíncrona. Timers (rodada, tolerância de reconexão, expiração) passam a depender de TTLs ou de um agendador compartilhado, e os eventos passam por pub/sub do adaptador Socket.IO para Redis.

**Critérios de aceite.**

- `RoomStore` assíncrona, com a implementação em memória ainda disponível.
- Duas instâncias do servidor atendem a mesma sala sem perder eventos.
- Reiniciar uma instância não encerra salas ativas nem rodadas em andamento.
- Variável `REDIS_URL` documentada; sem ela, usa memória.
- Testes de integração rodando contra um Redis de teste.

## 7. Modo espectador para TV

**Problema.** Em uma sala com TV, ninguém quer abrir o celular só para ver o tempo e quem está na sala.

**Escopo.** Rota `/tv/:code` que entra como espectador (sem assento, sem apelido), mostra o código, a lista de jogadores, o cronômetro e o resultado, e nunca recebe papéis. Espectadores não contam como jogadores.

**Critérios de aceite.**

- Espectador não aparece na lista de jogadores nem entra na contagem do limite.
- O servidor nunca envia `round:role` a espectadores; teste automatizado prova isso.
- Tela legível a 3 metros (fonte grande, alto contraste).
- Espectador reconecta sozinho.

## 8. Sons e vibração

**Problema.** Só há um alarme ao fim do tempo; a revelação do papel é silenciosa.

**Escopo.** Som curto e vibração (quando suportada) ao revelar o papel e ao fim do tempo, com botão de mudo lembrado no navegador. Respeitar `prefers-reduced-motion` e não tocar som automaticamente antes de uma interação do usuário.

**Critérios de aceite.**

- Botão de mudo visível nas telas online e local, estado salvo em `localStorage`.
- Com mudo ativo não há som nem vibração.
- Vibração ignorada em aparelhos sem suporte, sem erros no console.
- Funciona no iOS Safari e no Chrome Android.

## 9. PWA instalável

**Problema.** O modo local não precisa de internet, mas hoje exige abrir o site com conexão.

**Escopo.** Manifesto, ícones e service worker que guardam o aplicativo para uso offline. O modo local funciona sem rede; o modo online mostra aviso claro quando não há conexão.

**Critérios de aceite.**

- O Lighthouse reconhece o app como instalável.
- Com o aparelho offline, `/` e `/local` abrem e um jogo local completo é possível.
- Novas versões atualizam o cache sem prender o usuário em versão antiga.
- Ícones em tamanhos maiores e maskable.

## 10. Revisão de acessibilidade

**Problema.** Os fluxos foram feitos com rótulos e foco básicos, mas nunca foram testados com leitor de tela.

**Escopo.** Auditar o fluxo de revelação, o lobby e o resultado com VoiceOver (iOS) e TalkBack (Android). Corrigir ordem de foco, anúncios de mudança de estado (`aria-live`), contraste e tamanhos de alvo; adicionar verificação automática (axe) ao E2E.

**Critérios de aceite.**

- Um jogador cego consegue criar sala, entrar, ver o papel e terminar uma rodada só com leitor de tela.
- O papel revelado é anunciado uma vez e some do leitor ao ocultar.
- Sem violações críticas do axe nas telas principais.
- Relatório curto com o que foi testado e em quais aparelhos.

## 11. Versão em inglês (i18n)

**Problema.** Todo o texto está fixo em português, inclusive as mensagens de erro do servidor.

**Escopo.** Biblioteca de i18n no web, com `pt-BR` e `en`. O servidor passa a enviar apenas códigos de erro e o web os traduz. Lugares e dicas ganham versão em inglês. Idioma escolhido no navegador, com seletor.

**Critérios de aceite.**

- Nenhum texto fixo em português nos componentes.
- Mensagens de erro do servidor traduzidas no cliente a partir de `code`.
- O idioma da sala define a lista de lugares sorteada.
- Testes cobrindo a troca de idioma.

## 12. Métricas anônimas de uso

**Problema.** Não há como saber se o jogo está sendo usado nem se as salas chegam ao fim das rodadas.

**Escopo.** Contadores agregados no servidor (salas criadas, rodadas iniciadas e concluídas, jogadores por sala) expostos em `/metrics` protegido por token. Sem apelidos, sem códigos de sala, sem IP e sem identificadores de sessão.

**Critérios de aceite.**

- Nenhum dado de jogador ou de sala aparece nas métricas, verificado por teste.
- Os contadores sobrevivem apenas enquanto o processo vive, ou ficam no Redis se o item 6 existir.
- `/metrics` exige token definido por variável de ambiente.
- Política de privacidade curta no README.

## 13. Teste de carga com 200 salas

**Problema.** Não se sabe quantas salas simultâneas uma instância aguenta nem quanto o servidor gasta de memória e CPU.

**Escopo.** Script de carga (por exemplo com `socket.io-client` ou k6) que abre 200 salas de 6 jogadores, roda rodadas completas e derruba/reconecta alguns jogadores. Medir latência de eventos, memória e CPU, e registrar o resultado.

**Critérios de aceite.**

- Script versionado, com instruções de uso.
- 200 salas simultâneas rodando por 10 minutos sem erros nem vazamento de memória visível.
- p95 de entrega de `round:started` abaixo de 500 ms.
- Resultados e limites recomendados documentados no README.
