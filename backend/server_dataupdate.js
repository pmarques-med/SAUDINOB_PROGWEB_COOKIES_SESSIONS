import express from "express";
import cors from "cors";
import { WebSocketServer } from "ws";

import path from "path";
import { fileURLToPath } from "url";


// ====================================================
// CONFIGURAÇÃO DO EXPRESS
// ====================================================

const app = express();

app.use(express.json());



// ====================================================
// SERVIR A PASTA FRONTEND
// ====================================================

const __filename =
    fileURLToPath(import.meta.url);

const __dirname =
    path.dirname(__filename);


// Estrutura esperada:
//
// projeto/
// ├── backend/
// │   └── server.js
// └── frontend/
//     └── index.html

app.use(
    express.static(
        path.join(__dirname, "../frontend")
    )
);



// ====================================================
// CORS
// ====================================================

// Necessário caso o frontend seja aberto
// através do Live Server

app.use(cors({
    origin: "http://127.0.0.1:5500"
}));



// ====================================================
// FUNÇÕES PARA SIMULAR DADOS CLÍNICOS
// ====================================================


// ----------------------------------------------------
// Frequência cardíaca
// valor entre 60 e 100 bpm
// ----------------------------------------------------

function gerarHeartRate() {

    return Math.floor(
        Math.random() * 41
    ) + 60;

}



// ----------------------------------------------------
// Temperatura
// valor entre 36.0 e 37.5 ºC
// ----------------------------------------------------

function gerarTemperatura() {

    const valor =
        36 + Math.random() * 1.5;

    return valor.toFixed(1);

}



// ----------------------------------------------------
// Frequência respiratória
// valor entre 12 e 20 rpm
// ----------------------------------------------------

function gerarFrequenciaRespiratoria() {

    return Math.floor(
        Math.random() * 9
    ) + 12;

}



// ====================================================
// 1. POLLING
//
// FREQUÊNCIA CARDÍACA
// ====================================================


// O cliente faz um novo pedido
// GET /heart-rate
// de 3 em 3 segundos.

app.get("/heart-rate", (req, res) => {


    const valor =
        gerarHeartRate();


    const dados = {

        heartRate: valor,

        time:
            new Date()
                .toLocaleTimeString()

    };


    console.log(
        "POLLING - Heart Rate:",
        valor
    );


    // Responder ao pedido HTTP

    res.json(dados);

});



// ====================================================
// 2. SERVER-SENT EVENTS (SSE)
//
// TEMPERATURA
// ====================================================

app.get("/temperature-sse", (req, res) => {


    // ---------------------------------------------
    // Configurar a resposta como stream SSE
    // ---------------------------------------------

    res.setHeader(
        "Content-Type",
        "text/event-stream"
    );


    res.setHeader(
        "Cache-Control",
        "no-cache"
    );


    res.setHeader(
        "Connection",
        "keep-alive"
    );


    // Enviar imediatamente os headers

    res.flushHeaders();


    console.log(
        "Cliente SSE ligado"
    );



    // ---------------------------------------------
    // Enviar temperatura de 3 em 3 segundos
    // ---------------------------------------------

    const interval =
        setInterval(() => {


            const valor =
                gerarTemperatura();


            const dados = {

                temperature: valor,

                time:
                    new Date()
                        .toLocaleTimeString()

            };


            console.log(
                "SSE - Temperatura:",
                valor
            );


            // Formato SSE:
            //
            // data: {...}
            //
            // seguido de duas mudanças de linha

            res.write(
                `data: ${JSON.stringify(dados)}\n\n`
            );


        }, 3000);



    // ---------------------------------------------
    // Cliente fechou a ligação
    // ---------------------------------------------

    req.on("close", () => {


        console.log(
            "Cliente SSE desligado"
        );


        clearInterval(interval);

    });

});



// ====================================================
// INICIAR SERVIDOR HTTP
// ====================================================


// Guardamos a referência ao servidor HTTP
// porque também será utilizada pelo WebSocket.

const server =
    app.listen(3000, () => {

        console.log(
            "Servidor em http://localhost:3000"
        );

    });



// ====================================================
// 3. WEBSOCKET
//
// FREQUÊNCIA RESPIRATÓRIA
// ====================================================


// Criar servidor WebSocket
// utilizando o mesmo servidor HTTP

const wss =
    new WebSocketServer({
        server
    });



// Quando um cliente estabelece
// uma ligação WebSocket

wss.on("connection", (socket) => {


    console.log(
        "Cliente WebSocket ligado"
    );



    // ---------------------------------------------
    // Enviar frequência respiratória
    // de 3 em 3 segundos
    // ---------------------------------------------

    const interval =
        setInterval(() => {


            const valor =
                gerarFrequenciaRespiratoria();


            const dados = {

                respiratoryRate: valor,

                time:
                    new Date()
                        .toLocaleTimeString()

            };


            console.log(
                "WEBSOCKET - Respiração:",
                valor
            );


            // Enviar mensagem ao cliente

            socket.send(
                JSON.stringify(dados)
            );


        }, 3000);



    // ---------------------------------------------
    // Receber mensagens do cliente
    // ---------------------------------------------

    socket.on("message", (message) => {

        console.log(
            "Mensagem recebida:",
            message.toString()
        );

    });



    // ---------------------------------------------
    // Cliente fechou a ligação
    // ---------------------------------------------

    socket.on("close", () => {


        console.log(
            "Cliente WebSocket desligado"
        );


        clearInterval(interval);

    });

});