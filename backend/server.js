import express from "express";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";

const app = express();

app.use(express.json());
app.use(cookieParser());

// ----------------------------------------------------

// Servir a pasta frontend

// ----------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(

  path.join(__dirname, "../frontend")

));


// para o caso da pagina ser servida por outro servidor (ex: live-server) e o backend por outro (ex: node server.js)
app.use(cors({
  origin: "http://127.0.0.1:5500",
  credentials: true
}));

const SECRET = "segredo-apenas-para-demonstracao";

// ----------------------------------------------------
// Função comum: cria exatamente o mesmo JWT
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

  const token = criarToken();

  res.cookie("token", token, {
    httpOnly: true, // impede que o cookie seja acedido via JavaScript no browser
    sameSite: "lax"
  });

  res.cookie("theme", "dark", { maxAge: 365 * 24 * 60 * 60 * 1000});


  res.json({
    message: "Login efetuado. Token guardado num cookie."
  });
});


app.get("/profile-cookie", (req, res) => {

  // O servidor procura o JWT no COOKIE

  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({
      error: "Cookie não encontrado"
    });
  }

  try {

    const user = jwt.verify(token, SECRET);

    res.json({
      authentication: "Cookie",
      user
    });

  } catch {
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

  // Aqui o servidor NÃO cria cookie.
  // Apenas devolve o token.

  res.json({
    message: "Login efetuado.",
    token
  });

});


app.get("/profile-bearer", (req, res) => {

  // O servidor procura o JWT no header Authorization

  const authorization = req.headers.authorization;

  if (!authorization) {
    return res.status(401).json({
      error: "Authorization header não encontrado"
    });
  }

  const token = authorization.split(" ")[1];

  try {

    const user = jwt.verify(token, SECRET);

    res.json({
      authentication: "Bearer",
      user
    });

  } catch {
    res.status(401).json({
      error: "Token inválido"
    });
  }

});

app.get("/", (req, res) => {

  res.send("Servidor a funcionar!");

});

app.listen(3000, () => {
  console.log("Servidor em http://localhost:3000");
});