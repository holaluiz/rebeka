# Pesquisa — Rebeka Rigobelli

Formulário editorial e responsivo sobre os desafios comerciais de profissionais de serviços. Quem responde recebe a proposta de um conselho personalizado em áudio da Rebeka, pelo WhatsApp.

## Experiência

- Abertura com convite e recompensa em destaque.
- Quatro perguntas: profissão, tempo de atuação, principal desafio e relato livre. Nome opcional.
- Navegação com progresso, validação e preservação das respostas enquanto a página estiver aberta.
- Revisão com edição antes de compartilhar.
- WhatsApp com a mensagem completa preparada para **+55 47 99113-2038**. A pessoa ainda precisa tocar em **Enviar no WhatsApp**.
- Alternativa para copiar a mensagem, caso o WhatsApp não abra.

O conselho em áudio é preparado e enviado pela Rebeka na conversa. O site não gera nem envia áudio automaticamente e não promete prazo de resposta.

## Hospedar na Vercel

1. Importe o repositório `holaluiz/rebeka`.
2. Em **Framework Preset**, selecione **Other**.
3. Use a raiz do repositório como **Root Directory**. Deixe **Build Command** vazio e **Output Directory** como `.`.
4. Publique. Não há dependências, banco de dados ou variáveis de ambiente.

`vercel.json` já inclui as configurações estáticas e cabeçalhos básicos.

## Abrir localmente

Com Node.js 20 ou superior:

```sh
npm run dev
```

Abra `http://127.0.0.1:4173`. Para conferir a sintaxe: `npm run check`.

## Personalização

- Textos e perguntas: `index.html`.
- Cores, fontes e responsividade: `styles.css`.
- Validação, revisão e mensagem do WhatsApp: `app.js`.
- Telefone de destino: constante `WHATSAPP_PHONE` em `app.js`. Atualize também o link alternativo em `<noscript>` no HTML.

## Privacidade

As respostas ficam somente na memória da página, sem analytics, cookies, localStorage ou envio para servidor. Ao confirmar, um link abre o WhatsApp com as respostas na mensagem. A Rebeka passa a ter acesso ao contato quando o participante envia a mensagem. O WhatsApp processa o uso conforme suas próprias políticas.

## Créditos

Fotografia: [Amr Taha / Unsplash](https://unsplash.com/photos/a-brown-leather-book-sitting-on-top-of-a-desk-next-to-a-cup-of-coffee-yFpDKK_w7kw), sob a licença Unsplash.

Fontes locais: Cormorant Garamond e Manrope, distribuídas sob a SIL Open Font License. Licenças incluídas em `assets/fonts/`.
