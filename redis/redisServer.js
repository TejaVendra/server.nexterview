import Redis from "ioredis";

const client = new Redis(process.env.REDIS_URL);

client.on("connect", () => {
    console.log("Redis connected successfully");
});

client.on("error", (error) => {
    console.error("Redis error:", error);
});

export default client;