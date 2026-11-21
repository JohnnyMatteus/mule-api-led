# Roteiro: as três camadas API-Led

## A solução em uma frase

Cinco APIs Mule independentes: três System APIs (estúdio, pagamentos, FinERP) que traduzem e protegem cada sistema, uma Process API que orquestra a matrícula paga e uma Experience API moldada para o app. Dependências só descem.

## Como explicar em dois minutos

1. O problema: app, site e balcão falando direto com três sistemas é N x M integrações e a regra de matrícula repetida em cada canal.
2. System API isola o legado: o layout do FinERP (maiúsculas, centavos com zeros à esquerda, HTTP 200 com erro em `COD_RETORNO`) só existe dentro da `finerp-sapi`.
3. Process API tem a regra e nenhum canal: ela devolve `erpSync: PENDING`, não "seu recibo chega por e-mail".
4. Experience API tem a tela e nenhuma regra: formata `R$ 150,00` e escolhe a mensagem "Esta aula lotou. Que tal outro horário?".
5. Governança no CI mantém as camadas iguais no que importa (correlação, idempotência, contrato de erro).

## Alternativas e trade-offs

| Opção | Ganha | Perde |
| --- | --- | --- |
| Três camadas (escolhida) | reuso por canal e por processo; troca de sistema isolada | latência de dois saltos extras; cinco deploys; mais contratos |
| Duas camadas | menos saltos | orquestração copiada por canal |
| Ponto a ponto | simples no primeiro dia | acoplamento total ao legado |
| Gateway + microsserviços próprios | stack sem licença | reconstruir conectores, DataWeave e governança do Anypoint |

## Perguntas que um entrevistador faria

**Três camadas não é exagero para um app só?**
Para um canal e um processo, sim, e eu diria isso ao cliente. O padrão se paga no segundo canal ou no segundo processo. O que eu não abriria mão mesmo com um canal é a System API do ERP legado, porque é ela que impede o layout do FinERP de vazar.

**A Experience API pode chamar uma System API direto, por exemplo para listar aulas?**
Não neste desenho. Se a tela precisa de dados de aula, ou a Process API passa a oferecer uma consulta, ou nasce uma Process API de catálogo. Abrir exceção é como as camadas apodrecem. Em leituras simples e sem regra, algumas equipes permitem o atalho; aí a regra precisa estar escrita e verificada.

**Como você evita que as System APIs virem um "modelo canônico corporativo" impossível de mudar?**
O canônico é por domínio e pequeno: só o que algum processo usa ou vai usar logo. Mudança compatível (campo opcional novo) é livre; incompatível exige versão nova da API. Os testes de contrato mostram no PR qual consumidor quebraria.

**Onde fica o custo de latência?**
Cada salto adiciona alguns milissegundos dentro do mesmo Private Space; o grosso da latência é o backend (processador e ERP). Mitigações: leituras em paralelo (scatter-gather, próximo passo), timeouts por camada coerentes (camada de cima espera mais que a de baixo) e retry em uma camada por tipo de falha.

**Por que a `payments-sapi` aceita PIX se a matrícula não usa?**
Porque a System API representa a capacidade do sistema, não a necessidade de um processo. Quando o processo de pacotes mensais quiser PIX, não precisa mexer nela. É reuso planejado, não especulativo: o processador já suporta e a tradução é pequena e testada.

**Como você versiona essas APIs?**
Versão maior no path base quando houver quebra (`/api/v2`), com as duas versões no ar até os consumidores migrarem; `info.version` semântico na spec. Nesta fundação tudo é v1.
