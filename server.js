const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
app.use(bodyParser.json());

const TOKEN = "EAA8SACxFuQ8BQZCKSewCTZBqgp13u4M88ZAAyyUg6KUzXfaVoj3a5Q3HNL10yZBitgxfcMTZAIiOBLiiftcisyaQHEKuypI7cqIKJBH4fjn9AA0NjIIIThfLZARf9o2c8ZA7TpXW9aqE5lBTZCb0hfxpsjpQSKmIUjD2rwNuaQEvMASXJZBUi6SL7wkMU3eRpxB4EJZBD4Y3ifZAyHUkRrCmnsK23t7MNjZArNRXdMPr31EMX2SbyVBErHifpZAAiMV6UZAl0mOrPEG97n7oB7fOmPd97J";
const PHONE_NUMBER_ID = "1013691858491029";

// Mock Database
let users = {
  "919999999999": {
    emp_id: "EMP001",
    annual: 12,
    sick: 5,
    state: null,
    tempLeave: {}
  }
};

// Webhook verification
app.get("/webhook", (req, res) => {
  const verify_token = "mytoken";
  if (req.query["hub.verify_token"] === verify_token) {
    res.send(req.query["hub.challenge"]);
  } else {
    res.sendStatus(403);
  }
});

// Webhook receive messages
app.post("/webhook", async (req, res) => {
  const msg = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!msg) return res.sendStatus(200);

  const from = msg.from;
  const text = msg.text?.body?.toLowerCase();

  if (!users[from]) {
    users[from] = {
      emp_id: "EMP002",
      annual: 10,
      sick: 3,
      state: null,
      tempLeave: {}
    };
  }

  const user = users[from];

  if (text.includes("leave balance")) {
    await sendMessage(from, 
      `You have:\nAnnual: ${user.annual}\nSick: ${user.sick}`
    );
  }

  else if (text.includes("apply leave")) {
    user.state = "awaiting_dates";
    await sendMessage(from, 
      "Please enter start and end date in format:\nYYYY-MM-DD to YYYY-MM-DD"
    );
  }

  else if (user.state === "awaiting_dates") {
    const parts = text.split("to");
    if (parts.length === 2) {
      user.tempLeave.start = parts[0].trim();
      user.tempLeave.end = parts[1].trim();
      user.state = "awaiting_reason";

      await sendMessage(from, "Please enter reason for leave:");
    }
  }

  else if (user.state === "awaiting_reason") {
    user.tempLeave.reason = text;
    user.state = "confirm";

    await sendMessage(from,
      `Confirm leave from ${user.tempLeave.start} to ${user.tempLeave.end}?\nReply YES to confirm`
    );
  }

  else if (user.state === "confirm" && text === "yes") {
    user.state = null;

    await sendMessage(from,
      `Leave applied successfully!\nFrom: ${user.tempLeave.start}\nTo: ${user.tempLeave.end}`
    );

    user.tempLeave = {};
  }

  else {
    await sendMessage(from,
      "I can help with:\n- Leave balance\n- Apply leave"
    );
  }

  res.sendStatus(200);
});

async function sendMessage(to, message) {
  await axios.post(
    `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: "whatsapp",
      to: to,
      text: { body: message }
    },
    {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json"
      }
    }
  );
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running"));
