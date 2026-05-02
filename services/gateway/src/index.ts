import express from "express";
import cors from "cors";
import accountRoutes from "./routes/accounts.js";

const app = express();
const port = Number(process.env.GATEWAY_PORT ?? 8787);

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "gateway",
    version: "0.1.0",
    now: new Date().toISOString()
  });
});

app.use("/api", accountRoutes);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[gateway] unhandled error", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(port, () => {
  console.log(`[gateway] listening on http://localhost:${port}`);
});
