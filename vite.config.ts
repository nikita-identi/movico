import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const root = process.cwd();

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@controllers": path.resolve(root, "_controllers"),
            "@services": path.resolve(root, "_services"),
            "@views": path.resolve(root, "_views"),
            "@core": path.resolve(root, "core"),
        },
    },
    server: {
        middlewareMode: true
    },
    build: {
        outDir: path.resolve(root, "dist"),
        rollupOptions: { input: path.resolve(root, "public", "index.html") },
    },
});
