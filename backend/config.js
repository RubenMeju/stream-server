require("dotenv").config();
const path = require("path");

module.exports = {
  CLIENT_ID: process.env.CLIENT_ID,
  CLIENT_SECRET: process.env.CLIENT_SECRET,
  MODERATOR_LOGIN: process.env.MODERATOR_LOGIN || "mejudev",
  USER_TOKEN: process.env.USER_TOKEN,
  REFRESH_TOKEN: process.env.REFRESH_TOKEN,

  CHANNEL_LOGIN: process.env.CHANNEL_LOGIN || "mejudev",
  FOLLOWER_GOAL: parseInt(process.env.FOLLOWER_GOAL) || 500,
  WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || "secret123",
  PUBLIC_PATH: path.join(__dirname, "../public"),
  PORT: process.env.PORT || 3000,
};
