import eslint from "@eslint/js";
import { defineConfig } from "eslint/config";
import type { Rule } from "eslint";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import eslintPluginPrettier from "eslint-plugin-prettier";
import eslintPluginZod from "eslint-plugin-zod";
import { configs } from "typescript-eslint";

const noPointlessReassignments: Rule.RuleModule = {
    meta: {
        type: "problem",
        fixable: "code",
        messages: {
            pointlessReassignment:
                "Pointless reassignment: '{{ name }}' is just an alias for '{{ value }}'. Use the original directly.",
        },
        docs: {
            description:
                "Bans const x = y aliases where no transformation occurs — use the original identifier directly.",
        },
    },
    create(context) {
        return {
            VariableDeclarator(node) {
                if (
                    node.id.type !== "Identifier" ||
                    node.init?.type !== "Identifier" ||
                    node.id.name.startsWith("_")
                ) {
                    return;
                }

                // Only flag const — let/var aliases are often intentional mutable copies.
                if (
                    node.parent.type !== "VariableDeclaration" ||
                    node.parent.kind !== "const"
                ) {
                    return;
                }

                const aliasName = node.id.name;
                const originalName = node.init.name;

                context.report({
                    node,
                    messageId: "pointlessReassignment",
                    data: { name: aliasName, value: originalName },
                    fix(fixer) {
                        const scope = context.sourceCode.getScope(node);
                        const variable = scope.set.get(aliasName);
                        if (!variable) return null;

                        // Abort if the alias is mutated after the initial write.
                        const mutationRefs = variable.references.filter(
                            (r) => r.isWrite() && r.identifier !== node.id
                        );
                        if (mutationRefs.length > 0) return null;

                        // Collect all read references for replacement.
                        const readRefs = variable.references.filter((r) =>
                            r.isRead()
                        );

                        // Abort when any read is a shorthand property ({ x } from const x = y).
                        // Rewriting { x } → { x: original } requires changing the property key
                        // which the simple replaceText approach cannot do correctly.
                        const hasShorthand = readRefs.some((r) => {
                            const afterToken = context.sourceCode.getTokenAfter(
                                r.identifier
                            );
                            if (afterToken?.value === ":") return false;
                            if (
                                afterToken?.value !== "}" &&
                                afterToken?.value !== ","
                            )
                                return false;
                            let tok = context.sourceCode.getTokenBefore(
                                r.identifier
                            );
                            while (tok) {
                                if (tok.value === "{") return true;
                                if (tok.value === "[" || tok.value === "(")
                                    return false;
                                if (tok.value === ":") return false;
                                tok = context.sourceCode.getTokenBefore(tok);
                            }
                            return false;
                        });
                        if (hasShorthand) return null;

                        const fixes = readRefs.map((r) =>
                            fixer.replaceText(r.identifier, originalName)
                        );

                        // Remove the VariableDeclaration only when this is the sole declarator.
                        const declaration = node.parent;
                        if (
                            declaration.type !== "VariableDeclaration" ||
                            declaration.declarations.length !== 1
                        ) {
                            return null;
                        }
                        fixes.push(fixer.remove(declaration));
                        return fixes;
                    },
                });
            },
        };
    },
};

const configFiles = [
    "eslint.config.ts",
    "commitlint.config.ts",
    "release.config.ts",
    "lint-staged.config.ts",
];

const sharedPluginRules = {
    custom: {
        rules: {
            "no-pointless-reassignments": noPointlessReassignments,
        },
    },
    prettier: eslintPluginPrettier,
};

const sharedRules = {
    "custom/no-pointless-reassignments": "error",
    "prettier/prettier": "error",
    "@typescript-eslint/consistent-type-assertions": [
        "error",
        { assertionStyle: "never" },
    ],
};

export default defineConfig(
    { ignores: ["dist/", "node_modules/"] },

    // Source and test files — type-checked via tsconfig.json
    {
        files: ["src/**/*.ts", "tests/**/*.ts"],
        extends: [
            eslint.configs.recommended,
            ...configs.strictTypeChecked,
            ...configs.stylisticTypeChecked,
            eslintPluginZod.configs.recommended,
        ],
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        plugins: sharedPluginRules,
        rules: {
            ...sharedRules,
            "zod/consistent-schema-var-name": "off",
        },
    },

    // Test-specific overrides
    {
        files: ["tests/**/*.ts"],
        rules: {
            "@typescript-eslint/no-floating-promises": "off",
            "@typescript-eslint/consistent-type-assertions": "off",
        },
    },

    // Config files — no tsconfig, use allowDefaultProject
    {
        files: configFiles,
        extends: [
            eslint.configs.recommended,
            ...configs.strictTypeChecked,
            ...configs.stylisticTypeChecked,
        ],
        languageOptions: {
            parserOptions: {
                projectService: { allowDefaultProject: configFiles },
                tsconfigRootDir: import.meta.dirname,
            },
        },
        plugins: sharedPluginRules,
        rules: sharedRules,
    },

    {
        files: ["src/**/*.ts", "tests/**/*.ts"],
        linterOptions: {
            noInlineConfig: true,
        },
    },
    eslintConfigPrettier
);
