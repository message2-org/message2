import { createApp } from "./app.js";
import { config } from "./config.js";

process.loadEnvFile?.();

const app = createApp();
app.listen(config.port, () => console.log(`notifications listening on :${config.port}`));
