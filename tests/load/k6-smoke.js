import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 20,
  duration: "30s"
};

export default function () {
  const health = http.get("http://localhost:4000/health");
  check(health, { "gateway healthy": (r) => r.status === 200 });
  sleep(1);
}
