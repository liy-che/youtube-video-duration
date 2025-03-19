import globals from "globals";
import pluginJs from "@eslint/js";

/** @type {import('eslint').Linter.Config[]} */
export default [
    { files: ["**/*.js"], languageOptions: { sourceType: "script" } },
    {
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.webextensions,
            },
        },
    },
    pluginJs.configs.recommended,
    {
        rules: {
            "no-unused-vars": [
                "error",
                {
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                },
            ],
        },
    },
];
