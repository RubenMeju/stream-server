const express = require('express');
const bodyParser = require('body-parser');
const WebSocket = require('ws');
const readline = require('readline');

const app = express();
app.use(bodyParser.json());

// =============================
// WebSocket
// =============================
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', ws => {
  console.log('Cliente WebSocket conectado');
});

// =============================
// Webhook de Twitch
// =============================
app.post('/webhook', (req, res) => {

  const data = req.body;

  if (data.subscription?.type === 'channel.follow') {

    const follower = data.event.user_name;

    console.log(`Nuevo seguidor: ${follower}`);

    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(follower);
      }
    });

  }

  res.status(200).end();

});

// =============================
// Servidor HTTP
// =============================
app.listen(3000, () => {
  console.log('Servidor escuchando en puerto 3000');
  console.log('Modo test activo. Escribe: follow NOMBRE');
});

// =============================
// Modo TEST para alertas
// =============================
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.on('line', (input) => {

  if (input.startsWith("follow ")) {

    const follower = input.replace("follow ", "").trim();

    console.log("Seguidor de prueba:", follower);

    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(follower);
      }
    });

  }

});