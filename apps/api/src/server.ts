import { app } from "./app.js";
import { env } from "./config/env.js";

app.listen(env.ANWALIVE_API_PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`AnwaLive API listening on :${env.ANWALIVE_API_PORT}`);
});
