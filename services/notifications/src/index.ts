import cors from "cors";
import express from "express";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true, service: "notifications" }));

app.post("/notifications/transparency", (req, res) => {
  res.status(202).json({
    delivered: true,
    type: "privileged_access_notice",
    payload: req.body
  });
});

app.post("/notifications/push", (req, res) => {
  res.status(202).json({ delivered: true, provider: "fcm-webpush", payload: req.body });
});

const port = Number(process.env.PORT ?? 4003);
app.listen(port, () => console.log(`notifications listening on :${port}`));
