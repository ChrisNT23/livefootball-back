const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Ruta para obtener datos de partidos en vivo
app.get("/api/football", async (req, res) => {
  try {
    const response = await axios.get("https://v3.football.api-sports.io/fixtures?live=all", {
      headers: {
        "x-rapidapi-host": "v3.football.api-sports.io",
        "x-rapidapi-key": process.env.API_KEY, // Llave desde .env
      },
    });
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching live matches:", error);
    res.status(500).json({ error: "Error fetching data from API" });
  }
});

// Ruta para obtener detalles de un partido específico
app.get("/api/football/:id", async (req, res) => {
  const fixtureId = req.params.id;

  try {
    // Solicitud de detalles del partido
    const detailsResponse = await axios.get(
      `https://v3.football.api-sports.io/fixtures?id=${fixtureId}`,
      {
        headers: {
          "x-rapidapi-host": "v3.football.api-sports.io",
          "x-rapidapi-key": process.env.API_KEY,
        },
      }
    );

    // Solicitud de alineaciones del partido
    const lineupsResponse = await axios.get(
      `https://v3.football.api-sports.io/fixtures/lineups?fixture=${fixtureId}`,
      {
        headers: {
          "x-rapidapi-host": "v3.football.api-sports.io",
          "x-rapidapi-key": process.env.API_KEY,
        },
      }
    );

    // Solicitud de estadísticas del partido
    const statsResponse = await axios.get(
      `https://v3.football.api-sports.io/fixtures/statistics?fixture=${fixtureId}`,
      {
        headers: {
          "x-rapidapi-host": "v3.football.api-sports.io",
          "x-rapidapi-key": process.env.API_KEY,
        },
      }
    );

    // Solicitud del historial de enfrentamientos
    const h2hResponse = await axios.get(
      `https://v3.football.api-sports.io/fixtures/headtohead?h2h=${detailsResponse.data.response[0].teams.home.id}-${detailsResponse.data.response[0].teams.away.id}`,
      {
        headers: {
          "x-rapidapi-host": "v3.football.api-sports.io",
          "x-rapidapi-key": process.env.API_KEY,
        },
      }
    );

    // Respuesta combinada
    res.json({
      details: detailsResponse.data.response[0],
      lineups: lineupsResponse.data.response,
      statistics: statsResponse.data.response,
      h2h: h2hResponse.data.response,
    });
  } catch (error) {
    console.error("Error fetching match details:", error);
    res.status(500).json({ error: "Error fetching match details" });
  }
});

// Inicia el servidor
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
