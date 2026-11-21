# 0001. API-Led Connectivity em três camadas

- **Status:** Aceito
- **Data:** 2026-11-21

## Contexto

A rede de estúdios fictícia precisa matricular alunos pelo app, cobrar no processador de pagamentos e registrar o título no ERP financeiro (FinERP Exemplo). Amanhã vêm outros canais (site, balcão, parceiros) e outros processos (remarcação, cancelamento com estorno, pacotes). Ligar cada canal direto em cada sistema gera N x M integrações, regras de negócio duplicadas por canal e acoplamento ao formato legado do ERP em todo lugar.

## Decisão

Organizar a integração em três camadas, cada uma com contrato OAS próprio e deploy independente:

- **System APIs** (`studio-sapi`, `payments-sapi`, `finerp-sapi`): uma por sistema de origem. Traduzem o formato nativo para um modelo canônico, protegem o sistema (retry, credenciais) e não têm regra de negócio.
- **Process API** (`enrollment-papi`): orquestra a matrícula paga. É o único lugar com a regra de negócio e não sabe qual canal chamou.
- **Experience API** (`student-app-xapi`): moldada para a tela do app. Traduz pedido e resposta, formata valores e mensagens; não decide nada.

Dependências só descem: Experience chama Process, Process chama System. Experience nunca chama System direto.

## Consequências

- Um canal novo é uma Experience API nova que reaproveita a Process API; um processo novo reaproveita as System APIs.
- Trocar o ERP afeta só `finerp-sapi`, desde que o contrato canônico se mantenha.
- Mais saltos de rede (latência) e mais artefatos para operar. Em escala pequena, três camadas podem ser excesso; aqui o objetivo é mostrar o padrão e seus limites.
- Exige governança: sem contrato e regras comuns, as camadas viram três monólitos acoplados. Ver ADR 0003.

## Alternativas consideradas

- **Integração ponto a ponto (app chamando cada sistema):** mais simples hoje, mas regras e formatos legados vazam para o app e cada canal repete tudo.
- **Duas camadas (Experience + System, orquestração no canal):** menos saltos, mas a regra de matrícula seria reescrita em cada canal.
- **Orquestração por eventos (coreografia):** desacopla no tempo, mas a matrícula precisa de resposta síncrona para a tela; fica como evolução para o registro no ERP (ver ADR 0005).
