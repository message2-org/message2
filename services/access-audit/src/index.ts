import { createAccessAuditApp } from "./app.js";

const app = createAccessAuditApp();
const port = Number(process.env.PORT ?? 4004);
app.listen(port, () => console.log(`access-audit listening on :${port}`));
