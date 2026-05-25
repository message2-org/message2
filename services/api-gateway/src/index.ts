import { createGatewayApp } from "./app.js";

const app = createGatewayApp();
const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => console.log(`api-gateway listening on :${port}`));
