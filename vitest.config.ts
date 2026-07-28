//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import {
    configDefaults,
    defineConfig,
} from "vitest/config";
import { resolve } from "path";

export default defineConfig({
    test: {
        environment: "jsdom",
        setupFiles: ["src/test/setup.ts"],
        globals: true,
        exclude: [
            ...configDefaults.exclude,
            "**/.patch-backups/**",
            "**/overview-team-kpi-trend-source-files/**",
        ],
    },
    resolve: {
        alias: { "@": resolve(import.meta.dirname, "src") },
    },
});
