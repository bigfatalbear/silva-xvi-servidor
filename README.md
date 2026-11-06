# SILVA XVI servidor 🏛️📡

Servidor de **sinalização** do SILVA XVI messenger: salas, lista de presença e relay de ofertas/SDP e mensagens. **Nunca vê o conteúdo criptografado do P2P** (as chaves já se firmam antes).

> WebSocket puro (ws). Roda igual no Termux, no Render, no Fly.io, no Railway…

## Rodar no Termux (rede local)
```bash
cd ~/projetos/servidores/silva-xvi-servidor
npm install
npm start
# 🏛️ SILVA XVI signaling ativo na porta 8080
```
No app: `📶 Wi-Fi Local` não precisa — vá em **🔗 Conectar** → aba **🌐 Servidor** e use:
`ws://IP-DO-SEU-CELULAR:8080` (veja o IP com `ifconfig`, ou `wlan0`)

Todos na casa com o app aberto aparecem na lista de contatos automaticamente 💙

## Nuvem grátis (Render / Railway / Fly.io)
1. Suba este repo pro GitHub (já está)
2. No [Render](https://render.com): **New → Web Service** → conecte o repo `silva-xvi-servidor`
3. Build: `npm install` · Start: `npm start` · Ambiente: Node
4. A URL será `wss://silva-xvi.onrender.com` (WebSocket seguro)
5. No app SILVA XVI → **🔗 Conectar** → **🌐 Servidor** → cole a URL → **Entrar na sala**

## Protocolo
| Cliente → servidor | Servidor → clientes |
|---|---|
| `{type:'join', room, name}` | `{type:'welcome', you, room}` + `{type:'presence', peers:[...]} |
| `{type:'msg', text}` | `{from, text, ts}` |
| `{type:'offer'/'answer'/'nudge'}` | relayed com `from` |
| `{type:'who'}` | resposta direta com peers |

`GET /health` → `{ok, rooms, users, uptime}` JSON ( Kumite de monitoramento / deploy healthchecks).

⚠️ Sala é aberta — qualquer um que saiba o nome entra e vê a presença; **mensagens P2P continuam criptografadas** e armazenadas só nos aparelhos. Para sala privada, troque o nome da sala por um segredo.
