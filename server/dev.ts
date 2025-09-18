import { createServer } from "./index";

const port = process.env.PORT ? Number(process.env.PORT) : 3001;
const app = createServer();
app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`);
});
