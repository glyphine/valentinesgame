import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
    base: "./",
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, "index.html"),
                startgame: resolve(__dirname, "startgame.html"),
                valentine: resolve(__dirname, "valentine.html"),
                gwyn: resolve(__dirname, "gwyn.html"),
                gameover: resolve(__dirname, "gameover.html"),
            },
        },
        minify: "terser",
    },
});