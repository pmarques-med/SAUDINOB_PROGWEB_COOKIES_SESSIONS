// npm install express cookie-parser jsonwebtoken cors ws

import express from "express";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";

import { WebSocketServer } from "ws";


const app = express();


app.use(express.json());
app.use(cookieParser());


// ----------------------------------------------------
// Servir a pasta frontend
// ----------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(
    express.static(
        path.join(__dirname, "../frontend")
    )
);


// ----------------------------------------------------
// CORS
// ----------------------------------------------------

app.use(cors({
    origin: "http://127.0.0.1:5500",
    credentials: true
}));


const SECRET = "segredo-apenas-para-demonstracao";


// ----------------------------------------------------
// Função comum: cria JWT
// ----------------------------------------------------

function criarToken() {

    return jwt.sign(
        {
            userId: 1,
            name: "Dr. João",
            role: "doctor"
        },
        SECRET,
        { expiresIn: "1h" }
    );

}



// ====================================================
// OPÇÃO 1 — COOKIE
// ====================================================

app.post("/login-cookie", (req, res) => {

    console.log(
        "Login efetuado. Criando cookie com JWT..."
    );

    const token = criarToken();


    res.cookie("token", token, {

        httpOnly: true,

        sameSite: "lax"

    });


    res.cookie(
        "theme",
        "dark",
        {
            maxAge:
                365 * 24 * 60 * 60 * 1000
        }
    );


    res.json({

        message:
            "Login efetuado. Token guardado num cookie."

    });

});



app.get("/profile-cookie", (req, res) => {

    const token = req.cookies.token;


    if (!token) {

        console.log(
            "Pedido sem cookie"
        );

        return res.status(401).json({

            error:
                "Cookie não encontrado"

        });

    }


    try {

        const user =
            jwt.verify(token, SECRET);


        res.json({

            authentication: "Cookie",

            user

        });

    }

    catch {

        res.status(401).json({

            error: "Token inválido"

        });

    }

});



// ====================================================
// OPÇÃO 2 — AUTHORIZATION: BEARER
// ====================================================

app.post("/login-bearer", (req, res) => {

    const token = criarToken();


    res.json({

        message:
            "Login efetuado.",

        token

    });

});



app.get("/profile-bearer", (req, res) => {

    const authorization =
        req.headers.authorization;


    if (!authorization) {

        return res.status(401).json({

            error:
                "Authorization header não encontrado"

        });

    }


    const token =
        authorization.split(" ")[1];


    try {

        const user =
            jwt.verify(token, SECRET);


        res.json({

            authentication: "Bearer",

            user

        });

    }

    catch {

        res.status(401).json({

            error: "Token inválido"

        });

    }

});



// ====================================================
// SIMULAÇÃO DA FREQUÊNCIA CARDÍACA
// ====================================================

// Valor inicial

let heartRate = 78;


// Gera uma nova frequência cardíaca
// entre 60 e 100 bpm

function gerarHeartRate() {

    heartRate =
        Math.floor(
            Math.random() * 41
        ) + 60;


    return heartRate;

}



// ====================================================
// 1 — POLLING
// ====================================================

// O cliente faz pedidos repetidamente:
//
// GET /heart-rate
//
// O servidor apenas responde quando é chamado.

app.get("/heart-rate", (req, res) => {

    const valor =
        gerarHeartRate();


    console.log(
        "POLLING:",
        valor
    );


    res.json({

        heartRate: valor,

        time:
            new Date().toLocaleTimeString()

    });

});



// ====================================================
// 2 — SERVER-SENT EVENTS (SSE)
// ====================================================

app.get("/heart-rate-sse", (req, res) => {


    // Cabeçalhos necessários para SSE

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


    // Envia imediatamente os headers

    res.flushHeaders();


    console.log(
        "Cliente SSE ligado"
    );


    // Enviar novo valor a cada 3 segundos

    const interval = setInterval(() => {

        const valor =
            gerarHeartRate();


        console.log(
            "SSE:",
            valor
        );


        const dados = {

            heartRate: valor,

            time:
                new Date()
                    .toLocaleTimeString()

        };


        // Formato obrigatório SSE:
        //
        // data: ...
        //
        // seguido de duas mudanças de linha

        res.write(
            `data: ${JSON.stringify(dados)}\n\n`
        );


    }, 3000);



    // Quando o browser fecha a ligação

    req.on("close", () => {

        console.log(
            "Cliente SSE desligado"
        );


        clearInterval(interval);

    });

});



// ====================================================
// ROTA NORMAL
// ====================================================

app.get("/", (req, res) => {

    res.send(
        "Servidor a funcionar!"
    );

});



// ====================================================
// CRIAR SERVIDOR HTTP
// ====================================================

// Em vez de:
//
// app.listen(...)
//
// guardamos o servidor numa variável.
//
// Isto permite que o WebSocket utilize
// o mesmo servidor HTTP.

const server = app.listen(3000, () => {

    console.log(
        "Servidor em http://localhost:3000"
    );

});



// ====================================================
// 3 — WEBSOCKET
// ====================================================

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


    // Enviar uma medição a cada 3 segundos

    const interval = setInterval(() => {

        const valor =
            gerarHeartRate();


        const dados = {

            heartRate: valor,

            time:
                new Date()
                    .toLocaleTimeString()

        };


        console.log(
            "WEBSOCKET:",
            valor
        );


        socket.send(
            JSON.stringify(dados)
        );


    }, 3000);



    // --------------------------------
    // Receber mensagens do cliente
    // --------------------------------

    socket.on("message", (message) => {

        console.log(
            "Mensagem recebida:",
            message.toString()
        );

    });



    // --------------------------------
    // Cliente desligou-se
    // --------------------------------

    socket.on("close", () => {

        console.log(
            "Cliente WebSocket desligado"
        );


        clearInterval(interval);

    });

});