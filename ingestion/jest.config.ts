import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: ".",
  testMatch: ["<rootDir>/tests/**/*.test.ts"],
  moduleNameMapper: {
    "^@shared/(.*)$": "<rootDir>/../shared/src/$1",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          noUnusedLocals: false,
          noUnusedParameters: false,
          moduleResolution: "node",
          baseUrl: ".",
          paths: {
            "@shared/*": ["../shared/src/*"],
          },
        },
      },
    ],
  },
  clearMocks: true,
  collectCoverageFrom: ["src/**/*.ts", "!src/**/*.d.ts"],
};

export default config;
