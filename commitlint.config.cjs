/** @type {import("@commitlint/types").UserConfig} */
module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // AI-generated messages can be long; disable all max-length rules.
    "header-max-length": [0],
    "body-max-line-length": [0],
    "footer-max-line-length": [0],
  },
};
