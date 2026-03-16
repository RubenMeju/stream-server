require("dotenv").config();
const path = require("path");

module.exports = {
  //CONFIG GLOBAL
  BASE_URL: process.env.BASE_URL || "https://dashboard.render.com",
  CHANNEL_LOGIN: process.env.CHANNEL_LOGIN || "mejudev",
  WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || "secret123",
  PUBLIC_PATH: path.join(__dirname, "../public"),
  PORT: process.env.PORT || 3000,

  // CONFIG DE TWITCH
  CLIENT_ID: process.env.CLIENT_ID,
  CLIENT_SECRET: process.env.CLIENT_SECRET,
  MODERATOR_LOGIN: process.env.MODERATOR_LOGIN || "mejudev",
  USER_TOKEN: process.env.USER_TOKEN,
  REFRESH_TOKEN: process.env.REFRESH_TOKEN,
  FOLLOWER_GOAL: parseInt(process.env.FOLLOWER_GOAL) || 500,

  // CONFIG DE GITHUB
  GITHUB_TOKEN: process.env.GITHUB_TOKEN,

  // CONFIG DE KICK
  KICK_CLIENT_ID: process.env.KICK_CLIENT_ID,
  KICK_CLIENT_SECRET: process.env.KICK_CLIENT_SECRET,
  KICK_CHANNEL: process.env.KICK_CHANNEL || "mejudev",
  KICK_ACCESS_TOKEN: process.env.KICK_ACCESS_TOKEN,
  KICK_REFRESH_TOKEN: process.env.KICK_REFRESH_TOKEN,
  BROADCASTER_ID: process.env.BROADCASTER_ID,
};
