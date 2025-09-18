#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const execAsync = promisify(exec);

class CSSValidatorServer {
  constructor() {
    this.server = new Server(
      {
        name: 'css-validator',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    
    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'validate_css',
          description: 'Validate CSS code using W3C CSS Validator',
          inputSchema: {
            type: 'object',
            properties: {
              css: {
                type: 'string',
                description: 'CSS code to validate',
              },
              file_path: {
                type: 'string',
                description: 'Path to CSS file to validate',
              },
            },
            required: [],
          },
        },
        {
          name: 'lint_css',
          description: 'Lint CSS code using stylelint',
          inputSchema: {
            type: 'object',
            properties: {
              css: {
                type: 'string',
                description: 'CSS code to lint',
              },
              file_path: {
                type: 'string',
                description: 'Path to CSS file to lint',
              },
              config: {
                type: 'object',
                description: 'Stylelint configuration',
              },
            },
            required: [],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;

        switch (name) {
          case 'validate_css':
            return await this.validateCSS(args);
          case 'lint_css':
            return await this.lintCSS(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`,
            },
          ],
        };
      }
    });
  }

  async validateCSS(args) {
    try {
      const { css, file_path } = args;
      let cssContent;

      if (file_path) {
        cssContent = await readFile(file_path, 'utf-8');
      } else if (css) {
        cssContent = css;
      } else {
        throw new Error('Either css or file_path must be provided');
      }

      // Utilisation de l'API W3C CSS Validator
      const FormData = (await import('form-data')).default;
      const fetch = (await import('node-fetch')).default;
      
      const form = new FormData();
      form.append('text', cssContent);
      form.append('output', 'json');
      form.append('profile', 'css3svg');

      const response = await fetch('https://jigsaw.w3.org/css-validator/validator', {
        method: 'POST',
        body: form,
      });

      const result = await response.json();
      
      let summary = '';
      if (result.cssvalidation) {
        const errors = result.cssvalidation.errors || [];
        const warnings = result.cssvalidation.warnings || [];
        
        summary = `CSS Validation Results:\\n`;
        summary += `✅ Valid: ${errors.length === 0}\\n`;
        summary += `❌ Errors: ${errors.length}\\n`;
        summary += `⚠️ Warnings: ${warnings.length}\\n\\n`;
        
        if (errors.length > 0) {
          summary += 'ERRORS:\\n';
          errors.forEach((error, i) => {
            summary += `${i + 1}. Line ${error.line}: ${error.message}\\n`;
          });
          summary += '\\n';
        }
        
        if (warnings.length > 0) {
          summary += 'WARNINGS:\\n';
          warnings.forEach((warning, i) => {
            summary += `${i + 1}. Line ${warning.line}: ${warning.message}\\n`;
          });
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: summary || 'Validation completed successfully',
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `CSS Validation Error: ${error.message}`,
          },
        ],
      };
    }
  }

  async lintCSS(args) {
    try {
      const { css, file_path, config } = args;
      let cssContent;

      if (file_path) {
        cssContent = await readFile(file_path, 'utf-8');
      } else if (css) {
        cssContent = css;
      } else {
        throw new Error('Either css or file_path must be provided');
      }

      // Configuration stylelint par défaut
      const defaultConfig = {
        rules: {
          'color-no-invalid-hex': true,
          'declaration-colon-space-after': 'always',
          'declaration-colon-space-before': 'never',
          'indentation': 2,
          'max-empty-lines': 1,
          'rule-empty-line-before': ['always', { except: ['first-nested'] }],
        },
      };

      const stylelintConfig = config || defaultConfig;

      // Créer un fichier temporaire pour stylelint
      const tempFile = join(process.cwd(), '.temp-css-lint.css');
      await writeFile(tempFile, cssContent);

      try {
        // Installer stylelint si nécessaire et exécuter
        await execAsync('npm list stylelint --depth=0 2>/dev/null || npm install stylelint --no-save');
        
        const configFile = join(process.cwd(), '.stylelintrc-temp.json');
        await writeFile(configFile, JSON.stringify(stylelintConfig, null, 2));

        const { stdout, stderr } = await execAsync(
          `npx stylelint "${tempFile}" --config "${configFile}" --formatter json`
        );

        // Nettoyer les fichiers temporaires
        await execAsync(`rm -f "${tempFile}" "${configFile}"`);

        const results = JSON.parse(stdout);
        let summary = 'CSS Lint Results:\\n';
        
        if (results.length > 0 && results[0].warnings) {
          const warnings = results[0].warnings;
          summary += `⚠️ Issues found: ${warnings.length}\\n\\n`;
          
          warnings.forEach((warning, i) => {
            summary += `${i + 1}. Line ${warning.line}, Col ${warning.column}: ${warning.text}\\n`;
            summary += `   Rule: ${warning.rule}\\n`;
            summary += `   Severity: ${warning.severity}\\n\\n`;
          });
        } else {
          summary += '✅ No issues found!';
        }

        return {
          content: [
            {
              type: 'text',
              text: summary,
            },
          ],
        };
      } catch (lintError) {
        // Nettoyer en cas d'erreur
        await execAsync(`rm -f "${tempFile}" "${configFile}"`).catch(() => {});
        throw lintError;
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `CSS Lint Error: ${error.message}`,
          },
        ],
      };
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('CSS Validator MCP server running on stdio');
  }
}

const server = new CSSValidatorServer();
server.run().catch(console.error);