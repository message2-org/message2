import { createLawfulAccessApp } from "./app.js";

const app = createLawfulAccessApp();
const port = Number(process.env.PORT ?? 4005);
app.listen(port, () => console.log(`lawful-access listening on :${port}`));
